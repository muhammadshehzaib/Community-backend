const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

// Models
const User = require("./models/userModel");
const Room = require("./models/roomModel");
const Message = require("./models/messagesModel");

const cors = require("cors");
require("dotenv").config();
const app = express();
require("./db/connection");
app.use(cors({
  origin: ['https://community-frontend-rho.vercel.app','http://localhost:3000',"*"], // Update to the front-end's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// routers imports
const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");

app.get("/", (req, res) => {
  res.send("Welcome to the Chat Application API!");
});

app.use(userRoutes);
app.use(roomRoutes);

const server = http.createServer(app);

const io = socketIo(server, {
  cors: "*",
});

const authenticateToken = (token) => {
  return true;
};

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
    const newMessage = new Message({
      room: roomId,
      sender: senderId,
      content,
      timestamp: new Date(),
    });

    await newMessage.save();

    personalNamespace.to(roomId).emit("receive-message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from personal chat");
  });
});

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
    const newMessage = new Message({
      room: groupId,
      sender: senderId,
      content,
      timestamp: new Date(),
    });

    console.log(newMessage,"new message");

    await newMessage.save();

    // await Room.findByIdAndUpdate(groupId, {
    //   $push: { messages: newMessage._id },
    // });
    console.log('message emitting',"groupId",groupId);
    groupNamespace.to(groupId).emit("receive-group-message", newMessage);
    console.log('message emiited successfully');
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from group chat");
  });
});

server.listen(9000, () => {
  console.log("Http server running on port 9000");
});
