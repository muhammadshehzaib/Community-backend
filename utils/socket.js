const Message = require("../models/messagesModel");
const Notification = require("../models/notificationModel");
const Room = require("../models/roomModel");

const initializeSocket = (io) => {
  // Create notification service with io instance
  const notificationService = require("../services/notificationService")(io);

  // --- Authentication Middleware ---
  const authenticateSocket = async (socket, next) => {
    next();
  };

  // --- Personal Chat Namespace ---
  const personalNamespace = io.of("/personal-rooms");
  personalNamespace.use(authenticateSocket);

  personalNamespace.on("connection", (socket) => {
    console.log(`User connected to personal chat`);

    socket.on("join-room", async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        socket.join(roomId);
      } catch (error) {
        console.error("Room join error:", error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("send-message", async (messageData) => {
      try {
        const { roomId, content, senderId } = messageData;

        const room = await Room.findById(roomId);
        if (!room) throw new Error("Room not found");

        const recipient = room.members.find(member =>
          member.toString() !== senderId.toString()
        );
        if (!recipient) throw new Error("Recipient not found");

        const newMessage = new Message({
          room: roomId,
          sender: senderId,
          content,
          timestamp: new Date(),
        });
        await newMessage.save();

        await notificationService.createNotification({
          recipientId: recipient,
          senderId: senderId,
          type: notificationService.notificationTypes.PERSONAL_MESSAGE,
          metadata: {
            messageId: newMessage._id,
            content: content,
            roomId: roomId,
          }
        });

        personalNamespace.to(roomId).emit("receive-message", newMessage);
      } catch (error) {
        console.error("Message send error:", error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from personal chat`);
    });
  });

  // --- Group Chat Namespace ---
  const groupNamespace = io.of("/group-rooms");
  groupNamespace.use(authenticateSocket);

  groupNamespace.on("connection", (socket) => {
    console.log(`User connected to group chat`);

    socket.on("join-group", async (groupId) => {
      try {
        const group = await Room.findById(groupId);
        socket.join(groupId);
      } catch (error) {
        console.error("Group join error:", error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("send-group-message", async (messageData) => {
      try {
        const { groupId, content, senderId } = messageData;

        const group = await Room.findById(groupId);
        if (!group) throw new Error("Group not found");

        const newMessage = new Message({
          room: groupId,
          sender: senderId,
          content,
          timestamp: new Date(),
        });
        await newMessage.save();

        // Notify all group members except sender
        group.members.forEach(async (memberId) => {
          if (memberId.toString() !== senderId.toString()) {
            await notificationService.createNotification({
              recipientId: memberId,
              senderId: senderId,
              type: notificationService.notificationTypes.GROUP_MESSAGE,
              metadata: {
                messageId: newMessage._id,
                content: content,
                groupId: groupId,
              }
            });
          }
        });

        groupNamespace.to(groupId).emit("receive-group-message", newMessage);
      } catch (error) {
        console.error("Group message error:", error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("group-milestone", async (milestoneData) => {
      try {
        const { groupId, _id, action, senderId } = milestoneData;

        const group = await Room.findById(groupId);
        if (!group) throw new Error("Group not found");

        let notificationType;
        switch (action) {
          case 'create':
            notificationType = notificationService.notificationTypes.GROUP_MILESTONE_CREATED;
            break;
          case 'update':
            notificationType = notificationService.notificationTypes.GROUP_MILESTONE_UPDATED;
            break;
          case 'delete':
            notificationType = notificationService.notificationTypes.GROUP_MILESTONE_DELETED;
            break;
          default:
            throw new Error("Invalid milestone action");
        }

        // Notify all group members
        group.members.forEach(async (memberId) => {
          await notificationService.createNotification({
            recipientId: memberId,
            senderId: senderId,
            type: notificationType,
            metadata: {
              milestoneId: _id,
              action: action,
              groupId: groupId
            }
          });
        });

        groupNamespace.to(groupId).emit("group-milestone-update", milestoneData);
      } catch (error) {
        console.error("Milestone event error:", error.message);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from group chat`);
    });
  });

  // --- Notification Namespace ---
  const notificationNamespace = io.of("/notifications");
  notificationNamespace.use(authenticateSocket);

  notificationNamespace.on("connection", (socket) => {
    console.log(`User connected to notifications`);

    socket.on("join-user-notification-room", (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined notification room`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from notifications`);
    });
  });

  console.log("Socket.io initialized with all namespaces");
};

module.exports = { initializeSocket };