const express = require("express");
const notificationController = require("../controllers/notificationController");
const router = express.Router();

router.get("/notifications", notificationController.getUserNotifications);
router.put("/notifications/:notificationId/read", notificationController.markNotificationAsRead);
router.put("/notifications/mark-all-read", notificationController.markAllNotificationsAsRead);

module.exports = router;