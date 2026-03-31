import express from "express";
import { redeemVoucherFromShopping } from "../controllers/externalActionController.js";

const router = express.Router();

router.post("/voucher/redeem", redeemVoucherFromShopping);

export default router;
