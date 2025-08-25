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
