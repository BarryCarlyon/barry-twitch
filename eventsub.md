# EventSub Library

Exports three class functions to use

- [eventsubSocket](./eventsub_socket.md)
- [Conduit](./eventsub_conduit.md)

They all extend `EventEmitter`

# Usage

## A Start up

For an existing Conduit with one shard, and already got subscriptions

```js
let mySocket = new eventsubSocket({
    connect: false,
});
let myConduit = new Conduit({
    token: "tokenhere",

    conduit_id: "myConduitId",
    shard_id: "0",
});

myConduit.once("validated", () => {
    // the token is good
    myConduit.findConduit();
});
myConduit.once("conduitFound", () => {
    // lets make a websocket
    mySocket.connect();
});
mySocket.once("connected", (id) => {
    myConduit.setSessionID(id);
    // the conduit it good
    myConduit.updateShard();
});
myConduit.shardUpdate(() => {
    // all connected and good
    // you'd probabaly call createSubs now to check all the subs are alive
    myConduit.createSubscription({ stuff });
});
```

Delayed

```js
let mySocket = new eventsubSocket({
    connect: false,
});
let myConduit = new Conduit({
    token: "tokenhere",

    shard_id: "0",
});

// later do
conduit.setToken(token);
conduit.setConduitID(conduit_id);
// then go
```

# Utility Functions

## Find Conduit

FunctionName: `findConduit`

Twitch API calls: [Get Conduits](https://dev.twitch.tv/docs/api/reference/#get-conduits)

Arguments: None, uses instance set variables

- `conduit_id`

Check if the pre set conduit exists.

Will return `null` or the conduit and will raise match events to trigger with

### Events

| event name        | data        |
| ----------------- | ----------- |
| `conduitFound`    | the conduit |
| `conduitNotFound` | `null`      |

## Update Shard

FunctionName: `updateShard`

Twitch API calls: [Update Conduit Shards](https://dev.twitch.tv/docs/api/reference/#update-conduit-shards)

Argument: None, uses instance set variables

- `conduit_id`
- `shard_id`
- `session_id`

Using instance set variable update the shard to the given websocket ID

## Create a Subscription

This will create a Twitch Eventsub subscription to the Conduit

FunctionName: `createSubscription`

Twitch API calls [Create EventSub Subscription](https://dev.twitch.tv/docs/api/reference/#create-eventsub-subscription)

Arguments: a [subscription set](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/) that the function will add a transport to

Returns the subscription throws an error
