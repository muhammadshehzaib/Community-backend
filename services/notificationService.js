const Notification = require("../models/notificationModel");

const notificationTypes = {
  MILESTONE_CREATED: "milestone_created",
  MILESTONE_UPDATED: "milestone_updated",
  MILESTONE_DELETED: "milestone_deleted",
  MILESTONE_COMPLETED: "milestone_completed",
  GROUP_MILESTONE_CREATED: "group_milestone_created",
  GROUP_MILESTONE_UPDATED: "group_milestone_updated",
  GROUP_MILESTONE_DELETED: "group_milestone_deleted",
  PERSONAL_MESSAGE: "personal_message",
  GROUP_MESSAGE: "group_message"
};

function createNotificationService(io) {
  function emitNotification(recipientId, notification) {
    try {
      if (!io) {
        throw new Error("Socket.io instance not available");
      }
      
      io.of("/notifications")
        .to(`user-${recipientId}`)
        .emit("new-notification", {
          ...notification.toObject(),
          isNew: true
        });
    } catch (error) {
      console.error("Error emitting notification:", error);
    }
  }

  async function createNotification({ recipientId, senderId, type, metadata }) {
    try {
      const notification = new Notification({
        recipient: recipientId,
        sender: senderId,
        type,
        metadata,
      });

      await notification.save();

      if (recipientId) {
        emitNotification(recipientId, notification);
      }

      return notification;
    } catch (error) {
      console.error("NotificationService error:", error);
      throw error;
    }
  }

  async function getUserNotifications(userId, options = {}) {
    try {
      const { limit = 20, skip = 0, unreadOnly = false } = options;
      
      const query = { recipient: userId };
      if (unreadOnly) query.read = false;

      return await Notification.find(query)
        .populate("sender", "name")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async function markAsRead(notificationId, userId) {
    try {
      return await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { $set: { read: true } },
        { new: true }
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async function markAllAsRead(userId) {
    try {
      return await Notification.updateMany(
        { recipient: userId, read: false },
        { $set: { read: true } }
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  return {
    notificationTypes,
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead
  };
}

module.exports = createNotificationService;