# Barry-Twitch

Reusable things throwing in github for easier use in things

# Token Manager

Pass in an object with these keys to instantiate

| Param           | Type   | Default | Required | Notes                                                      |
| --------------- | ------ | ------- | -------- | ---------------------------------------------------------- |
| `client_id`     | String | ``      | Yes      |                                                            |
| `client_secret` | String | ``      | No       | Required in a `refresh` is supplied                        |
| `token`         | String | ``      | No       |                                                            |
| `refresh`       | String | ``      | No       | If doing a user access token the refresh token to run with |
| `token_type`    | String | ``      | Yes      | it's `user_token` or `client_credentials`                  |
| `auto_maintain` | Bool   | true    | Yes      | auto validate and refresh/regenerated on a 15 mintue timer |

Token Validation checks are every 15 minutes, if `auto_maintain` is enabled.

## functions

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

Normally you would `.once` a `validated` for the first time

## Initate Blind App Access Token

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

## Initate From Existing App Access Token

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
    storeNewToken;
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
