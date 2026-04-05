import { tokenManager } from "../token_manager.js";

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
chai.should();

let VALID_CLIENT_ID = "hozgh446gdilj5knsrsxxz8tahr3koz";
let VALID_CLIENT_SECRET = "somesecretid";
let VALID_REFRESH_TOKEN = "dsfkljasdfkljsdaf";
//let INVALID_TOKEN = "invalidtoken";
let VALID_TOKEN = "validtoken";

chai.config.includeStack = true;
chai.config.showDiff = true;

/*
basic setup
*/

//https://stackoverflow.com/questions/45466040/verify-that-an-exception-is-thrown-using-mocha-chai-and-async-await
const expectThrowsAsync = async (method, errorMessage) => {
    let error = null;
    try {
        await method();
    } catch (err) {
        error = err;
    }
    expect(error).to.be.an("Error");
    if (errorMessage) {
        expect(error.message).to.equal(errorMessage);
    }
};

describe("Token Manager", () => {
    it("throws cannot destructure", () => {
        expect(() => {
            new tokenManager();
        }).to.throw(
            TypeError,
            /^Cannot destructure property 'client_id' of 'undefined' as it is undefined.$/,
        );
    });

    it("throws invalid token type", () => {
        expect(() => {
            new tokenManager({});
        }).to.throw(Error, /^Invalid Token Type$/);
    });

    it("throws invalid token type - type specified", () => {
        expect(() => {
            new tokenManager({
                token_type: "foo",
            });
        }).to.throw(Error, /^Invalid Token Type$/);
    });

    it("missing cid and/or secret", () => {
        expect(() => {
            new tokenManager({
                token_type: "client_credentials",
            });
        }).to.throw(Error, /^Client ID and Client Secret is required$/);
    });

    it("missing cid and/or secret", () => {
        expect(() => {
            new tokenManager({
                token_type: "client_credentials",
                client_id: VALID_CLIENT_ID,
            });
        }).to.throw(Error, /^Client ID and Client Secret is required$/);
    });

    it("has cid and secret", () => {
        let tm = new tokenManager({
            token_type: "client_credentials",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,

            auto_maintain: false,
        });

        expect(tm.twitch_client_id).to.equal(VALID_CLIENT_ID);
        expect(tm.twitch_client_secret).to.equal(VALID_CLIENT_SECRET);
        expect(tm.token_type).to.equal("client_credentials");
    });

    it("is client creds but refresh", () => {
        expect(() => {
            new tokenManager({
                token_type: "client_credentials",
                client_id: VALID_CLIENT_ID,
                client_secret: VALID_CLIENT_SECRET,
                refresh: VALID_REFRESH_TOKEN,
            });
        }).to.throw(Error, /^You passed a refresh token for Client Credentials$/);
    });

    it("has cid and secret and refresh", () => {
        let tm = new tokenManager({
            token_type: "user_token",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,
            refresh: VALID_REFRESH_TOKEN,

            auto_maintain: false,
        });

        expect(tm.twitch_client_id).to.equal(VALID_CLIENT_ID);
        expect(tm.twitch_client_secret).to.equal(VALID_CLIENT_SECRET);
        expect(tm.token_type).to.equal("user_token");
        expect(tm.twitch_refresh).to.equal(VALID_REFRESH_TOKEN);
    });

    it("has everything", () => {
        let tm = new tokenManager({
            token_type: "user_token",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,
            refresh: VALID_REFRESH_TOKEN,
            token: VALID_TOKEN,

            auto_maintain: false,
        });

        expect(tm.twitch_client_id).to.equal(VALID_CLIENT_ID);
        expect(tm.twitch_client_secret).to.equal(VALID_CLIENT_SECRET);
        expect(tm.token_type).to.equal("user_token");
        expect(tm.twitch_refresh).to.equal(VALID_REFRESH_TOKEN);
        expect(tm.twitch_token).to.equal(VALID_TOKEN);
    });

    /*
    Validate
    */

    it("id.twitch.tv not there", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .replyWithError(
                Object.assign(new Error("getaddrinfo ENOTFOUND id.twitch.tv"), {
                    code: "ENOTFOUND",
                }),
            );

        let tm = new tokenManager({
            token_type: "user_token",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,
            refresh: VALID_REFRESH_TOKEN,
            token: VALID_TOKEN,

            auto_maintain: false,
        });

        await expect(tm.start()).to.be.rejectedWith();
        expect(validateNock).to.have.been.requested;
    });

    it("generate token id.twitch.tv not there", async () => {
        const generateToken = nock("https://id.twitch.tv")
            .post(
                "/oauth2/token",
                "client_id=hozgh446gdilj5knsrsxxz8tahr3koz&client_secret=somesecretid&grant_type=client_credentials",
            )
            .replyWithError(Object.assign(new TypeError("fetch failed"), { code: "ENOTFOUND" }));

        const tm = new tokenManager({
            token_type: "client_credentials",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,
            auto_maintain: false,
        });

        // assert that the promise rejects with the exact error we stubbed
        await expect(tm.refreshToken()).to.be.rejectedWith(TypeError, /^fetch failed$/);

        // ensure the outgoing request was actually made
        expect(generateToken.isDone()).to.be.true;
    });

    /*
    it("clientcreds no initial token", async () => {
        const generateToken = nock("https://id.twitch.tv").get("/oauth2/token").reply(200, {
            access_token: "jostpf5q0uzmxmkba9iyug38kjtgh",
            expires_in: 5011271,
            token_type: "bearer",
        });

        let tm = new tokenManager({
            token_type: "client_credentials",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,
        });

        await tm.start();
    });
    */

    it("generate token id.twitch.tv not there", async () => {
        // "client_id=hozgh446gdilj5knsrsxxz8tahr3koz&client_secret=somesecretid&grant_type=client_credentials"
        const generateToken = nock("https://id.twitch.tv")
            .post(
                "/oauth2/token",
                "client_id=hozgh446gdilj5knsrsxxz8tahr3koz&client_secret=somesecretid&grant_type=client_credentials",
            )
            .replyWithError(
                Object.assign(new TypeError("fetch failed"), {
                    code: "ENOTFOUND",
                }),
            );
        /*
        const generateTokenB = nock("https://id.twitch.tv")
            .post(
                "/oauth2/token",
                "client_id=hozgh446gdilj5knsrsxxz8tahr3koz&client_secret=somesecretid&grant_type=client_credentials",
            )
            .replyWithError(
                Object.assign(new TypeError("fetch failed"), {
                    code: "ENOTFOUND",
                }),
            );
        */
        /*
            .reply(404, "");

    , {
                client_id: VALID_CLIENT_ID,
                client_secret: VALID_CLIENT_SECRET,
                grant_type: "client_credentials",
            }

            .replyWithError(
                Object.assign(new Error("getaddrinfo ENOTFOUND id.twitch.tv"), { code: "ENOTFOUND" }),
            );
            */
        let tm = new tokenManager({
            token_type: "client_credentials",
            client_id: VALID_CLIENT_ID,
            client_secret: VALID_CLIENT_SECRET,

            auto_maintain: false,
        });

        expect(await tm.refreshToken()).should.throw();
        expect(generateToken).to.have.been.requested;

        //let p = tm.refreshToken();
        //p.should.be.rejectedWith(TypeError, /^fetch failed$/);

        //expect(await tm.refreshToken()).to.be.rejectedWith(TypeError, /^fetch failed$/);

        //let ret = await tm.refreshToken();

        /*
        let ret = await tm.refreshToken();
        console.log("ret is", typeof ret, ret, ret.name);

        expect(ret).to.be.rejectedWith(TypeError, /^lemons$/);
        */
        await tm.refreshToken();
        expect(tm.twitch_token).to.eventually.be.equal("sometoken"); //With(TypeError, /^lemons$/);
        //expect(tm.twitch_token).to.equal(VALID_TOKEN);

        //await expectThrowsAsync(() => tm.refreshToken(), "fetch failed");
        expect(generateToken).to.have.been.requested;

        //assert.fail(0, 1, "Exception not thrown");

        /*
        tm.refreshToken()
            .then((r) => {
                console.log("call done");
            })
            .catch(() => {
                console.log("caught");
            })
            .finally(() => {
                console.log("finally");
                expect(r).to.be.rejectedWith(TypeError, /^fetch failed$/);
                expect(generateToken).to.have.been.requested;

                done();
            });
        */
    });
});
