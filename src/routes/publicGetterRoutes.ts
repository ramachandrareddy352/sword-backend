import express from "express";

import {
  getAllSwords,
  getAllMaterials,
  getSword,
  getMaterial,
  getLeaderboard,
  getPurchasedSwords,
  getPurchasedMaterials,
  getPurchasedShields,
  getAdminConfig,
} from "../controllers/publicGetterController";

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

// All sword purchases
router.get("/marketplace/swords/purchases", getPurchasedSwords);

// All material purchases
router.get("/marketplace/materials/purchases", getPurchasedMaterials);

// All shield purchases
router.get("/marketplace/shields/purchases", getPurchasedShields);

// All shield purchases
router.get("/admin/config", getAdminConfig);

export default router;
