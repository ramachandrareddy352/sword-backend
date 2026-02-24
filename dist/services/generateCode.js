"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureCode = generateSecureCode;
const crypto_1 = require("crypto");
// Helper to generate 12-char voucher/sword code (alphanumeric + some symbols)
function generateSecureCode(length = 12) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let code = "";
    const bytes = (0, crypto_1.randomBytes)(length);
    for (let i = 0; i < length; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}
//# sourceMappingURL=generateCode.js.map