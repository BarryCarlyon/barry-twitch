[![Node.js CI](https://github.com/BarryCarlyon/barry-twitch/actions/workflows/node.js.yml/badge.svg)](https://github.com/BarryCarlyon/barry-twitch/actions/workflows/node.js.yml)

# Barry-Twitch

Reusable things throwing in github for easier use in things

> [!CAUTION]
> Very much in progress faffery use at own risk

# Token Manager

Pass in an object with these keys to instantiate

| Param           | Type   | Default | Required | Notes                                                      |
| --------------- | ------ | ------- | -------- | ---------------------------------------------------------- |
| `client_id`     | String | ''      | Yes      |                                                            |
| `client_secret` | String | ''      | Yes      |                                                            |
| `token`         | String | ''      | No       |                                                            |
| `refresh`       | String | ''      | No       | If doing a user access token the refresh token to run with |
| `token_type`    | String | ''      | Yes      | it's `user_token` or `client_credentials`                  |
| `auto_maintain` | Bool   | true    | Yes      | auto validate and refresh/regenerated on a 15 minute timer |

Token Validation checks are every 15 minutes, if `auto_maintain` is enabled.

SURE conceptually you could boot this up with JUST a user token and go, but thats kinda odd in general. As with an implict auth operation this lib is just overkill imo.

## Functions

| Function          | params | notes                                           |
| ----------------- | ------ | ----------------------------------------------- |
| `validateToken`   | none   | validate the token and auto refresh is relevant |
| `refreshToken`    | none   | refresh the toke generating a new one           |
| `generateHeaders` | none   | generate the `headers` class value              |

## Class values

| value     | notes                                          |
| --------- | ---------------------------------------------- |
| `headers` | Headers for a Twitch API call (client-id/auth) |

## Events

| event           | params                          | notes                                                                                                                                |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `validated`     | validate                        | the token was validated and is valid, returns a [validate response JSON](https://dev.twitch.tv/docs/authentication/validate-tokens/) |
| `access_tokens` | `{access_token, refresh_token}` | new tokens were generated `refresh_token` present if one exists                                                                      |

Normally you would `.once` a `validated` for the first time to know that the token is ready to go then do stuff

Normally you would `.on` a `access_tokens` to store a new token(s) when generated as the class won't thats on you.

Normally you would just use `twitch.headers` when you need to make calls as it's updated.

```js
fetch("", {
    method: "get",
    headers: {
        ...twitch.headers,
    },
});
```

## Initiate Blind App Access Token

Initiate a token manager for App Access Token/client credentials

Need to tell the tokenManger to start managing the token

```js
import { tokenManager } from "barry-twitch/token_manager.js";

let twitch = new tokenManager({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token_type: "client_credentials",
});

twitch.once("validated", () => {
    // a token was generated and we can go

    fetch("", {
        method: "get",
        headers: {
            ...twitch.headers,
        },
    });
});

twitch.refreshToken();
```

## Initiate From Existing App Access Token

Initiate a token manager for client credentials with existing token

Passing a token in implies validate

```js
import { tokenManager } from "barry-twitch/token_manager.js";

let appAccess = "tokenFromStorage";

let twitch = new tokenManager({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token: appAccess,
    token_type: "client_credentials",
});

twitch.on("access_token", async (access_token) => {
    // we got a new token
    storeNewToken(access_token);
});

twitch.once("validated", () => {
    // the existing token is good (or a new one made) and we can go

    fetch("", {
        method: "GET",
        headers: {
            ...twitch.headers,
        },
    });
});
```

## Usually User Tokeage with Redis

```js
import "dotenv/config";

import { tokenManager } from "barry-twitch/token_manager.js";

process.env.redisStorageKey = "somerediskey";

// Redis Connect
import { createClient } from "redis";
const redisClient = createClient({
    url: process.env.REDIS,
});
redisClient.on("error", (err) => console.log("Redis Client Error", err));
await redisClient.connect();

let [access_token, refresh_token] = await redisClient.HMGET(process.env.redisStorageKey, [
    "access_token",
    "refresh_token",
]);

let twitchToken = new tokenManager({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    token: access_token,
    refresh: refresh_token,
    token_type: "user_token",
});

twitchToken.on("access_tokens", async ({ access_token, refresh_token }) => {
    console.log("Got new tokens so storing them", access_token);

    // got new key sets lets store them
    await redisClient.HSET(process.env.redisStorageKey, "access_token", access_token);
    await redisClient.HSET(process.env.redisStorageKey, "refresh_token", refresh_token);
});

function spawnBot() {
    // do bot stuff
    // or whatever
}

twitchToken.once("validated", spawnBot);
```

# Chat Bot Badge edition

## Conduit ID

The conduit needs to exist and is stored recalled from redis.

In this example a redis hash is used under `conduit_manager`

| hash key | thought                                                                 |
| -------- | ----------------------------------------------------------------------- |
| chatbot  | for chat bot operations, so just chat topics                            |
| overlay  | for overlay operations, channel.chat.notification, and bits.use perhaps |

In a lot of cases you'll probably have a similar distribution of types (topics) between the conduits, but without an internal "shard recieve and relay" you'll probably split your services to multiple conduits, as this also helps control the signal to noise ratio.

## For tokens:

Here we store/recall the generated app access token in a hash key instead.

You might do something like

Hash: twitch_tokens

| key          | notes                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| app_access   | An app access token, save for other processes to use/persist between restarts |
| bot_access   | The bots user access token, for announcements or moderation actions           |
| bot_refresh  | The bots user refresh token                                                   |
| user_access  | The channels user access token, for subscriptions and the like                |
| user_refresh | Nuf said                                                                      |

> [!NOTE]
> Redis is _generally_ considered "temporary", I tend to store my more persistent keys in MySQL as apposed to redis, but the App Access token isn't worth keeping. I only store it in redis, so that any other thing I have needing the token can use the same token and prevent running into the 50 rule.

```js
import "dotenv/config";

// redis
import { createClient } from "redis";
const redisClient = createClient();
await redisClient.connect();

import { Conduit, eventsubSocket } from "barry-twitch/eventsub.js";
import { tokenManager } from "barry-twitch/token_manager.js";

let appAccessToken = await redisClient.HGET(
    "twitch_tokens",
    `app_access_${process.env.TWITCH_CLIENT_ID}`,
);

// create a token manager for the app access token
let twitchToken = new tokenManager({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token: appAccessToken ?? "invalid",
    token_type: "client_credentials",
});
// Setup a conduit control
let conduit = new Conduit({
    client_id: process.env.TWITCH_CLIENT_ID,

    shard_id: "0",
});
// setup this shard
let myShard = new eventsubSocket({
    connect: false,
});

twitchToken.on("access_token", async (token_set) => {
    let { access_token } = token_set;
    console.log("Generated access token");
    await redisClient.HSET(
        "twitch_tokens",
        `app_access_${process.env.TWITCH_CLIENT_ID}`,
        access_token,
    );
});

twitchToken.once("validated", firstTokenReady);

async function firstTokenReady() {
    console.log("Validated access token - doing first start");

    // load conduit id
    let conduit_id = await redisClient.HGET("conduit_manager", process.env.CONDUIT_NAME);
    if (!conduit_id || conduit_id == "") {
        // we need to generate a conduit
        console.error("No defined conduitID");
        process.exit();
    }
    console.log("Selecting", conduit_id);
    conduit.setConduitID(conduit_id);

    // spawn connection
    conduit.on("validated", conduitReady);
    conduit.setToken(twitchToken.twitch_token);
}
async function conduitReady() {
    let conduitExists = await conduit.findConduit();
    if (!conduitExists) {
        // the conduit doesn't exist
        console.error("Conduit does not exist and we will not self create");
        process.exit();
    }

    // shard count maybe? but problem for later due to size
    console.log("The conduit was found yay");

    // we can make a socket baby
    myShard.connect();
}

myShard.on("connected", (session_id) => {
    conduit.setSessionID(session_id);
    // and then connect
    conduit.updateShard();
    // sanity check subscriptions?
    sanityCheckSubscriptions();
});

myShard
    .on("session_keepalive", () => {
        console.log("boop");
    })
    .on("session_reconnect", (url) => {
        console.log("Doing a reconnect", url);
    });

myShard.on("notification", doSomethingWithMessage);
```

notably the library emits each type on a seperate feed so

```js
myShard.on("channel.chat.message", handleChatMessage);
myShard.on("channel.chat.notification", handleChatNotification);

async function handleChatMessage({ metadata, payload }) {
    const { event, subscription } = payload;
    const { broadcaster_user_id, chatter_user_id } = event;
    if (chatter_user_id == subscription.condition.user_id) {
        // ignore myself
        return;
    }

    let chatter = {
        id: event.chatter_user_id,
        login: event.chatter_user_login,
        name: event.chatter_user_name,
        color: event.color,
    };
    let broadcaster = {
        id: event.broadcaster_user_id,
        login: event.broadcaster_user_login,
        name: event.broadcaster_user_name,
    };
    let { message } = event;

    console.log(`On ${broadcaster.login} From ${chatter.login} - ${message}`);
});
```

# Utilties

`utilities.js` provides some helper functions for chat bots to send messaging.

Now that Announcments supports App Access Tokens, either kind of token works.

You provde it a client ID and a token but it will not maintain the token for you.

You can provide either a User or an App Access Token, when using an App Access Token you have access to use the `for_source_only` parameter on API calls.

## Functions

### constuctor

Requires a `string` which is a `Twitch Client ID`

### generateHeaders

Internal use, generates the common headers for use in the stack

### setToken

Requires a `string` which is a `Twitch Access Token` of any type

It will validate said token and infer it's type

Additionally checks the returned ClientID checks what the class was constructed with

### createChatMessage(broadcaster_id,sender_id,message,options)

| field          | type        | description                            |
| -------------- | ----------- | -------------------------------------- |
| broadcaster_id | string      | the channel ID to send to              |
| sender_id      | string      | the user ID to send as                 |
| message        | string      | the Message to send max 500 characters |
| options        | object/null | options                                |

#### Options

| option                  | type      | description                                                           |
| ----------------------- | --------- | --------------------------------------------------------------------- |
| reply_parent_message_id | UUID/null | to replay to anher message                                            |
| for_source_only         | boolean   | defaults `true` controls where a message goes during shared chat mode |

### createAnnouncement(broadcaster_id,moderator_id,message,options)

| field          | type        | description                                                |
| -------------- | ----------- | ---------------------------------------------------------- |
| broadcaster_id | string      | the channel ID to send to                                  |
| moderator_id   | string      | the user ID of the moderator of the broadcaster to send as |
| message        | string      | the Message to send max 500 characters                     |
| options        | object/null | options                                                    |

#### Options

| option          | type    | description                                                                                           |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| color           | string  | what color to decorate the announcement as, one of `["blue", "green", "orange", "purple", "primary"]` |
| for_source_only | boolean | defaults `true` controls where a message goes during shared chat mode                                 |

## Usage Examples

```js
import "dotenv/config";

import { Twitch } from "barry-twitch/utilities.js";

let appAccess = "tokenFromStorage";

let helper = new Twitch(process.env.TWITCH_CLIENT_ID);
try {
    helper.setToken(appAccess);
} catch (e) {
    console.error("Token is dead");
}

// send a chat message
let chatResponse = await helper.createChatMessage("123123", "321321", "Some Message");
// send a chat message that only goes to the home channel when shared chat is enabled
let chatResponse = await helper.createChatMessage("123123", "321321", "Some Message", {
    for_source_only: true,
});
// reply a chat message
let chatReplyResponse = await helper.createChatMessage("123123", "321321", "Some Message", {
    reply_parent_message_id: "SomeUUID",
});
// send a Channel Accent announcment
let createAnnouncement = await helper.createChatMessage("123123", "321321", "Some Message");
// send a Green announcment
let createAnnouncement = await helper.createChatMessage("123123", "321321", "Some Message", {
    color: "green",
});
```
