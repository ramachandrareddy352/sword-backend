"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/publicGetterRoutes.ts
const express_1 = __importDefault(require("express"));
const publicGetterController_ts_1 = require("../controllers/publicGetterController.ts");
const router = express_1.default.Router();
// 1) Get all sword level definitions (paginated + multi-sort)
router.get("/all/swords", publicGetterController_ts_1.getAllSwords);
// 2) Get all material types (paginated + multi-sort)
router.get("/all/materials", publicGetterController_ts_1.getAllMaterials);
// 3) Get all shield types (paginated + multi-sort)
router.get("/all/shields", publicGetterController_ts_1.getAllShields);
// 4) Get one specific sword by level or name
// Query params: ?level=5  OR  ?name="Dragon Slayer"
// Example: GET /public/sword?level=10
router.get("/single/sword", publicGetterController_ts_1.getSword);
// 5) Get one specific material by id, code or name
// Query params: ?id=123  OR  ?code="FIRE_CRYSTAL"  OR  ?name="Dragon Scale"
// Example: GET /public/material?code=MITHRIL_INGOT
router.get("/single/material", publicGetterController_ts_1.getMaterial);
// 6) Get one specific shield by id, code or name
// Query params: ?id=456  OR  ?code="AEGIS"  OR  ?name="Guardian Shield"
// Example: GET /public/shield?name=Iron Buckler
router.get("/single/shield", publicGetterController_ts_1.getShield);
router.get("/leaderboard", publicGetterController_ts_1.getLeaderboard);
// 15) All users marketplace purchases
router.get("/marketplace/purchases", publicGetterController_ts_1.getAllMarketplacePurchases);
// 16) All marketplace purchases
router.get("/marketplace/items", publicGetterController_ts_1.getAllMarketplaceItems);
exports.default = router;
//# sourceMappingURL=publicGetterRoutes.js.map