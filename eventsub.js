import { EventEmitter } from "events";
import WebSocket from "ws";

class eventsubSocket extends EventEmitter {
    counter = 0;
    closeCodes = {
        4000: "Internal Server Error",
        4001: "Client sent inbound traffic",
        4002: "Client failed ping-pong",
        4003: "Connection unused",
        4004: "Reconnect grace time expired",
        4005: "Network Timeout",
        4006: "Network error",
        4007: "Invalid Reconnect",
    };

    constructor({
        url = "wss://eventsub.wss.twitch.tv/ws",
        connect = false,
        silenceReconnect = true,
        disableAutoReconnect = false,
    }) {
        super();

        this.silenceReconnect = silenceReconnect;
        this.disableAutoReconnect = disableAutoReconnect;
        this.mainUrl = url;

        if (connect) {
            this.connect();
        }
    }

    mainUrl = "wss://eventsub.wss.twitch.tv/ws";
    backoff = 0;
    backoffStack = 100;

    connect(url, is_reconnect) {
        this.eventsub = {};
        this.counter++;

        url = url ? url : this.mainUrl;
        is_reconnect = is_reconnect ? is_reconnect : false;

        console.debug(`Connecting to ${url}`);
        // this overrites and kills the old reference
        this.eventsub = new WebSocket(url);
        this.eventsub.counter = this.counter;

        this.eventsub.addEventListener("open", () => {
            this.backoff = 0;
            console.debug(`Opened Connection to Twitch`);
        });

        // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event
        // https://github.com/Luka967/websocket-close-codes
        this.eventsub.addEventListener("close", (close) => {
            // forward the close event
            this.emit("close", close);

            console.debug(
                `${this.eventsub.twitch_websocket_id}/${this.eventsub.counter} Connection Closed: ${close.code} Reason - ${this.closeCodes[close.code]}`,
            );

            // 4000 well damn
            // 4001 we should never get...
            // 4002 make a new socket
            if (close.code == 4003) {
                console.debug(
                    "Did not subscribe to anything, the client should decide to reconnect (when it is ready)",
                );
                return;
            }
            if (close.code == 4004) {
                // this is the old connection dying
                // we should of made a new connection to the new socket
                console.debug("Old Connection is 4004-ing");
                return;
            }
            // 4005 make a new socket
            // 4006 make a new socket
            // 4007 make a new socket as we screwed up the reconnect?

            // anything else we should auto reconnect
            // but only if the user wants
            if (this.disableAutoReconnect) {
                return;
            }

            //console.debug(`for ${this.eventsub.counter} making new`);
            this.backoff++;
            console.debug("retry in", this.backoff * this.backoffStack);
            setTimeout(() => {
                this.connect();
            }, this.backoff * this.backoffStack);
        });
        // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event
        this.eventsub.addEventListener("error", (err) => {
            //console.debug(err);
            console.debug(
                `${this.eventsub.twitch_websocket_id}/${this.eventsub.counter} Connection Error`,
            );
        });
        // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event
        this.eventsub.addEventListener("message", (message) => {
            //console.debug('Message');
            //console.debug(this.eventsub.counter, message);
            let { data } = message;
            data = JSON.parse(data);

            let { metadata, payload } = data;
            let { message_id, message_type, message_timestamp } = metadata;
            //console.debug(`Recv ${message_id} - ${message_type}`);

            // reset silence
            if (message_type != "session_welcome") {
                this.silence();
            }

            switch (message_type) {
                case "session_welcome":
                    let { session } = payload;
                    let { id, keepalive_timeout_seconds } = session;

                    console.debug(`${this.eventsub.counter} This is Socket ID ${id}`);
                    this.eventsub.twitch_websocket_id = id;

                    console.debug(
                        `${this.eventsub.counter} This socket declared silence as ${keepalive_timeout_seconds} seconds`,
                    );

                    // is this a reconnect?
                    if (is_reconnect) {
                        // we carried subscriptions over
                        this.emit("reconnected", id);
                    } else {
                        // now you would spawn your topics
                        this.emit("connected", id);
                    }

                    this.silence(keepalive_timeout_seconds);

                    break;
                case "session_keepalive":
                    //console.debug(`Recv KeepAlive - ${message_type}`);
                    this.emit("session_keepalive");
                    break;

                case "notification":
                    //console.debug('notification', metadata, payload);
                    let { subscription } = payload;
                    let { type } = subscription;

                    // chat.message is NOISY
                    if (type != "channel.chat.message") {
                        console.debug(
                            `${this.eventsub.twitch_websocket_id}/${this.eventsub.counter} Recv notification ${type}`,
                        );
                    }

                    this.emit("notification", { metadata, payload });
                    this.emit(type, { metadata, payload });

                    break;

                case "session_reconnect":
                    this.eventsub.is_reconnecting = true;

                    let { reconnect_url } = payload.session;

                    console.debug(
                        `${this.eventsub.twitch_websocket_id}/${this.eventsub.counter} Reconnect request ${reconnect_url}`,
                    );

                    this.emit("session_reconnect", reconnect_url);
                    // stash old socket?
                    //this.eventsub_dying = this.eventsub;
                    //this.eventsub_dying.dying = true;
                    // make new socket
                    this.connect(reconnect_url, true);

                    break;

                case "revocation":
                    console.debug(`${this.eventsub.counter} Recv Topic Revocation`);
                    console.debug("revocation", payload);
                    this.emit("revocation", { metadata, payload });
                    break;

                default:
                    console.debug(`${this.eventsub.counter} unexpected`, metadata, payload);
                    break;
            }
        });
    }

