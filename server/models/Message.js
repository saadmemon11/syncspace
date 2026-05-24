const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
{
  content: {
  type: String,
  default: ""
},

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel"
  },

  threadParent: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Message",
  default: null
},

  edited: {
    type: Boolean,
    default: false
  },

   // ── FILE ATTACHMENT ──────────────────────────────────────────
  fileData: { type: String, default: null },   // base64 string
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },

  // ── REACTIONS ───────────────────────────────────────────────
  reactions: [
    {
      emoji: { type: String },
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    }
  ],


  // 🔥 NEW FIELD
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ]

},
{ timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);