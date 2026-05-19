class Twitch {
    client_id = "";
    access_token = "";

    constructor({ client_id, access_token }) {
        if (!client_id || !access_token) {
            throw new Error("Client ID and Token are required");
        }

        this.client_id = client_id;
        this.access_token = access_token;

        this.generateHeaders();
    }

    generateHeaders = () => {
        this.headers = {
            "Client-ID": this.client_id,
            "Authorization": `Bearer ${this.access_token}`,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        };
    };

    setToken = (access_token) => {
        if (!access_token) {
            throw new Error("A Token is required");
        }
        this.access_token = access_token;

        this.generateHeaders();
    };

    createChatMessage = async (
        broadcaster_id,
        sender_id,
        message,
        reply_parent_message_id = null,
        pin = null,
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

        let payload = {
            broadcaster_id,
            sender_id,
            message,
            reply_parent_message_id,
            pin,
        };

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

        let createdMessage = await this.createChatMessage(
            broadcaster_id,
            sender_id,
            message,
            null,
            true,
        );
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
    createAnnouncement = async (broadcaster_id, moderator_id, message, color = "primary") => {
        if (!broadcaster_id || broadcaster_id == "") {
            throw new Error("No Broadcaster ID");
        }
        if (!moderator_id || moderator_id == "") {
            throw new Error("No Moderator ID");
        }
        if (!message || message == "") {
            throw new Error("No Message");
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