    close() {
        this.eventsub.close();
    }

    silenceHandler = false;
    silenceTime = 10; // default per docs is 10 so set that as a good default
    silence(keepalive_timeout_seconds) {
        if (keepalive_timeout_seconds) {
            this.silenceTime = keepalive_timeout_seconds;
            this.silenceTime++; // add a little window as it's too anal
        }
        clearTimeout(this.silenceHandler);
        this.silenceHandler = setTimeout(() => {
            this.emit("session_silenced"); // -> self reconnecting
            if (this.silenceReconnect) {
                this.close(); // close it and let it self loop
            }
        }, this.silenceTime * 1000);
    }
}

class Conduit extends EventEmitter {
    twitch_client_id = "";

    twitch_token = "";

    headers = {};

    constructor({
        client_id,

        token,

        conduit_id,
        shard_id = "0",
    }) {
        super();

        if (conduit_id) {
            this.conduit_id = conduit_id;
        }
        // it can be 0 but it's a string
        if (undefined !== shard_id) {
            this.shard_id = shard_id;
        }

        if (!client_id) {
            throw new Error("Missing ClientID");
        }

        // specified a clientID to compare the token to
        // without doing "infer" CID from token
        this.twitch_client_id = client_id;

        if (token) {
            // run with token
            this.twitch_token = token;
            // validate it
            //this.validateToken();
            return;
        }
    }

    validateToken = async () => {
        if (!this.twitch_token || this.twitch_token == "") {
            throw new Error("Conduit Cannot - No token");
        }

        let validateReq = null;

        try {
            validateReq = await fetch("https://id.twitch.tv/oauth2/validate", {
                method: "GET",
                headers: {
                    Authorization: `OAuth ${this.twitch_token}`,
                },
            });
        } catch (e) {
            //console.log(e);
            throw new Error("Conduit - Validate Request Failed");
        }

        if (validateReq.status != 200) {
            console.debug("Token failed", validateReq.status);
            // the token is invalid
            // try to generate
            throw new Error("Conduit Cannot - Token Failed Validation");
        }

        let validateRes = await validateReq.json();

        if (validateRes.hasOwnProperty("user_id")) {
            throw new Error("Token is NOT app access/client credentials");
        }

        /*
        if (this.twitch_client_id == "") {
            // infer
            console.debug("Inferring CID");
            this.twitch_client_id = validateRes.client_id;
        } else
        */
        if (this.twitch_client_id != validateRes.client_id) {
            // compare
            throw new Error("Token ClientID does not match specified client ID");
        }

        // check the duration left on the token
        // account for legacy inifinity tokens
        console.debug(`The Token has ${validateRes.expires_in}`);

        // token passed validation check
        this.generateHeaders();
        // we'll emit
        // as the program can force a generate if it wants
        // ie: close to expire lets go early
        this.emit("validated", validateRes);

        return;
    };
    start = this.validateToken;

    generateHeaders = () => {
        this.headers = {
            "Client-ID": this.twitch_client_id,
            "Authorization": `Bearer ${this.twitch_token}`,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        };
    };

    setToken = (token) => {
        this.twitch_token = token;
    };

    conduit_id = "";
    shard_id = "";
    setConduitID = (conduit_id) => {
        this.conduit_id = conduit_id;
    };
    setShardID = (shard_id) => {
        if (this.conduit_id == "") {
            throw new Error("Tried to shard without a conduit ID");
        }
        this.shard_id = shard_id;
    };
    session_id = "";
    setSessionID = (session_id) => {
        this.session_id = session_id;
    };

