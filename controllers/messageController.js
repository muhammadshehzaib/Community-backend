const Message = require("../models/messagesModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const { getIdFromToken } = require("./userController");
const { createNotification } = require("./notificationController");
const { getIO } = require("../utils/socket");

module.exports.createMessage = async (req, res) => {
  try {
    const senderId = await getIdFromToken(req.header("Authorization"));
    const { roomId, content } = req.body;

    // Get room and sender details with populated members
    const room = await Room.findById(roomId).populate('members', 'name');
    const sender = await User.findById(senderId);

    if (!room || !sender) {
      return res.status(404).json({ message: "Room or user not found" });
    }

    // Create the message
    const newMessage = new Message({
      sender: senderId,
      content: content,
      room: roomId,
      timestamp: new Date()
    });

    await newMessage.save();

    // Get Socket.IO instance
    const io = getIO();
    const notificationNamespace = io.of("/notifications");

    // Create message preview
    const messagePreview = content.length > 50 
      ? `${content.substring(0, 50)}...` 
      : content;

    // Prepare notification content
    const notificationContent = `${sender.name}: ${messagePreview}`;
    const notificationType = room.type === "personal" ? "personal_message" : "group_message";

    // Handle notifications based on room type
    if (room.type === "personal") {
      // For personal messages, notify the other member
      const recipient = room.members.find(
        member => member._id.toString() !== senderId.toString()
      );

      if (recipient) {
        // Create notification in database
        const notification = await createNotification(
          recipient._id,
          senderId,
          notificationType,
          roomId,
          notificationContent
        );

        // Emit notification through socket
        notificationNamespace.to(`user-${recipient._id}`).emit("new-notification", {
          ...notification.toObject(),
          sender: {
            _id: sender._id,
            name: sender.name
          }
        });

        // Emit message to personal rooms namespace
        io.of("/personal-rooms").to(roomId).emit("receive-message", {
          ...newMessage.toObject(),
          sender: {
            _id: sender._id,
            name: sender.name
          }
        });
      }
    } else if (room.type === "group") {
      // For group messages, notify all members except sender
      const recipients = room.members.filter(
        member => member._id.toString() !== senderId.toString()
      );
      
      for (const recipient of recipients) {
        // Create notification in database
        const notification = await createNotification(
          recipient._id,
          senderId,
          notificationType,
          roomId,
          notificationContent
        );

        // Emit notification through socket
        notificationNamespace.to(`user-${recipient._id}`).emit("new-notification", {
          ...notification.toObject(),
          sender: {
            _id: sender._id,
            name: sender.name
          }
        });
      }

      // Emit message to group rooms namespace
      io.of("/personal-rooms").to(roomId).emit("receive-message", {
        ...newMessage.toObject(),
        sender: {
          _id: sender._id,
          name: sender.name
        }
      });
    }

    res.status(200).json({
      message: newMessage,
      notification: "Message and notifications sent successfully"
    });

  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ message: "Failed to create message" });
  }
};

module.exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ room: roomId })
      .populate("sender", "name")
      .sort({ timestamp: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};