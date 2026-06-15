export function serializeBigInt(obj) {
    return JSON.parse(JSON.stringify(obj, (_, value) => typeof value === "bigint" ? value.toString() : value));
}
//# sourceMappingURL=serializeBigInt.js.map