let ioInstance;

const initializeSocket = (io) => {
  ioInstance = io;
  
  // Initialize the notifications namespace
  const notificationNamespace = io.of("/notifications");
  
  notificationNamespace.on("connection", (socket) => {
    console.log("Client connected to notifications namespace");
    
    // Handle joining notification room
    socket.on("join-user-notification-room", (userId) => {
      console.log(`User ${userId} joining notification room`);
      socket.join(`user-${userId}`);
    });
  });

  // Initialize chat namespace
  const chatNamespace = io.of("/personal-rooms");
  
  chatNamespace.on("connection", (socket) => {
    console.log("Client connected to chat namespace");

    // Handle joining chat room
    socket.on("join-room", (roomId) => {
      console.log(`User joining chat room: ${roomId}`);
      socket.join(roomId);
    });

    // Handle new message
    socket.on("send-message", async (messageData) => {
      const { roomId, content, senderId } = messageData;
      
      try {
        // Make HTTP request to message creation endpoint
        const response = await fetch(`${process.env.BASE_URL}/api/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': socket.handshake.auth.token
          },
          body: JSON.stringify({ roomId, content })
        });

        if (!response.ok) {
          throw new Error('Failed to create message');
        }

        // Message creation endpoint handles both message and notification emission
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('message-error', { error: 'Failed to send message' });
      }
    });
  });
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized");
  }
  return ioInstance;
};

module.exports = { initializeSocket, getIO };