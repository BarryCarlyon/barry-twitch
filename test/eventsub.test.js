import { Conduit, eventsubSocket } from "../eventsub.js";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

import nock from "nock";
import chaiNock from "chai-nock";
chai.use(chaiNock);

import eventemitter2 from "chai-eventemitter2";
chai.use(eventemitter2());

const expect = chai.expect;
const assert = chai.assert;

let VALID_CLIENT_ID = "hozgh446gdilj5knsrsxxz8tahr3koz";
let INVALID_TOKEN = "invalidtoken";
let VALID_TOKEN = "validtoken";

let EXPECTED_CONDUIT_ID = "26b1c993-bfcf-44d9-b876-379dacafe75a";
let SESSION_ID = "AgoQ6s-acYzgS4WtIhp7Twy2ARIGY2VsbC1h";

//https://github.com/chaijs/chai-as-promised/blob/master/lib/chai-as-promised.js#L186

/*
PREPARE
*/

it("throws cannot destructure", () => {
    expect(() => {
        new Conduit();
    }).to.throw(
        TypeError,
        `Cannot destructure property 'client_id' of 'undefined' as it is undefined.`,
    );
});

it("throws missing client ID", () => {
    expect(() => {
        new Conduit({});
    }).to.throw(Error, `Missing ClientID`);
});

it("inits with clientID", () => {
    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
    });

    expect(cond.twitch_client_id).to.equal(VALID_CLIENT_ID);
    expect(cond.twitch_token).to.equal("");
    assert.deepEqual(cond.headers, {});
    expect(cond.conduit_id).to.equal("");
    expect(cond.shard_id).to.equal("0");
});

it("inits with all the things", () => {
    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    expect(cond.twitch_client_id).to.equal(VALID_CLIENT_ID);
    expect(cond.twitch_token).to.equal(VALID_TOKEN);
    assert.deepEqual(cond.headers, {});
    expect(cond.conduit_id).to.equal("somecond");
    expect(cond.shard_id).to.equal("1");
});

/*
VALIDATION ALL
*/

it("inits with all the things and errors - token failed validation", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(401, {
        status: 401,
        message: "invalid access token",
    });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: INVALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.rejectedWith(
        new RegExp("^Conduit Cannot - Token Failed Validation$"),
    );
    expect(validateNock).to.have.been.requested;
});

it("inits with all the things and errors - token is not client creds", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        login: "barrycariyon",
        scopes: null,
        user_id: "794780266",
        expires_in: 5075147,
    });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.rejectedWith(/^Token is NOT app access\/client credentials$/);
    expect(validateNock).to.have.been.requested;
});

it("inits with all the things and errors - client ID mismatch", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });

    let cond = new Conduit({
        client_id: "aDifferentClientID",
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.rejectedWith(
        /^Token ClientID does not match specified client ID$/,
    );
    expect(cond.twitch_client_id).to.equal("aDifferentClientID");
    expect(validateNock).to.have.been.requested;
});

it("inits with all the things and passes - passed ok", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.fulfilled;
    expect(validateNock).to.have.been.requested;

    expect(cond.twitch_client_id).to.equal(VALID_CLIENT_ID);
    expect(cond.twitch_token).to.equal(VALID_TOKEN);
    assert.deepEqual(cond.headers, {
        "Client-ID": VALID_CLIENT_ID,
        "Authorization": `Bearer ${VALID_TOKEN}`,
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
    });
    expect(cond.conduit_id).to.equal("somecond");
    expect(cond.shard_id).to.equal("1");
});

it("inits with all the things and errors - id.twitch.tv not there", async () => {
    const validateNock = nock("https://id.twitch.tv")
        .get("/oauth2/validate")
        .replyWithError(Object.assign(new Error("Connection refused"), { code: "ECONNREFUSED" }));

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.rejectedWith(/^Conduit - Validate Request Failed$/);
    expect(validateNock).to.have.been.requested;
});

/*
this doesn't do what I thought it do
it("inits with all the things and passes - validated called", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    //cond.once("validated", TESTPASSED);
    cond.on("validated", (l) => {
        console.log("l", l);
    });

    expect(cond).to.be.an.eventEmitter;
    expect(validateNock).to.have.been.requested;

    expect(cond)
        .to.emit("validated")
        .on(() => {
            cond.emit("validated");
        });
    await expect(cond.start()).to.be.fulfilled;
});
*/

/*
GET CONDUIT
*/

it("inits with all the things and errors - failed get conduits", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(401, { error: "Unauthorized", status: 401, message: "OAuth token is missing" });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.fulfilled;
    expect(getConduits).to.have.been.requested;
    await expect(cond.findConduit()).to.be.rejectedWith(/^Failed to Get Conduits$/);
});

it("inits with all the things and errors - conduit not found", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(200, {
            data: [
                {
                    id: EXPECTED_CONDUIT_ID,
                    shard_count: 1,
                },
            ],
        });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: "somecond",
        shard_id: "1",
    });

    //cond.on("conduitNotFound", () => {
    //    console.log("Conduit not found");
    //});

    await expect(cond.start()).to.be.fulfilled;
    expect(validateNock).to.have.been.requested;
    expect(getConduits).to.have.been.requested;
    let foundConduit = await cond.findConduit();
    await expect(foundConduit).to.be.null;
    //await expect(cond.findConduit()).to.be.deepEqual({});

    // this test doesn't work
    /*
    expect(cond).to.be.an.eventEmitter;
    expect(cond).to.emit("conduitNotFound", {
        count: 1,
    });
    */
});

