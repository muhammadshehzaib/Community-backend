const { Schema, default: mongoose, Types } = require("mongoose");

const roomSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["personal", "group"],
      required: true,
    },
    name: {
      type: String,
      required: function () {
        return this.type === "group";
      },
    },
    goal: {
      type: String,
      required: function () {
        return this.type === "group";
      },
    },
    imageUrl: {
      type: String,
      required: function () {
        return this.type === "group";
      },
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: function () {
        return this.type === "group";
      },
      select: function () {
        return this.type === "group";
      },
    },
  },
  {
    timestamps: true,
  }
);

// Define a text index for searching
roomSchema.index({ name: "text", goal: "text" });

// Middleware to validate and convert members and admin fields to ObjectIds
roomSchema.pre("validate", function (next) {
  // Ensure members array has valid ObjectId instances
  this.members = this.members.map(member => {
    return typeof member === "string" ? Types.ObjectId(member) : member;
  });

  // Convert admin to ObjectId if it is a string
  if (typeof this.admin === "string") {
    this.admin = Types.ObjectId(this.admin);
  }
  
  next();
});

const roomModel = mongoose.model("room", roomSchema);

module.exports = roomModel;
