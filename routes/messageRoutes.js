const express = require("express");
const messageController = require("../controllers/messageController");
const router = express.Router();

router.post("/messages", messageController.createMessage);
router.get("/messages/:roomId", messageController.getMessages);

module.exports = router;