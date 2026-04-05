import { Twitch } from "../utilities.js";

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
let INVALID_TOKEN = "invalidtoken";
let VALID_TOKEN = "validtoken";

chai.config.includeStack = true;
chai.config.showDiff = true;

describe("Twitch Utilities", () => {
    it("throws no client ID", () => {
        expect(() => {
            new Twitch();
        }).to.throw(Error, /^Client ID is required$/);
    });

    it("throws a token is required", async () => {
        let tw = new Twitch(VALID_CLIENT_ID);
        await expect(tw.setToken()).to.be.rejectedWith(Error, /A Token is required/i);
    });

    it("throws invalid token", async () => {
        nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .matchHeader("accept", "application/json")
            .matchHeader("authorization", `Bearer ${INVALID_TOKEN}`)
            .reply(401, { status: 401, message: "invalid access token" });

        let tw = new Twitch(VALID_CLIENT_ID);
        await expect(tw.setToken(INVALID_TOKEN)).to.be.rejectedWith(
            Error,
            /Invalid token, or has expired/i,
        );
    });

    it("setToken passes and is user access", async () => {
        nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .matchHeader("accept", "application/json")
            .matchHeader("authorization", `Bearer ${VALID_TOKEN}`)
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                user_id: "141981764",
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        expect(tw.client_id).to.equal(VALID_CLIENT_ID);
        expect(tw.app_access).to.equal(false);
        expect(tw.headers).to.deep.equal({
            "Client-ID": VALID_CLIENT_ID,
            "Authorization": `Bearer ${VALID_TOKEN}`,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        });
    });

    it("setToken passes and is app access", async () => {
        nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .matchHeader("accept", "application/json")
            .matchHeader("authorization", `Bearer ${VALID_TOKEN}`)
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        expect(tw.client_id).to.equal(VALID_CLIENT_ID);
        expect(tw.app_access).to.equal(true);
        expect(tw.headers).to.deep.equal({
            "Client-ID": VALID_CLIENT_ID,
            "Authorization": `Bearer ${VALID_TOKEN}`,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        });
    });
});
