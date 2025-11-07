import { Conduit, eventsubSocket } from "../eventsub.js";

//import { assert } from "node:assert";
//import assert from "assert";
//import { assert, expect } from "chai";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

const expect = chai.expect;
const assert = chai.assert;

it("throws cannot destructure", () => {
    //expect(sum(1, 2)).toBe(3);
    //assert.equal(new Conduit(), Error);
    //assert.type(new Conduit());

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
        client_id: "foobarbaz",
    });

    expect(cond.twitch_client_id).to.equal("foobarbaz");
    expect(cond.twitch_token).to.equal("");
    assert.deepEqual(cond.headers, {});
    expect(cond.conduit_id).to.equal("");
    expect(cond.shard_id).to.equal("0");
});

it("inits with all the things", () => {
    let cond = new Conduit({
        client_id: "foobarbaz",
        token: "mytoken",
        conduit_id: "somecond",
        shard_id: "1",
    });

    expect(cond.twitch_client_id).to.equal("foobarbaz");
    expect(cond.twitch_token).to.equal("mytoken");
    assert.deepEqual(cond.headers, {});
    expect(cond.conduit_id).to.equal("somecond");
    expect(cond.shard_id).to.equal("1");
});

it("inits with all the things and errors - invalid token", async () => {
    /*
    let cond = new Conduit({
        client_id: "foobarbaz",
        token: "anInvalidToken",
        conduit_id: "somecond",
        shard_id: "1",
    });
*/
    /*
return new Promise(function (resolve) {
    assert.ok(true);
    resolve();
  }).then(done);
    */
    /*
    try {
        await cond.start();
    } catch (e) {
        console.log("test", e);
    }
*/
    //expect(cond.start()).to.be.rejectedWith(Error, `Conduit - Validate Request Failed`);
    //expect(await cond.start()).to.throw(Error, `Conduit Cannot - Token Failed Validation`);
    //expect(await cond.start()).to.throw(Error, `Conduit Cannot - Validate Request Failed`);
    //expect(await cond.start()).to.throw(Error, `Conduit Cannot - Token Failed Validation`);
    //expect(async () => {
    let cond = new Conduit({
        client_id: "foobarbaz",
        token: "anInvalidToken",
        conduit_id: "somecond",
        shard_id: "1",
    });

    await expect(cond.start()).to.be.rejectedWith(`Conduit Cannot - Token Failed Validation`);

    ///    }).to.throw(Error, `Conduit Cannot - Token Failed Validation`);

    //let p = await cond.start();

    //p.should.be.rejectedWith(Error, `Conduit - Validate Request Failed`).should.notify(done);

    //promise.should.be.rejectedWith(Error);

    //it("should be rejected", function (done) {
    //otherPromise.should.be.rejected.and.notify(done);
    //});

    /*
    await assert.rejects(async () => {
        await cond.start();
    }, Error);
    */

    /*
    expect(cond.twitch_client_id).to.equal("foobarbaz");
    expect(cond.twitch_token).to.equal("mytoken");
    assert.deepEqual(cond.headers, {
        "Client-ID": "foobarbaz",
        "Authorization": "Bearer mytoken",
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
    });
    expect(cond.conduit_id).to.equal("somecond");
    expect(cond.shard_id).to.equal("1");
*/
});
