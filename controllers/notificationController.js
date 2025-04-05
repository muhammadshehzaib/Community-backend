module.exports = (io) => {
  const notificationService = require('../services/notificationService')(io);

  const getUserNotifications = async (req, res) => {
    try {
      const userId = req.user._id; // Changed from req.user to req.user._id
      const { limit, skip, unreadOnly } = req.query;

      const notifications = await notificationService.getUserNotifications(userId, {
        limit: parseInt(limit) || 20,
        skip: parseInt(skip) || 0,
        unreadOnly: unreadOnly === 'true'
      });

      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const markNotificationAsRead = async (req, res) => {
    try {
      const notification = await notificationService.markAsRead(
        req.params.notificationId, 
        req.user._id // Changed from req.user to req.user._id
      );
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.status(200).json(notification);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  const markAllAsRead = async (req, res) => {
    try {
      const result = await notificationService.markAllAsRead(req.user._id); // Changed from req.user to req.user._id
      res.status(200).json({
        message: `Marked ${result.modifiedCount} notifications as read`
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  return {
    getUserNotifications,
    markNotificationAsRead,
    markAllAsRead
  };
};