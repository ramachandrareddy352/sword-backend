"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePayload = encodePayload;
exports.decodePayload = decodePayload;
exports.sendShoppingAck = sendShoppingAck;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const SECRET_KEY = process.env.VOUCHER_SECRET_KEY;
function encodePayload(payload) {
    const data = JSON.stringify(payload);
    const signature = crypto_1.default
        .createHmac("sha256", SECRET_KEY)
        .update(data)
        .digest("hex");
    const encoded = Buffer.from(data).toString("base64");
    return `${encoded}.${signature}`;
}
function decodePayload(token) {
    const [encoded, signature] = token.split(".");
    const data = Buffer.from(encoded, "base64").toString();
    const expected = crypto_1.default
        .createHmac("sha256", SECRET_KEY)
        .update(data)
        .digest("hex");
    if (signature !== expected) {
        throw new Error("Invalid signature");
    }
    return JSON.parse(data);
}
async function sendShoppingAck(payload) {
    const encoded = encodePayload(payload);
    const resp = await axios_1.default.post(process.env.SHOPPING_ACK_URL, { data: encoded }, { timeout: 5000 });
    if (!resp.data?.success) {
        throw new Error("Shopping acknowledge failed");
    }
    return resp.data;
}
//# sourceMappingURL=shoppingTool.js.map