"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const server_1 = __importDefault(require("./config/server"));
const redis_1 = require("./config/redis");
(0, dotenv_1.config)();
const PORT = process.env.PORT || 5000;
server_1.default.listen(PORT, async () => {
    await (0, redis_1.connectRedis)();
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=app.js.map