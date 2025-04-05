// notificationRoutes.js
const express = require("express");
const router = express.Router();

module.exports = (io) => {
  const notificationController = require("../controllers/notificationController")(io);

  router.get("/", notificationController.getUserNotifications);
  router.put("/:notificationId/read", notificationController.markNotificationAsRead);
  router.put("/mark-all-read", notificationController.markAllAsRead);

  return router;
};