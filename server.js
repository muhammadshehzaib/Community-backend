const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const roomModel = require("./models/roomModel");
require('./utils/cron');

// Models
const Message = require("./models/messagesModel");
const connectDB = require("./db/connection");
const { initializeSocket } = require('./utils/socket');


const cors = require("cors");
require("dotenv").config();
const app = express();

connectDB();
app.use(cors({
  origin: ['https://community-frontend-rho.vercel.app', 'http://localhost:3000','http://localhost:3001', "*"],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// routers imports
const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");
const messageRoutes = require("./routes/messageRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const groupMilestoneRoutes = require('./routes/groupMilestoneRoutes');


app.get("/", (req, res) => {
  res.send("Welcome to the Chat Application API!");
});

app.use(userRoutes);
app.use(roomRoutes);
app.use(messageRoutes);
app.use(notificationRoutes);
app.use(milestoneRoutes);
app.use(groupMilestoneRoutes);

const server = http.createServer(app);

const io = socketIo(server, {
  cors: "*",
});

initializeSocket(io);

server.listen(9000, () => {
  console.log("Http server running on port 9000");
});
