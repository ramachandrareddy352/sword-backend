"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAuth_ts_1 = __importDefault(require("../middleware/adminAuth.ts"));
const upload_ts_1 = require("../middleware/upload.ts");
const adminActionController_ts_1 = require("../controllers/adminActionController.ts");
const router = express_1.default.Router();
router.put("/update/config", adminAuth_ts_1.default, adminActionController_ts_1.updateAdminConfig);
router.put("/create/sword", adminAuth_ts_1.default, upload_ts_1.upload.single("image"), adminActionController_ts_1.createSwordLevel);
router.put("/create/material", adminAuth_ts_1.default, upload_ts_1.upload.single("image"), adminActionController_ts_1.createMaterial);
router.put("/create/shield", adminAuth_ts_1.default, upload_ts_1.upload.single("image"), adminActionController_ts_1.createShield);
router.put("/update/sword", adminAuth_ts_1.default, upload_ts_1.upload.single("image"), adminActionController_ts_1.updateSwordLevel);
router.put("/update/material", adminAuth_ts_1.default, upload_ts_1.upload.single("image"), adminActionController_ts_1.updateMaterial);
router.put("/update/shield", adminAuth_ts_1.default, upload_ts_1.upload.single("image"), adminActionController_ts_1.updateShield);
router.post("/create/gift", adminAuth_ts_1.default, adminActionController_ts_1.createGift);
router.post("/cancel/gift", adminAuth_ts_1.default, adminActionController_ts_1.cancelGift);
router.delete("/delete/gift", adminAuth_ts_1.default, adminActionController_ts_1.deleteGift);
router.post("/create/marketplace-item", adminAuth_ts_1.default, adminActionController_ts_1.createMarketplaceItem);
router.patch("/update/marketplace-activate", adminAuth_ts_1.default, adminActionController_ts_1.toggleMarketplaceItemActive);
router.patch("/update/marketplace-price", adminAuth_ts_1.default, adminActionController_ts_1.updateMarketplaceItemPrice);
router.delete("/delete/marketplace-item", adminAuth_ts_1.default, adminActionController_ts_1.deleteMarketplaceItem);
router.patch("/update/users-ban", adminAuth_ts_1.default, adminActionController_ts_1.toggleUserBan);
router.post("/reply/support", adminAuth_ts_1.default, adminActionController_ts_1.replyToSupportTicket);
exports.default = router;
//# sourceMappingURL=adminActionRoutes.js.map