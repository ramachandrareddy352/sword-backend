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
const adminActionRoutes_ts_1 = __importDefault(require("../routes/adminActionRoutes.ts"));
const adminAuthRoutes_ts_1 = __importDefault(require("../routes/adminAuthRoutes.ts"));
const adminGetterRoutes_ts_1 = __importDefault(require("../routes/adminGetterRoutes.ts"));
const publicGetterRoutes_ts_1 = __importDefault(require("../routes/publicGetterRoutes.ts"));
const userActionRoutes_ts_1 = __importDefault(require("../routes/userActionRoutes.ts"));
const userAuthRoutes_ts_1 = __importDefault(require("../routes/userAuthRoutes.ts"));
const userGetterRoutes_ts_1 = __importDefault(require("../routes/userGetterRoutes.ts"));
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
exports.app.use("/api/adminActions", adminActionRoutes_ts_1.default);
exports.app.use("/api/adminAuth", adminAuthRoutes_ts_1.default);
exports.app.use("/api/adminGetters", adminGetterRoutes_ts_1.default);
exports.app.use("/api/publicGetters", publicGetterRoutes_ts_1.default);
exports.app.use("/api/userActions", userActionRoutes_ts_1.default);
exports.app.use("/api/userAuth", userAuthRoutes_ts_1.default);
exports.app.use("/api/userGetters", userGetterRoutes_ts_1.default);
const server = (0, http_1.createServer)(exports.app);
exports.default = server;
//# sourceMappingURL=server.js.map