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
    ) => {
        let payload = {
            broadcaster_id,
            sender_id,
            message,
            reply_parent_message_id,
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
