const Notification = require("../models/notificationModel");
const { getIdFromToken } = require("./userController");
const { getIO } = require("../utils/socket");

// Create notification
const createNotification = async (recipientId, senderId, type, metadata) => {
  try {
    const notification = new Notification({
      recipient: recipientId, // Optional: Only for personal/group messages
      sender: senderId,
      type,
      metadata, // Store additional details in the metadata field
    });
    await notification.save();

    // Emit the new notification to the recipient's room (if recipient exists)
    if (recipientId) {
      const io = getIO();
      io.of("/notifications")
        .to(`user-${recipientId}`)
        .emit("new-notification", notification);
    }
    console.log("notification : ",notification)
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Get notifications for a user
const getUserNotifications = async (req, res) => {
  try {
    const userId = await getIdFromToken(req.header("Authorization"));
    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "firstName")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = await getIdFromToken(req.header("Authorization"));

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Ensure the user is the recipient of the notification
    if (notification.recipient && notification.recipient.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = await getIdFromToken(req.header("Authorization"));
    await Notification.updateMany(
      { recipient: userId },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};