# Helper function

This holds useful functions to interacting with some Twitch Extension Stuff

## Depends

- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)

## Requires

ENV variable of:

- `TWITCH_CLIENT_ID`
- `TWITCH_EXTENSION_SECRET` to be defined.
- `TWITCH_OWNER_ID` the userID (not name) of the owner of the Extension.

# Functions

## Extension JWT Token Verify

Called `tokenVerify`

This is express JS middleware to veritfy token

### Requires

An `Authorization` header to be present using the Prefix of `Bearer` (prefix case sensitive)

### Example

```js
import "dotenv/config";

import express from "express";
const app = express();

import { Server } from "http";

const http = Server(app);
http.listen(process.env.SERVER_PORT, function () {
    console.log(new Date(), `booted express on ${process.env.SERVER_PORT}`);
});

import cors from "cors";

import { tokenVerify } from "./twitchext.js";

app.get("/myroute/", cors(), tokenVerify, async (req, res) => {
    let { channel_id } = req.twitch.extension;

    res.send(`Hello ${channel_id}`);
});
```

## Write to Config Service

Called `configWrite` it will self retry the send after 1 second on fail, since it assumes a rate limit issue or Twitch Schnanigan.

### Usage

Send to

```js
import "dotenv/config";

import { configWrite } from "./twitchext.js";

let config = {
    some: "a",
    config: "b",
};
let configToSave = JSON.stringify(config);

configWrite("broadcaster", "15185913", configToSave);
```

## Send Extension PubSub

Called `pubsubIt` it will self retry the send after 1 second on fail, since it assumes a rate limit issue or Twitch Schnanigan.

### Usage

Write to the `broadcast`(er) segment of `15185913`

```js
import "dotenv/config";

import { pubsubIt } from "./twitchext.js";

let message = {
    some: "a",
    config: "b",
};
let messageToSave = JSON.stringify(message);

pubsubIt("broadcast", "15185913", messageToSave);
```

## JWT Token Generation

Called `tokenGenerate`

This function is used to generate JWT Token for other API Calls that ustilise a JWT, normally for us by the ohter functions in this file/lib.

JWT's have a expiry time, this library/function will generate JWT"s with 10 second expiry.

It is capable of generation an `external` JWT that is for config/api calls _or_ PubSub calls.

### Usage

#### Config/API token

Generates a token to call API (such as [Send Extension Chat](https://dev.twitch.tv/docs/api/reference/#send-extension-chat-message)) for the broadcaster `15185913` using the defined ENV variables

```js
import "dotenv/config";

let token = await tokenGenerate("15185913");
```

### PubSub Token

Generates a token to call [Send Extension PubSub](https://dev.twitch.tv/docs/api/reference/#send-extension-pubsub-message) for the broadcaster `15185913` using the defined ENV variables

```js
import "dotenv/config";

let token = await tokenGenerate("15185913", "broadcast");
```
