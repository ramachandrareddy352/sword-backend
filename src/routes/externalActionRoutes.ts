import express from "express";
import { redeemVoucherFromShopping } from "../controllers/externalActionController";

const router = express.Router();

router.post("/voucher/redeem", redeemVoucherFromShopping);

export default router;
