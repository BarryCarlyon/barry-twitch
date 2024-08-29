# Barry-Twitch

Reusable things throwing in github for easier use in things

> [!CAUTION]
> Very much in progress faffery use at own risk

# Token Manager

Pass in an object with these keys to instantiate

| Param           | Type   | Default | Required | Notes                                                      |
| --------------- | ------ | ------- | -------- | ---------------------------------------------------------- |
| `client_id`     | String | ''      | Yes      |                                                            |
| `client_secret` | String | ''      | Yes      | Required in a `refresh` is supplied                        |
| `token`         | String | ''      | No       |                                                            |
| `refresh`       | String | ''      | No       | If doing a user access token the refresh token to run with |
| `token_type`    | String | ''      | Yes      | it's `user_token` or `client_credentials`                  |
| `auto_maintain` | Bool   | true    | Yes      | auto validate and refresh/regenerated on a 15 mintue timer |

Token Validation checks are every 15 minutes, if `auto_maintain` is enabled.

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
        method: "get",
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
process.env.ACCESS_TOKEN = access_token;
process.env.REFRESH_TOKEN = refresh_token;

let twitchToken = new tokenManager({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    token: process.env.ACCESS_TOKEN,
    refresh: process.env.REFRESH_TOKEN,
    token_type: "user_token",
});

twitchToken.on("access_tokens", async ({ access_token, refresh_token }) => {
    console.log("Got new tokens so storing them", access_token);
    process.env.ACCESS_TOKEN = access_token;
    process.env.REFRESH_TOKEN = refresh_token;

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
