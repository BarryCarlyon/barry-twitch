# Conduit

An interface to manage a conduit that is expected to talk to websocket based shards.

It can be attached to a given shard `id` of a conduit, or left high level. So attach a conduit and make subscriptions.

An object is to be passed to the class to instantiate.

| Item         | Req | Description                                                                        |
| ------------ | --- | ---------------------------------------------------------------------------------- |
| `client_id`  | Y   | A Twitch Client ID                                                                 |
| `token`      | N   | Provide a Twitch API Token to use to start with                                    |
| `conduit_id` | N   | If not using auto make/auto find, what conduit ID to operate on                    |
| `shard_id`   | N   | If going to do operations on a singular shard, the Shard ID. Defaults to Shard "0" |

After constucting call `start()` to run the start up. See events!

## Selective start up

With respect to authentication requirements

> [!WARNING]
> If the token validate response indicates the token is of type User it will error out.

### A Token and ClientID

```js
let myConduit = new Conduit({
    token: "tokenhere",
    client_id: "aclient_id",
});
```

As a token is provided it will be validated, it will validate the `client_id` returned matches what was provided. And error out if not matching.

### Everything

Most of the time this will be the instantiation

```js
let myConduit = new Conduit({
    client_id: "aclient_id",

    token: "aPreviousToken",

    conduit_id: "aConduitId",
});

async function conduitReady() {
    let conduitExists = await conduit.findConduit();
    if (!conduitExists) {
        throw new Error("The condiut was not found");
    }
    // the conduit is ready do wahtever you need
}

myConduit.on("validated", conduitReady);

myConduit.start();
```

So this will

- validate the token
- if valid check the clientID of the token matches
- set the `conduit_id` to the class to reduce some throwing around when calling functions

## Events

| EventName         | Params                                                                                                 | Description                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `validated`       | [ValidateResponse](https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token) | The token was successully validated, either from pass in or generation                  |
| `conduitFound`    | [A Conduit](https://dev.twitch.tv/docs/api/reference/#get-conduits)                                    | On `findConduit` was the conduit found                                                  |
| `conduitNotFound` |                                                                                                        | On `findConduit` The Set Conduit ID wasn't found (either wrong clientID/Token or dead?) |
| `shardUpdate      | [updateShardResponse](https://dev.twitch.tv/docs/api/reference/#update-conduit-shards)                 | Attempt to update the shard, and return the new shard configuration and any soft errors |

## Functions

Things tagged internal are usually called internally

| Function                | Internal | Var                 | Notes                                                                                                                            |
| ----------------------- | -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| constructor             | N        | See Above           | Obvious                                                                                                                          |
| validateToken           | Y        |                     | The function to validate a token if one is held in the class                                                                     |
| generateHeaders         | Y        |                     | We generate the headers for calls to use into `headers` so `myConduit.header` is accessable                                      |
| setToken                | N        | A Token             | Set a token whenever you want it calls `validateToken`                                                                           |
| generateToken           | Y        |                     | Generate a token, this calls `validateToken`                                                                                     |
| setConduitID            | N        | Conduit ID          | Set the Conduit ID                                                                                                               |
| setShardID              | N        | Shard ID            | Set the Shard ID                                                                                                                 |
| setSessionID            | N        | Session ID          | For working with EventSub Websockets, set the session ID for shard assigning                                                     |
| createConduit           | N        | shardCount          | Pass in a optional shard count (defualts to 1) and [Create a Conduit](https://dev.twitch.tv/docs/api/reference/#create-conduits) |
| updateConduitShardCount | N        | shardCount          | For the controlling conduit [update the shard count](https://dev.twitch.tv/docs/api/reference/#update-conduits), returns         |
| deleteConduit           | N        |                     | [Delete the controlling conduit](https://dev.twitch.tv/docs/api/reference/#delete-conduit)                                       |
| findConduit             | N        |                     | Find the `setConduitID` conduit actually exists. Emits Events                                                                    |
| getShards               | N        |                     | Not Finished                                                                                                                     |
| updateShard             | N        |                     | For the set `setConduitID`, `setShardID`, update the shard to the `setSessionID` (this only works with WebSockets)               |
| createSubscription      | N        | subscriptionDetails | For the set `setConduitID` create a Subscription with the given Type/Conditions                                                  |
| logHelixResponse        | Y        |                     | Internal/dev debug function type thing                                                                                           |
