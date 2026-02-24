"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClient = (_a = global.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
});
if (process.env.NODE_ENV !== "production") {
    global.prisma = prismaClient;
}
exports.default = prismaClient;
//# sourceMappingURL=client.js.map