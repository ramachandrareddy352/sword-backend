"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const publicGetterController_1 = require("../controllers/publicGetterController");
const router = express_1.default.Router();
// Get all sword definitions (paginated, sortable)
router.get("/all/swords", publicGetterController_1.getAllSwords);
// Get single sword by level or name
// ?level=5  OR  ?name=Dragon Blade
router.get("/single/sword", publicGetterController_1.getSword);
// Get all materials (paginated, sortable, filter by rarity)
router.get("/all/materials", publicGetterController_1.getAllMaterials);
// Get single material by id / code / name
// ?id=1 OR ?code=IRON_ORE OR ?name=Iron Ore
router.get("/single/material", publicGetterController_1.getMaterial);
router.get("/leaderboard", publicGetterController_1.getLeaderboard);
// All sword purchases
// router.get("/marketplace/swords/purchases", getPurchasedSwords);
// All material purchases
// router.get("/marketplace/materials/purchases", getPurchasedMaterials);
// All shield purchases
// router.get("/marketplace/shields/purchases", getPurchasedShields);
// All shield purchases
router.get("/admin/config", publicGetterController_1.getAdminConfig);
router.get("/version-check", publicGetterController_1.getAppVersionCheck);
exports.default = router;
//# sourceMappingURL=publicGetterRoutes.js.map