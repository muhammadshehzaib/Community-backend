const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true, // Index for faster queries
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      index: true, 
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Flexible field for additional data
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);