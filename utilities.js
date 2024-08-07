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

    createChatMessage = async (broadcaster_id, sender_id, message) => {
        let payload = {
            broadcaster_id,
            sender_id,
            message,
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

    createAnnouncement = async (broadcaster_id, moderator_id, message) => {
        let payload = {
            broadcaster_id,
            moderator_id,
            message,
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
