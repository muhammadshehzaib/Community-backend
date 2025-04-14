const express = require("express");
const milestoneController = require("../controllers/milestoneController");
const authMiddleware = require("../middleware/validate.middleware");
const router = express.Router();

router.get("/milestones", authMiddleware, milestoneController.getUserMilestones);
router.post("/milestones", authMiddleware, milestoneController.createMilestone);
router.put("/milestones/:milestoneId", authMiddleware, milestoneController.updateMilestone);
router.delete("/milestones/:milestoneId", authMiddleware, milestoneController.deleteMilestone);
router.get("/milestones/:milestoneId", authMiddleware, milestoneController.getMilestone);

module.exports = router;
