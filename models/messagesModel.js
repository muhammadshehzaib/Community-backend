const { Schema, default: mongoose } = require("mongoose");

const messageSchema = new Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: "room",
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const messageModel = mongoose.model('message', messageSchema);
module.exports = messageModel;
