import express from "express";
import { twitterCallback, logout } from "../controllers/authController.ts";
import auth from "../middleware/auth.ts";

const router = express.Router();

router.post("/twitter/callback", twitterCallback);
router.post("/logout", auth, logout);

export default router;
