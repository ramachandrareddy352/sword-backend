"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const client_1 = __importDefault(require("../database/client"));
const adminActionRoutes_1 = __importDefault(require("../routes/adminActionRoutes"));
const adminAuthRoutes_1 = __importDefault(require("../routes/adminAuthRoutes"));
const adminGetterRoutes_1 = __importDefault(require("../routes/adminGetterRoutes"));
const publicGetterRoutes_1 = __importDefault(require("../routes/publicGetterRoutes"));
const userActionRoutes_1 = __importDefault(require("../routes/userActionRoutes"));
const userAuthRoutes_1 = __importDefault(require("../routes/userAuthRoutes"));
const userGetterRoutes_1 = __importDefault(require("../routes/userGetterRoutes"));
exports.app = (0, express_1.default)();
exports.app.use(body_parser_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json());
const corsOptions = {
    origin: (_origin, callback) => {
        // Check if the origin is in the list of allowed origins
        /**
             * write all logic/conditions to allow the origins
            if (true) {
                callback(null, true);
            } else {
                console.log('Requested origin is blocked:', origin);
                callback(null, false); // Don't throw error, just don't allow
            }
             */
        callback(null, true);
    },
    //   origin: "http://localhost:3000",
    methods: "GET,PUT,POST,OPTIONS,DELETE,PATCH", // Specify allowed methods
    // credentials: true,
    allowedHeaders: "*",
};
exports.app.use((0, cors_1.default)(corsOptions));
exports.app.get("/", (req, res) => {
    res.send("Sword Backend");
});
// Public keys cache
let publicKeys = {};
let lastKeyFetch = 0;
async function fetchPublicKeys() {
    // Cache for 24 hours
    if (Date.now() - lastKeyFetch < 24 * 60 * 60 * 1000)
        return;
    try {
        const res = await axios_1.default.get("https://www.gstatic.com/admob/reward/verifier-keys.json");
        publicKeys = {};
        for (const key of res.data.keys) {
            publicKeys[key.keyId] = key.pem;
        }
        lastKeyFetch = Date.now();
    }
    catch (err) {
        console.error("Failed to fetch AdMob public keys:", err);
    }
}
// AdMob SSV Callback (public, GET)
exports.app.get("/api/admob/ssv-callback", async (req, res) => {
    try {
        if (!req.query.signature || !req.query.key_id) {
            return res.status(200).send("OK");
        }
        await fetchPublicKeys();
        const params = req.query;
        const keyId = params.key_id;
        const signature = params.signature;
        if (!publicKeys[keyId]) {
            return res.status(200).send("OK");
        }
        // 🔐 Reconstruct signed message
        const paramKeys = Object.keys(params)
            .filter((k) => k !== "signature" && k !== "key_id")
            .sort();
        const message = paramKeys
            .map((k) => `${k}=${encodeURIComponent(params[k])}`)
            .join("&");
        const verifier = crypto_1.default.createVerify("RSA-SHA256");
        verifier.update(message);
        const verified = verifier.verify(publicKeys[keyId], signature, "base64");
        if (!verified) {
            return res.status(200).send("OK"); // Never return 400 to Google
        }
        const nonce = params.custom_data;
        const userIdStr = params.user_id;
        if (!nonce || !userIdStr) {
            return res.status(200).send("OK");
        }
        const session = await client_1.default.adRewardSession.findUnique({
            where: { nonce },
        });
        if (!session || session.rewarded) {
            return res.status(200).send("OK");
        }
        if (session.userId.toString() !== userIdStr) {
            return res.status(200).send("OK");
        }
        // ✅ Mark rewarded
        await client_1.default.adRewardSession.update({
            where: { nonce },
            data: { rewarded: true },
        });
        return res.status(200).send("OK");
    }
    catch (err) {
        console.error("SSV error:", err);
        return res.status(200).send("OK"); // Always 200 for Google
    }
});
exports.app.use("/api/adminActions", adminActionRoutes_1.default);
exports.app.use("/api/adminAuth", adminAuthRoutes_1.default);
exports.app.use("/api/adminGetters", adminGetterRoutes_1.default);
exports.app.use("/api/publicGetters", publicGetterRoutes_1.default);
exports.app.use("/api/userActions", userActionRoutes_1.default);
exports.app.use("/api/userAuth", userAuthRoutes_1.default);
exports.app.use("/api/userGetters", userGetterRoutes_1.default);
const server = (0, http_1.createServer)(exports.app);
exports.default = server;
//# sourceMappingURL=server.js.map