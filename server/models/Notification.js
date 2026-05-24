const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  },

  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace"
  },

  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel"
  },

  type: {
    type: String,
    enum: ["message", "mention", "reaction"],
    default: "message"
  },

  read: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);