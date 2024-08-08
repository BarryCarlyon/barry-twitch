# EventSub Library

Notes:

At the moment everything in this file is token agnostic on the type EXCEPT `sendAnnouncement`

So conceputally needs a dual token setup.
We also need automated token refresh to be added for user tokens.

A given bot might juggle two tokens, or three if it's reading/writing broadcaster data...

## Dependancies

-   `EventEmitter` from `events`
-   `WebSocket` from `ws`

## Class and functions

-   `eventsubSocket` which extends `EventEmitter`
-   `Conduit` which extends `EventEmitter`
-   `ESWebSocket` which extends `EventEmitter`

A created `eventsubSocket` can be attached to the functions of a `Conduit` and a shard of that conduit
A created `eventsubSocket` can be attached to the functions of a `ESWebSocket`

## Authentication

A `Conduit` needs an App Access/Client Credentials Token

A `ESWebSocket` needs a User Access Token

`eventsubSocket` dones need a token

### Functions - `eventsubSocket`

| name    | args                        | notes                            |
| ------- | --------------------------- | -------------------------------- |
| connect | see below                   |                                  |
| close   | ()                          | manual close connection function |
| silence | (keepalive_timeout_seconds) | internal                         |

#### `eventsubSocket` init

| field                | type    | default                           | notes                                                                                                              |
| -------------------- | ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| url                  | string  | `wss://eventsub.wss.twitch.tv/ws` | can override to connect to the CLI/mock server or a `session_reconnect` was issued and this is the new destination |
| connect              | boolean | false                             | auto connect on class instantiate                                                                                  |
| silecenReconnect     | boolean | true                              | if silence was detected auto reconnect                                                                             |
| disableAutoReconnect | boolean | false                             | on an abnormal disconnect (say 1006) try to reconnect if false                                                     |

#### Events

| event             | args                  | notes                                                         |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| close             | close event           | the connection was closed                                     |
| connected         | id                    | connected to the eventsub websocket with session ID           |
| reconnected       | id                    | reconnected to the eventsub websocket with session ID         |
| session_keepalive |                       | recieved a keep alive                                         |
| notification      | { metadata, payload}  | recieved a payload                                            |
| `${type}`         | { metadata, payload } | received a `payload.subscription.type`                        |
| session_reconnect | reconnect_url         | Twitch asked us to reconnect on a new URL, class auto does so |
| revocation        | { metdata, payload }  | lost access to `payload.subscription.type`                    |
| session_silenced  |                       | the session died from silence, attmepting self reconnect      |

### Functions - `Conduit`

#### Constuctor

| name                | default | description                                                            |
| ------------------- | ------- | ---------------------------------------------------------------------- |
| client_id           |         | can be inferred from the token, if provide is matched/verified         |
| client_secret       |         | not required unless token missing and going for client creds           |
| token               |         | seed with a token _usually_ a user token                               |
| refresh             |         | the refresh token if any, if provided with out client secret it errors |
| conduit_id          |         | initialise library with a conduit ID                                   |
| shard_id            |         | initialise library with a shard Index aka ID                           |
| allow_client_creds  | true    | is auto determined if a token is provided and it's a user token        |
| allow_auto_maintain | true    | allow the library to attempt to auto maintain the token                |

#### Functions

| name                    | args                   | ret             | notes                                                                                    |
| ----------------------- | ---------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| validateToken           | ()                     |                 | after validate it calls generateHeaders and sets up maintaince                           |
| generateHeaders         | ()                     |                 |                                                                                          |
| setToken                | (token)                |                 | if you are doing token maintain externally you can update the token, it'll call validate |
| generateToken           | ()                     |                 |                                                                                          |
| refreshToken            | ()                     |                 |                                                                                          |
| setConduitID            | (conduit_id)           |                 | setter                                                                                   |
| setShardID              | (shard_id)             |                 | setter                                                                                   |
| setSessionID            | (session_id)           |                 | setter                                                                                   |
| setUserId               | (user_id)              |                 | override the auto/token determinet user ID handy if using cc's                           |
| createConduit           | (shard_count)          | a conduit       |                                                                                          |
| updateConduitShardCount | (shard_count)          |                 | using the prior set `conduit_id`                                                         |
| deleteConduit           | ()                     |                 |                                                                                          |
| findConduit             | ()                     | a conduit/false | finds the prior set `conduit_id`                                                         |
| getShards               | ()                     |                 | incomplete/noop                                                                          |
| updateShard             | ()                     | the updates     | update the set `shard_id` to the set `session_id`                                        |
| createSubscription      | (subscription, method) | status/json     | for the prior set `conduit_id`                                                           |
| logHelixResponse        | (resp)                 |                 | process a helix API response for a easy log                                              |

#### Events

| event           | args                            | notes                                                                                                                               |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| validated       | validatedRes                    | the provided or generated token was validated, usually gonna .once this as ready to go, or every time so you can maintain the token |
| access_token    | access_token                    | a client credentials token was generated                                                                                            |
| access_tokens   | { access_token, refresh_token } | a new user token was generated                                                                                                      |
| conduitFound    | theConduit                      | the conduit of prior set `conduit_id` was found                                                                                     |
| conduitNotFound |                                 | it wasn't                                                                                                                           |
| shardUpdate     | { data, errors }                | the shard of prior set `shard_id` was updated, but might have errored (needs improve)                                               |

## Invoke Combinations

shard ID is ingnored if no conduit ID is set

theres a bunch of ways that this can init....

### Operate as a user

This is all wrong/outta data as fluid dev

```js
let twitch = new Twitch({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token: access_token,
    refresh: refresh_token,
    allow_client_creds: false,
});
```

Run with a token library will obtain the ClientID

```js
let twitch = new Twitch({
    token: access_token,
    allow_client_creds: false,
});
```

### Operate with a Token

```js
let twitch = new Twitch({
    token: access_token,
});
```

### Operate Client Credentials

Generate own token

```js
let twitch = new Twitch({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
});
```

Start with a token

```js
let twitch = new Twitch({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    token: access_token,
});
```

### Operate conduits

Init with Conduit validate after, you should do a findConduit to verify it exists on validate probably

```js
let twitch = new Twitch({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token: appaccess_token,
    allow_client_creds: true,

    conduit_id: "conduit-id-here",
    shard_id: 0,
});
```

Validate the token then set the Conduit After

```js
let twitch = new Twitch({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token: appaccess_token,
    allow_client_creds: true,

    shard_id: 0,
});

twitch.once("validated", async (dat) => {
    console.log("Once Token Validated", dat);

    let conduit_id = FROMDATABASE;
    twitch.setConduitID(conduit_id);
});
```

Define Twitch with Client Creds, create a socket and shard this socket to the conduit in shard 0

```js
let twitch = new Twitch({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,

    token: appaccess_token,
    allow_client_creds: true,

    conduit_id: "conduit-id-here",
    shard_id: 0,
});

twitch.once("validated", async (dat) => {
    let mySocket = new eventsubSocket(true);
    mySocket.on("connected", async (session_id) => {
        console.log(`Socket has conneted ${session_id}`);
        twitch.setSessionID(session_id);
        // shard id
        twitch.updateShard();
    });
});
```