it("inits with all the things and passes - conduit found", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(200, {
            data: [
                {
                    id: EXPECTED_CONDUIT_ID,
                    shard_count: 1,
                },
            ],
        });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: EXPECTED_CONDUIT_ID,
        shard_id: "1",
    });

    await expect(cond.start()).to.be.fulfilled;
    expect(validateNock).to.have.been.requested;
    expect(getConduits).to.have.been.requested;

    let foundConduit = await cond.findConduit();
    assert.deepEqual(foundConduit, {
        id: EXPECTED_CONDUIT_ID,
        shard_count: 1,
    });
});

/*
SHARD
*/
it("update shard and fails as invalid setup", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(200, {
            data: [
                {
                    id: EXPECTED_CONDUIT_ID,
                    shard_count: 1,
                },
            ],
        });
    const updateShard = nock("https://api.twitch.tv")
        .patch("/helix/eventsub/conduits/shards")
        .reply(400, {
            message: "Invalid Shard",
        });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: EXPECTED_CONDUIT_ID,
        shard_id: "1",
    });

    await cond.start();

    expect(validateNock).to.have.been.requested;
    expect(getConduits).to.have.been.requested;
    expect(updateShard).to.have.been.requested;
    await expect(cond.updateShard()).to.be.rejectedWith(/^Missing Shard ID or Session ID$/);
});

it("sessionID was set", () => {
    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: EXPECTED_CONDUIT_ID,
        shard_id: "1",
    });

    cond.setSessionID(SESSION_ID);

    expect(cond.shard_id).to.equal("1");
    expect(cond.session_id).to.equal(SESSION_ID);
});

it("update shard and fails as HTTP", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(200, {
            data: [
                {
                    id: EXPECTED_CONDUIT_ID,
                    shard_count: 1,
                },
            ],
        });
    const updateShard = nock("https://api.twitch.tv")
        .patch("/helix/eventsub/conduits/shards")
        .reply(400, {
            message: "Invalid Shard",
        });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: EXPECTED_CONDUIT_ID,
        shard_id: "1",
    });

    await cond.start();

    cond.setSessionID(SESSION_ID);

    expect(validateNock).to.have.been.requested;
    expect(getConduits).to.have.been.requested;
    expect(updateShard).to.have.been.requested;
    await expect(cond.updateShard()).to.be.rejectedWith(/^Failed to shardUpdate$/);
});

it("update shard and error response", async () => {
    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(200, {
            data: [
                {
                    id: EXPECTED_CONDUIT_ID,
                    shard_count: 1,
                },
            ],
        });
    const updateShardError = nock("https://api.twitch.tv")
        .patch("/helix/eventsub/conduits/shards")
        .reply(202, {
            errors: [
                {
                    id: "2",
                    message: "some message",
                    code: "1",
                },
            ],
        });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: EXPECTED_CONDUIT_ID,
        shard_id: "1",
    });

    await cond.start();

    cond.setSessionID(SESSION_ID);

    expect(validateNock).to.have.been.requested;
    expect(getConduits).to.have.been.requested;
    expect(updateShardError).to.have.been.requested;
    await expect(cond.updateShard()).to.be.rejectedWith(/^Failed to shardUpdate$/);
});

it("update shard and good", async () => {
    // err lol
    nock.cleanAll();
    // err lol

    const validateNock = nock("https://id.twitch.tv").get("/oauth2/validate").reply(200, {
        client_id: VALID_CLIENT_ID,
        scopes: null,
        expires_in: 5075147,
    });
    const getConduits = nock("https://api.twitch.tv")
        .get("/helix/eventsub/conduits")
        .reply(200, {
            data: [
                {
                    id: EXPECTED_CONDUIT_ID,
                    shard_count: 1,
                },
            ],
        });
    const updateShardGood = nock("https://api.twitch.tv")
        .patch("/helix/eventsub/conduits/shards")
        .reply(202, {
            data: [
                {
                    id: "0",
                    status: "enabled",
                    transport: {
                        method: "websocket",
                        session_id: SESSION_ID,
                    },
                },
            ],
        });

    let cond = new Conduit({
        client_id: VALID_CLIENT_ID,
        token: VALID_TOKEN,
        conduit_id: EXPECTED_CONDUIT_ID,
        shard_id: "0",
    });

    await cond.start();

    cond.setSessionID(SESSION_ID);

    expect(validateNock).to.have.been.requested;
    expect(getConduits).to.have.been.requested;
    expect(updateShardGood).to.have.been.requested;

    const shardUpdateResponse = await cond.updateShard();
    //console.log("good response", shardUpdateResponse);
    assert.deepEqual(shardUpdateResponse, [
        {
            id: "0",
            status: "enabled",
            transport: {
                method: "websocket",
                session_id: SESSION_ID,
            },
        },
    ]);
});

/*
Subscription create
*/
