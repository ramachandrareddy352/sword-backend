import { Router } from "express";
import adminAuth, { requireSuperAdmin } from "../middleware/adminAuth.js";
import { createAdmin, updateAdmin, removeAdmin, getAllAdmins, } from "../controllers/superAdminController.js";
const router = Router();
router.use(adminAuth, requireSuperAdmin);
router.post("/createAdmin", createAdmin);
router.post("/updateAdmin", updateAdmin);
router.post("/removeAdmin", removeAdmin);
router.get("/getAllAdmins", getAllAdmins);
export default router;
//# sourceMappingURL=superAdminRoutes.js.map