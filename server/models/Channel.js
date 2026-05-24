const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    // 🔥 OPTIONAL FOR DM
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false
    },

    // 🔥 CHANNEL TYPE
    type: {
      type: String,
      enum: ["public", "private", "dm"], // ✅ ADDED "dm"
      default: "public"
    },

    // 🔥 DM MEMBERS
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Channel", channelSchema);