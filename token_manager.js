import { EventEmitter } from "events";

class tokenManager extends EventEmitter {
    twitch_client_id = "";
    twitch_client_secret = "";

    twitch_token = "";
    twitch_refresh = "";

    /*
    one of
    user_token
    client_credentials
    */
    token_type = "";
    auto_maintain = false;

    constructor({
        client_id,
        client_secret,

        token,
        refresh,

        token_type,
        auto_maintain = true,
    }) {
        super();

        const allow_types = ["user_token", "client_credentials"];
        if (!allow_types.includes(token_type)) {
            throw new Error("Invalid Token Type");
        }
        this.token_type = token_type;
        this.auto_maintain = auto_maintain;

        if (client_id && client_secret) {
            // self managing token
            this.twitch_client_id = client_id;
            this.twitch_client_secret = client_secret;
        } else {
            throw new Error("Client ID and Client Secret is required");
        }

        if (refresh) {
            if (!client_secret) {
                throw new Error("A refresh token was provided but without a secret");
            }
            this.twitch_refresh = refresh;
        }

        if (token) {
            // run with token
            this.twitch_token = token;
            // validate it
            this.validateToken();
            return;
        }
    }

    infinityCheck = false;
    validateToken = async () => {
        console.log(new Date(), "doing validation");
        if (this.twitch_token == "") {
            console.debug("No Token will generate");
            // can generate?
            this.refreshToken();
            return;
        }

        let validateReq = await fetch("https://id.twitch.tv/oauth2/validate", {
            method: "GET",
            headers: {
                Authorization: `OAuth ${this.twitch_token}`,
            },
        });
        if (validateReq.status != 200) {
            console.debug("Token failed", validateReq.status);
            // the token is invalid
            // try to generate
            this.refreshToken();
            return;
        }

        let validateRes = await validateReq.json();

        /*
        if (validateRes.hasOwnProperty('user_id')) {
            throw new Error('Token is NOT app access/client credentials');
        }
        */
        let new_token_type = "";
        if (validateRes.hasOwnProperty("user_id")) {
            new_token_type = "user_token";
            this.token_user_id = validateRes.user_id;
            // enforce no drop
            this.allow_client_creds = false;
        } else {
            new_token_type = "client_credentials";
        }

        if (this.twitch_client_id != validateRes.client_id) {
            // compare failed
            throw new Error("Token ClientID does not match specified client ID");
        }
        if (new_token_type != this.token_type) {
            throw new Error(
                `Mismatched token type detected: was ${this.token_type} now: ${new_token_type}`,
            );
        }

        // check the duration left on the token
        // account for legacy inifinity tokens
        console.debug(`The ${this.token_type} Token has ${validateRes.expires_in}`);
        if (!this.infinityCheck) {
            if (validateRes.expires_in < 30 * 60) {
                // need refresh
                if (!this.infinityCheck && validateRes.expires_in == 0) {
                    this.infinityCheck = true;
                    this.validateToken();
                    return;
                }
                this.infinityCheck = false;

                this.refreshToken();
                return;
            }
        }

        // token passed validation check
        this.generateHeaders();
        // we'll emit
        // as the program can force a generate if it wants
        // ie: close to expire lets go early
        this.emit("validated", validateRes);

        // initiate maintaince timer
        // @todo tweak the rules
        //if (this.twitch_refresh != "" || this.twitch_client_secret != "") {
        if (this.auto_maintain) {
            let stutter = Math.round(15 * 60 * (Math.random() + 1));
            // we got here as a client secret exists as well
            // otherwise we threw earlier
            clearTimeout(this._maintainceTimer);
            // 15 miniutes
            this._maintainceTimer = setTimeout(this.validateToken, stutter * 1000);
        }
    };
    _maintainceTimer = false;

    generateHeaders = () => {
        this.headers = {
            "Client-ID": this.twitch_client_id,
            "Authorization": `Bearer ${this.twitch_token}`,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        };
        //console.debug("headers", this.headers);
    };

    refreshToken = async () => {
        let url = new URL("https://id.twitch.tv/oauth2/token");
        let params = [
            ["client_id", this.twitch_client_id],
            ["client_secret", this.twitch_client_secret],
        ];

        // stop do a type check
        if (this.token_type == "client_credentials") {
            // just get a new token
            params.push(["grant_type", "client_credentials"]);
        } else {
            // refresh the old token
            params.push(["grant_type", "refresh_token"]);
            params.push(["refresh_token", this.twitch_refresh]);
        }

        url.search = new URLSearchParams(params).toString();

        // go refresh
        let tokenReq = await fetch(url, {
            method: "POST",
            body: new URLSearchParams(params).toString(),
        });
        if (tokenReq.status != 200) {
            throw new Error(
                `Failed to get refresh token: ${tokenReq.status}//${await tokenReq.text()}`,
            );
        }
        let { access_token, refresh_token } = await tokenReq.json();
        this.twitch_token = access_token;
        if (refresh_token) {
            this.twitch_refresh = refresh_token;
        }
        // emit token as we don't handle storage the program does
        // the program might also need the token itself for whatever reason
        this.emit("access_tokens", {
            access_token,
            refresh_token,
        });
        // final check
        this.validateToken();
    };
}

export { tokenManager };
