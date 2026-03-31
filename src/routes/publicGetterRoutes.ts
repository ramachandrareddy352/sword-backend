import express from "express";

import {
  getAllSwords,
  getAllMaterials,
  getSword,
  getMaterial,
  getLeaderboard,
  getAdminConfig,
  getAppVersionCheck,
} from "../controllers/publicGetterController.js";

const router = express.Router();

// Get all sword definitions (paginated, sortable)
router.get("/all/swords", getAllSwords);

// Get single sword by level or name
// ?level=5  OR  ?name=Dragon Blade
router.get("/single/sword", getSword);

// Get all materials (paginated, sortable, filter by rarity)
router.get("/all/materials", getAllMaterials);

// Get single material by id / code / name
// ?id=1 OR ?code=IRON_ORE OR ?name=Iron Ore
router.get("/single/material", getMaterial);

router.get("/leaderboard", getLeaderboard);

router.get("/admin/config", getAdminConfig);

router.get("/version-check", getAppVersionCheck);
export default router;