    createConduit = async (shard_count) => {
        if (!shard_count) {
            shard_count = 1;
        }

        let createReq = await fetch("https://api.twitch.tv/helix/eventsub/conduits", {
            method: "POST",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ shard_count }),
        });
        if (createReq.status != 200) {
            throw new Error(
                `Failed to create Conduit ${createReq.status}//${await createReq.text()}`,
            );
        }

        let { data } = await createReq.json();
        this.conduit_id = data[0].id;

        // and return the new conduit
        return data[0];
    };
    updateConduitShardCount = async (shard_count) => {
        let updateReq = await fetch("https://api.twitch.tv/helix/eventsub/conduits", {
            method: "PATCH",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: this.conduit_id,
                shard_count,
            }),
        });
        if (updateReq.status != 200) {
            throw new Error(
                `Failed to update Conduit ${updateReq.status}//${await updateReq.text()}`,
            );
        }

        let { data } = await createReq.json();
        // and return the update conduit
        return data[0];
    };
    deleteConduit = async () => {
        let deleteReq = await fetch("https://api.twitch.tv/helix/eventsub/conduits", {
            method: "DELETE",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: this.conduit_id,
            }),
        });

        if (deleteReq.status != 204) {
            throw new Error(
                `Failed to delete Conduit ${deleteReq.status}//${await deleteReq.text()}`,
            );
        }

        return true;
    };

    findConduit = async () => {
        let conduitsReq = await fetch("https://api.twitch.tv/helix/eventsub/conduits", {
            method: "GET",
            headers: {
                ...this.headers,
            },
        });
        if (conduitsReq.status != 200) {
            //                 ${conduitsReq.status}//${await conduitsReq.text()}`,
            throw new Error(`Failed to Get Conduits`);
            //, { cause: "Fatal" });
        }
        let { data } = await conduitsReq.json();
        for (var x = 0; x < data.length; x++) {
            let { id } = data[x];

            if (id == this.conduit_id) {
                this.emit("conduitFound", data[x]);
                return data[x];
            }
        }

        this.emit("conduitNotFound");
        //throw new Error("Conduit Not Found", { cause: "NotFound" });
        return null;
    };

    getShards = async () => {
        // ommited for now
    };

    // you can update as many shards as you want in one request
    // that logic just doesn't makes sense in this lib
    updateShard = async () => {
        // is the shardID valid?
        if (!this.shard_id || !this.session_id) {
            throw new Error("Missing Shard ID or Session ID");
        }

        console.debug(`on ${this.conduit_id} setting ${this.shard_id} to ${this.session_id}`);

        // go for update
        let shardUpdate = await fetch("https://api.twitch.tv/helix/eventsub/conduits/shards", {
            method: "PATCH",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                conduit_id: this.conduit_id,
                shards: [
                    {
                        id: this.shard_id,
                        transport: {
                            method: "websocket",
                            session_id: this.session_id,
                        },
                    },
                ],
            }),
        });
        if (shardUpdate.status != 202) {
            // major fail
            // ${shardUpdate.status} - ${await shardUpdate.text()}`,
            throw new Error(`Failed to shardUpdate`);
        }
        let { data, errors } = await shardUpdate.json();

        if (errors && errors.length > 0) {
            //console.error(errors);
            this.emit("shardUpdate", { data, errors });
            throw new Error(`Failed to shardUpdate ${shardUpdate.status}`);
        }
        // all good shard Connected expecting data!
        this.emit("shardUpdate", { data });
        return data;
    };

    /*
    subscription = {
        type: 'foo',
        version: "1",
        condition: {
            whatever
        }
    }
    */
    createSubscription = async (subscription) => {
        let transport = {
            method: "conduit",
            conduit_id: this.conduit_id,
        };

        let subscriptionReq = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
            method: "POST",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...subscription,
                transport,
            }),
        });
        if (subscriptionReq.status == 202) {
            return {
                status: subscriptionReq.status,
                json: await subscriptionReq.json(),
            };
        }
        if (subscriptionReq.status == 409) {
            // its TECHNICALLY not an error....
            return {
                status: subscriptionReq.status,
                json: await subscriptionReq.json(),
            };
        }

        // major fail
        throw new Error(
            `Failed to create Subscription ${subscriptionReq.status} - ${await subscriptionReq.text()}`,
        );
    };

    logHelixResponse = (resp) => {
        console.debug(
            `Helix: ${resp.status} - ${resp.headers.get("ratelimit-remaining")}/${resp.headers.get("ratelimit-limit")}`,
        );
    };
}

export { Conduit, eventsubSocket };
