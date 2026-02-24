"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUser = resolveUser;
exports.getPagination = getPagination;
exports.userGuard = userGuard;
const client_1 = __importDefault(require("../database/client"));
async function resolveUser(identifier) {
    if (identifier.id) {
        const user = await client_1.default.user.findUnique({
            where: { id: BigInt(identifier.id) },
        });
        if (!user)
            throw new Error("USER_NOT_FOUND");
        return user;
    }
    if (identifier.email) {
        const user = await client_1.default.user.findUnique({
            where: { email: identifier.email },
        });
        if (!user)
            throw new Error("USER_NOT_FOUND");
        return user;
    }
    throw new Error("IDENTIFIER_REQUIRED");
}
function getPagination(query) {
    const limit = query.limit ? Number(query.limit) : 20;
    const page = query.page ? Number(query.page) : 1;
    if (page <= 0)
        return null;
    return {
        take: limit,
        skip: (page - 1) * limit,
        page,
        limit,
    };
}
async function userGuard(userId) {
    const user = await client_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    if (user.isBanned)
        throw new Error("User is banned, cannot perform any actions");
    return user;
}
//# sourceMappingURL=queryHelpers.js.map