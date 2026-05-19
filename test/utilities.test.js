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

    it("id.twitch.tv not there", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .replyWithError(
                Object.assign(new Error("getaddrinfo ENOTFOUND id.twitch.tv"), {
                    code: "ENOTFOUND",
                }),
            );

        let tw = new Twitch(VALID_CLIENT_ID);

        await expect(tw.setToken(VALID_TOKEN)).to.be.rejectedWith();
        expect(validateNock).to.have.been.requested;
    });

    it("api.twitch.tv not there", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        const apiNock = nock("https://api.twitch.tv")
            .post("/helix/chat/messages")
            .replyWithError(
                Object.assign(new Error("getaddrinfo ENOTFOUND api.twitch.tv"), {
                    code: "ENOTFOUND",
                }),
            );

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createChatMessage("123123", "321321", "foobar")).to.be.rejectedWith();
        expect(validateNock).to.have.been.requested;
        expect(apiNock).to.have.been.requested;
    });

    it("Send Chat Message Missing Broadcaster ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createChatMessage()).to.be.rejectedWith(Error, /^No Broadcaster ID$/);
        expect(validateNock).to.have.been.requested;
    });
    it("Send Chat Message Missing Moderator ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createChatMessage("123123", "", "")).to.be.rejectedWith(
            Error,
            /^No Sender ID$/,
        );
        expect(validateNock).to.have.been.requested;
    });
    it("Send Chat Message Missing Message", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createChatMessage("123123", "321312", "")).to.be.rejectedWith(
            Error,
            /^No Message$/,
        );
        expect(validateNock).to.have.been.requested;
    });
    it("Send Chat MessageMessage Too Long", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(
            tw.createChatMessage(
                "123123",
                "321312",
                "012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567891",
            ),
        ).to.be.rejectedWith(Error, /^Message longer than 500 characters$/);
        expect(validateNock).to.have.been.requested;
    });

    it("Sends chat message", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        const apiNock = nock("https://api.twitch.tv").post("/helix/chat/messages").reply(200);

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);
        let chatResponse = await tw.createChatMessage("123123", "321321", "foobar");

        expect(chatResponse.status).to.be.equal(200);
        expect(validateNock).to.have.been.requested;
        expect(apiNock).to.have.been.requested;
    });

    /*
    it("Announcment uses default color", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        //const apiNock = nock("https://api.twitch.tv").post("/helix/chat/announcements").reply(200);

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);
        //let announcementResponse = await tw.createAnnouncement("123123", "321321", "foobar");

        await expect(tw.createAnnouncement("123123", "321321", "foobar")).to.throw(
            Error,
            /^Invalid color$/,
        );
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
    });
    */

    it("Announcment Missing Broadcaster ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createAnnouncement()).to.be.rejectedWith(Error, /^No Broadcaster ID$/);
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Announcment Missing Moderator ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createAnnouncement("123123", "", "")).to.be.rejectedWith(
            Error,
            /^No Moderator ID$/,
        );
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Announcment Missing Message", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createAnnouncement("123123", "321312", "")).to.be.rejectedWith(
            Error,
            /^No Message$/,
        );
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Announcment Message Too Long", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(
            tw.createAnnouncement(
                "123123",
                "321312",
                "012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567891",
            ),
        ).to.be.rejectedWith(Error, /^Message longer than 500 characters$/);
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });

    it("Announcment invalid color", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        //const apiNock = nock("https://api.twitch.tv").post("/helix/chat/announcements").reply(200);

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);
        //let announcementResponse = await tw.createAnnouncement("123123", "321321", "foobar");

        await expect(
            tw.createAnnouncement("123123", "321321", "foobar", { color: "melon" }),
        ).to.be.rejectedWith(Error, /^Invalid color/);
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Announcement is sent", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        const apiNock = nock("https://api.twitch.tv").post("/helix/chat/announcements").reply(200);

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);
        let annResponse = await tw.createAnnouncement("123123", "321321", "foobar");

        expect(annResponse.status).to.be.equal(200);
        expect(validateNock).to.have.been.requested;
        expect(apiNock).to.have.been.requested;
    });

    it("Create Pin Missing Broadcaster ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createPinnedChatMessage()).to.be.rejectedWith(Error, /^No Broadcaster ID$/);
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Create Pin Missing Moderator ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createPinnedChatMessage("123123", "", "")).to.be.rejectedWith(
            Error,
            /^No Moderator ID$/,
        );
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Create Pin Missing Message ID", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(tw.createPinnedChatMessage("123123", "321321", "")).to.be.rejectedWith(
            Error,
            /^No Message ID$/,
        );
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Create Pin Duration Too Short", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(
            tw.createPinnedChatMessage("123123", "321321", "abc-abc-abc", 5),
        ).to.be.rejectedWith(Error, /^Duration Seconds is too short, less than 30$/);
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });
    it("Create Pin Duration Too Long", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);

        await expect(
            tw.createPinnedChatMessage("123123", "321321", "abc-abc-abc", 1805),
        ).to.be.rejectedWith(Error, /^Duration Seconds is too long, greater than 1800$/);
        //expect(chatResponse.status).to.be.equal(200);
        //expect(apiNock).to.have.been.requested;
        expect(validateNock).to.have.been.requested;
    });

    it("Create Pin Without Duration", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        const apiNock = nock("https://api.twitch.tv").put("/helix/chat/pins").reply(204);

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);
        let chatResponse = await tw.createPinnedChatMessage("123123", "321321", "abc-abc-abc");

        expect(chatResponse.status).to.be.equal(204);
        expect(validateNock).to.have.been.requested;
        expect(apiNock).to.have.been.requested;
    });
    it("Create Pin With Duration", async () => {
        const validateNock = nock("https://id.twitch.tv")
            .get("/oauth2/validate")
            .reply(200, {
                client_id: VALID_CLIENT_ID,
                login: "twitchdev",
                scopes: ["channel:read:subscriptions"],
                expires_in: 5520838,
            });
        const apiNock = nock("https://api.twitch.tv").put("/helix/chat/pins").reply(204);

        let tw = new Twitch(VALID_CLIENT_ID);
        await tw.setToken(VALID_TOKEN);
        let chatResponse = await tw.createPinnedChatMessage(
            "123123",
            "321321",
            "abc-abc-abc",
            1000,
        );

        expect(chatResponse.status).to.be.equal(204);
        expect(validateNock).to.have.been.requested;
        expect(apiNock).to.have.been.requested;
    });
});
