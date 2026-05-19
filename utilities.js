class Twitch {
    client_id = "";
    access_token = "";
    app_access = false;

    constructor(client_id) {
        if (!client_id) {
            throw new Error("Client ID is required");
        }

        this.client_id = client_id;
    }

    generateHeaders = () => {
        // set headers
        this.headers = {
            "Client-ID": this.client_id,
            "Authorization": `Bearer ${this.access_token}`,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        };
    };

    setToken = async (access_token) => {
        if (!access_token) {
            throw new Error("A Token is required");
        }
        this.access_token = access_token;
        // infer type
        // validate and infer type
        let validate = await fetch("https://id.twitch.tv/oauth2/validate", {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${this.access_token}`,
            },
        });
        if (validate.status != 200) {
            throw new Error("Invalid token, or has expired");
        }
        // we could infer clientID
        let { user_id, client_id } = await validate.json();
        if (client_id != this.client_id) {
            throw new Error("The Token comes from a different Client ID");
        }
        if (user_id) {
            this.app_access = false;
        } else {
            this.app_access = true;
        }

        this.generateHeaders();
    };

    createChatMessage = async (broadcaster_id, sender_id, message, options) => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!sender_id || sender_id == "") {
            throw new Error("No Sender ID");
        }
        if (!message || message == "") {
            throw new Error("No Message");
        }
        if (message.length > 500) {
            throw new Error("Message longer than 500 characters");
        }

        let { reply_parent_message_id, for_source_only, pin } = options ? options : {};

        let payload = {
            broadcaster_id,
            sender_id,
            message,
            reply_parent_message_id,
            pin,
        };
        // we check as it 400's if app access token
        // and the key is present
        if (this.app_access) {
            if (undefined !== for_source_only) {
                payload.for_source_only = for_source_only;
            }
        }

        return await fetch("https://api.twitch.tv/helix/chat/messages", {
            method: "POST",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    };
    // technially send and pin
    createChatMessageAndPin = async (
        broadcaster_id,
        sender_id,
        message,
        duration_seconds = null,
    ) => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!sender_id || sender_id == "") {
            throw new Error("No Sender ID");
        }
        if (!message || message == "") {
            throw new Error("No Message");
        }
        if (message.length > 500) {
            throw new Error("Message too long");
        }

        let createdMessage = await this.createChatMessage(broadcaster_id, sender_id, message, {
            pin: true,
        });
        if (createdMessage.status != 200) {
            throw new Error("Failed to create chat message");
        }
        let createdMessageData = await createdMessage.json();
        let message_id = createdMessageData.data[0].message_id;
        // if a duration is provided, update to add the duration
        if (duration_seconds) {
            this.updatePinnedChatMessage(broadcaster_id, sender_id, message_id, duration_seconds);
        }
    };

    createPinnedChatMessage = async (
        broadcaster_id,
        moderator_id,
        message_id,
        duration_seconds = null,
    ) => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!moderator_id || moderator_id == "") {
            throw new Error("No Moderator ID");
        }
        if (!message_id || message_id == "") {
            throw new Error("No Message ID");
        }
        if (duration_seconds) {
            if (duration_seconds < 30) {
                throw new Error("Duration Seconds is too short, less than 30");
            }
            if (duration_seconds > 1800) {
                throw new Error("Duration Seconds is too long, greater than 1800");
            }
        }

        let payload = {
            broadcaster_id,
            moderator_id,
            message_id,
            duration_seconds,
        };

        return await fetch("https://api.twitch.tv/helix/chat/pins", {
            method: "PUT",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    };
    updatePinnedChatMessage = async (
        broadcaster_id,
        moderator_id,
        message_id,
        duration_seconds = null,
    ) => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!moderator_id || moderator_id == "") {
            throw new Error("No Moderator ID");
        }
        if (!message_id || message_id == "") {
            throw new Error("No Message ID");
        }
        if (duration_seconds) {
            if (duration_seconds < 30) {
                throw new Error("Duration Seconds is too short, less than 30");
            }
            if (duration_seconds > 1800) {
                throw new Error("Duration Seconds is too long, greater than 1800");
            }
        }

        let payload = {
            broadcaster_id,
            moderator_id,
            message_id,
            duration_seconds,
        };

        return await fetch("https://api.twitch.tv/helix/chat/pins", {
            method: "PATCH",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    };
    unpinPinnedChatMessage = async (broadcaster_id, moderator_id, message_id = null) => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!moderator_id || moderator_id == "") {
            throw new Error("No Moderator ID");
        }
        if (!message_id || message_id == "") {
            //throw new Error("No Message ID");
            // get pinned message if there is one
            let existingPin = await this.getPinnedChatMessage(broadcaster_id, moderator_id);
            if (existingPin.status == 200) {
                let existingPinData = await existingPin.json();
                if (existingPin.data && existingPin.data.length == 1) {
                    message_id = existingPin.data[0].message_id;
                }
            }
            if (!message_id) {
                throw new Error("No Message ID and did not auto discover one");
            }
        }

        let payload = {
            broadcaster_id,
            moderator_id,
            message_id,
        };

        return await fetch("https://api.twitch.tv/helix/chat/pins", {
            method: "DELETE",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    };

    createAnnouncement = async (broadcaster_id, moderator_id, message, options) => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!moderator_id || moderator_id == "") {
            throw new Error("No Moderator ID");
        }
        if (!message || message == "") {
            throw new Error("No Message");
        }
        if (message.length > 500) {
            throw new Error("Message longer than 500 characters");
        }

        let { color, for_source_only } = options ? options : {};

        if (!color || undefined == color) {
            color = "primary";
        }

        let colors = ["blue", "green", "orange", "purple", "primary"];
        if (!colors.includes(color)) {
            throw new Error(
                `Invalid color: ${color} specified, one of ${colors.join(",")} required`,
            );
        }

        let payload = {
            broadcaster_id,
            moderator_id,
            message,
            color,
        };
        // we check as it 400's if app access token
        // and the key is present
        if (this.app_access) {
            if (undefined !== for_source_only) {
                payload.for_source_only = for_source_only;
            }
        }

        return await fetch("https://api.twitch.tv/helix/chat/announcements", {
            method: "POST",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    };

    logHelixResponse = (resp) => {
        console.debug(
            `Helix: ${resp.status} - ${resp.headers.get("ratelimit-remaining")}/${resp.headers.get("ratelimit-limit")}`,
        );
    };
}

export { Twitch };
