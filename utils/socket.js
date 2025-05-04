const Message = require("../models/messagesModel");
const Notification = require("../models/notificationModel");
const roomModel = require("../models/roomModel");
const { createGroupMilestone, updateGroupMilestone, deleteGroupMilestone } = require("../controllers/milestoneController");

const authenticateToken = (token) => {
  // Implement proper authentication logic for tokens
  return true; // Dummy return for example
};

const initializeSocket = (io) => {
  // --- Personal Namespace ---
  const personalNamespace = io.of("/personal-rooms");

  personalNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (authenticateToken(token)) next();
    else next(new Error("Unauthorized"));
  });

  personalNamespace.on("connection", (socket) => {
    console.log("A user connected to personal chat");

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User joined personal room: ${roomId}`);
    });

    socket.on("send-message", async (messageData) => {
      const { roomId, content, senderId } = messageData;
      const roomData = await roomModel.findById(roomId);
      const recipient = roomData.members.filter((item) => {
        return item.toString() !== senderId.toString();
      });

      if (!recipient[0]) {
        console.error("Recipient ID is missing");
        socket.emit("error", { message: "Recipient ID is required." });
        return;
      }

      try {
        const newMessage = new Message({
          room: roomId,
          sender: senderId,
          content,
          timestamp: new Date(),
        });
        await newMessage.save();

        // Create a notification for the recipient
        const newNotification = new Notification({
          recipient: recipient[0], // Specific recipient for personal messages
          sender: senderId,
          type: "personal_message",
          metadata: {
            messageId: newMessage._id,
            content: content,
            roomId: roomId,
          },
        });
        await newNotification.save();

        // Emit the new message to the room
        personalNamespace.to(roomId).emit("receive-message", newMessage);

        // Emit the new notification to the recipient
        notificationNamespace
          .to(`user-${recipient[0]}`)
          .emit("new-notification", newNotification);
      } catch (error) {
        console.error("Error saving message or notification:", error);
        socket.emit("error", { message: "Failed to send message." });
      }
    });

    socket.on("delete-message", async (data) => {
      const { messageId, roomId, senderId } = data;

      try {
        const message = await Message.findById(messageId);

        if (!message) {
          socket.emit("delete-message-error", {
            error: "Message not found"
          });
          return;
        }

        if (message.sender.toString() !== senderId.toString()) {
          socket.emit("delete-message-error", {
            error: "Unauthorized: You can only delete your own messages"
          });
          return;
        }

        await Message.findByIdAndDelete(messageId);

        personalNamespace.to(roomId).emit("message-deleted", {
          messageId,
          roomId,
          deletedBy: senderId
        });

        console.log(`Message ${messageId} deleted by user ${senderId} in room ${roomId}`);

      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("delete-message-error", {
          error: "Failed to delete message"
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from personal chat");
    });
  });

  // --- Group Namespace ---
  const groupNamespace = io.of("/group-rooms");

  groupNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (authenticateToken(token)) next();
    else next(new Error("Unauthorized"));
  });

  groupNamespace.on("connection", (socket) => {
    console.log("A user connected to group chat");

    socket.on("join-group", (groupId) => {
      socket.join(groupId);
      console.log(`User joined group: ${groupId}`);
    });

    socket.on("send-group-message", async (messageData) => {
      const { groupId, content, senderId } = messageData;

      try {
        const roomData = await roomModel.findById(groupId);
        if (!roomData || !roomData.members) {
          console.error("Group room not found or has no members");
          socket.emit("error", { message: "Invalid group or no members found." });
          return;
        }

        // Exclude the sender from the recipient list
        const recipients = roomData.members.filter((item) => {
          return item.toString() !== senderId.toString();
        });

        if (!recipients) {
          console.error("No recipients found in the group");
          socket.emit("error", { message: "No recipients found in the group." });
          return;
        }

        const newMessage = new Message({
          room: groupId,
          sender: senderId,
          content,
          timestamp: new Date(),
        });
        await newMessage.save();

        // Broadcast the new message to the group
        groupNamespace.to(groupId).emit("receive-group-message", newMessage);

        // Create notifications for all recipients
        await Promise.all(
          recipients.map(async (recipientId) => {
            const newNotification = new Notification({
              recipient: recipientId, // Specific recipient for group messages
              sender: senderId,
              type: "group_message",
              metadata: {
                messageId: newMessage._id,
                content: content,
                groupId: groupId,
              },
            });
            await newNotification.save();

            // Emit the new notification to the recipient
            notificationNamespace
              .to(`user-${recipientId}`)
              .emit("new-notification", newNotification);
          })
        );
      } catch (error) {
        console.error("Error saving group message or notifications:", error);
        socket.emit("error", { message: "Failed to send group message." });
      }
    });

    // --- Group Milestone Events ---
    socket.on("group-milestone", async (milestoneData) => {
      try {
        const { groupId, id, senderId, type } = milestoneData;
        const roomData = await roomModel.findById(groupId);
        if (!roomData || !roomData.members) {
          console.error("Group room not found or has no members");
          socket.emit("error", { message: "Invalid group or no members found." });
          return;
        }

        // Exclude the sender from the recipient list
        const recipients = roomData.members.filter((item) => {
          return item.toString() !== senderId.toString();
        });

        if (!recipients) {
          console.error("No recipients found in the group");
          socket.emit("error", { message: "No recipients found in the group." });
          return;
        }

        await Promise.all(
          recipients.map(async (recipientId) => {
            console.log("Recipient ID:", recipientId);

            const newNotification = new Notification({
              recipient: recipientId,
              sender: senderId,
              type: type || "group_milestone",
              metadata: {
                milestoneId: id,
                // content: content,
                groupId: groupId,
              },
            });
            await newNotification.save();

            // Emit the new notification to the recipient
            notificationNamespace
              .to(`user-${recipientId}`)
              .emit("new-notification", newNotification);
          })
        );
        groupNamespace.to(groupId).emit("new-group-milestone", milestoneData);
      } catch (error) {
        console.error("Error creating group milestone:", error);
        socket.emit("error", { message: "Failed to create group milestone." });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from group chat");
    });
  });

  // --- Notification Namespace ---
  const notificationNamespace = io.of("/notifications");

  notificationNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (authenticateToken(token)) next();
    else next(new Error("Unauthorized"));
  });

  notificationNamespace.on("connection", (socket) => {
    console.log("A user connected to notifications");

    socket.on("join-user-notification-room", (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their notification room`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from notifications");
    });
  });

  console.log("Socket.io initialized");
};

module.exports = { initializeSocket };