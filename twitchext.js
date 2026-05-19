import jsonwebtoken from "jsonwebtoken";

// @todo RETRY on the fetch requests
// @todo ignoreExpiration be a config var

// middle ware
async function tokenVerify(req, res, next) {
    //console.log("processing middleware");
    // jwt middle ware
    if (!req.headers.hasOwnProperty("authorization")) {
        res.status(403).json({
            error: false,
            message: "No Authorization Token",
        });
        return;
    }

    let jwt_token = req.headers.authorization.split(" ");
    if (jwt_token.length != 2 || jwt_token[0] != "Bearer") {
        res.status(403).json({
            error: false,
            message: "Invalid Authorization Token",
        });
        return;
    }

    try {
        //console.log('go to parse');
        req.twitch = {};
        req.twitch.extension = jsonwebtoken.verify(
            jwt_token[1],
            Buffer.from(process.env.TWITCH_EXTENSION_SECRET, "base64"),
            {
                ignoreExpiration: false,
            },
        );

        next();
        return;
    } catch (e) {
        //console.log(e);
        res.status(403).json({
            error: true,
            message: "Invalid Token",
        });
    }
}

// JWT generator function
async function tokenGenerate(channel_id, pubsub_perm = false) {
    let ptokenData = {
        exp: Math.floor(new Date().getTime() / 1000) + 10,
        user_id: process.env.TWITCH_OWNER_ID,
        role: "external",
        channel_id: channel_id ? channel_id : "all",
    };
    if (pubsub_perm) {
        //ptokenData.channel_id = channel_id ? channel_id : "all";
        ptokenData.pubsub_perms = {
            send: [pubsub_perm],
        };
    }

    //console.log(ptokenData, "w/", process.env.TWITCH_EXTENSION_SECRET);
    return jsonwebtoken.sign(
        ptokenData,
        Buffer.from(process.env.TWITCH_EXTENSION_SECRET, "base64"),
    );
}

// util function to write the config
async function configWrite(segment, broadcaster_id, content) {
    let tkn = await tokenGenerate(broadcaster_id);

    let pl = JSON.stringify({
        extension_id: process.env.TWITCH_CLIENT_ID,
        segment,
        broadcaster_id,
        content,
    });

    try {
        let r = await fetch("https://api.twitch.tv/helix/extensions/configurations", {
            method: "PUT",
            headers: {
                "Client-ID": process.env.TWITCH_CLIENT_ID,
                "Authorization": `Bearer ${tkn}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: pl,
        });
        if (r.status == 204) {
            console.log(
                "Send to Config OK",
                `${r.headers.get("ratelimit-remaining")}/${r.headers.get("ratelimit-limit")}`,
            );
            return;
        }
        console.log(
            "Config Set Failed Result",
            r.status,
            `${r.headers.get("ratelimit-remaining")}/${r.headers.get("ratelimit-limit")}`,
            await r.text(),
        );
    } catch (e) {
        console.error(e);

        setTimeout(() => {
            configWrite(segment, broadcaster_id, content);
        }, 1000);
    }
}

// util function to punt to pubsub
// target: broadcast / global / whisper-TARGETOPAQUEID
async function pubsubIt(target, broadcaster_id, message) {
    // @todo logic to test passed is valid...
    // granted this function is generally for target broadcast
    let tkn = await tokenGenerate(broadcaster_id, target);
    //console.log("tkn", tkn);
    let pl = JSON.stringify({
        target: [target],
        is_global_broadcast: target == "global",
        broadcaster_id,
        message,
    });
    //console.log("pl", pl);
    try {
        let r = await fetch("https://api.twitch.tv/helix/extensions/pubsub", {
            method: "POST",
            headers: {
                "Client-ID": process.env.TWITCH_CLIENT_ID,
                "Authorization": `Bearer ${tkn}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: pl,
        });
        if (r.status == 204) {
            console.log(
                "Send to Target OK",
                `${r.headers.get("ratelimit-remaining")}/${r.headers.get("ratelimit-limit")}`,
            );
            return;
        }
        console.log(
            "PubSub Send Result",
            r.status,
            `${r.headers.get("ratelimit-remaining")}/${r.headers.get("ratelimit-limit")}`,
            await r.text(),
        );
    } catch (e) {
        console.error(e);
        // retry

        setTimeout(() => {
            pubsubIt(target, broadcaster_id, message);
        }, 1000);
    }
}

export { tokenVerify, tokenGenerate, configWrite, pubsubIt };
