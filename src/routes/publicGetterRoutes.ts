// src/routes/publicGetterRoutes
import express from "express";

import {
  getAllSwords,
  getAllMaterials,
  getAllShields,
  getSword,
  getMaterial,
  getShield,
  getLeaderboard,
  getAllMarketplaceItems,
  getAllMarketplacePurchases,
} from "../controllers/publicGetterController";

const router = express.Router();

// 1) Get all sword level definitions (paginated + multi-sort)
router.get("/all/swords", getAllSwords);

// 2) Get all material types (paginated + multi-sort)
router.get("/all/materials", getAllMaterials);

// 3) Get all shield types (paginated + multi-sort)
router.get("/all/shields", getAllShields);

// 4) Get one specific sword by level or name
// Query params: ?level=5  OR  ?name="Dragon Slayer"
// Example: GET /public/sword?level=10
router.get("/single/sword", getSword);

// 5) Get one specific material by id, code or name
// Query params: ?id=123  OR  ?code="FIRE_CRYSTAL"  OR  ?name="Dragon Scale"
// Example: GET /public/material?code=MITHRIL_INGOT
router.get("/single/material", getMaterial);

// 6) Get one specific shield by id, code or name
// Query params: ?id=456  OR  ?code="AEGIS"  OR  ?name="Guardian Shield"
// Example: GET /public/shield?name=Iron Buckler
router.get("/single/shield", getShield);

router.get("/leaderboard", getLeaderboard);

// 15) All users marketplace purchases
router.get("/marketplace/purchases", getAllMarketplacePurchases);

// 16) All marketplace purchases
router.get("/marketplace/items", getAllMarketplaceItems);

export default router;
