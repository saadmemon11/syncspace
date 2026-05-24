const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  sendMessage,
  getChannelMessages,
  editMessage,
  deleteMessage, // ✅ NEW
  reactToMessage,
  sendFileMessage,
  markMessageAsRead,
  replyToMessage
} = require("../controllers/messageController");

router.post("/", protect, sendMessage);
router.post("/file", protect, upload.single("file"), sendFileMessage);
router.post("/reply", protect, replyToMessage);

// 🔥 Chat history
router.get("/channel/:channelId", protect, getChannelMessages);

// 🔥 EDIT
router.put("/:messageId", protect, editMessage);

// 🔥 DELETE (NEW)
router.delete("/:messageId", protect, deleteMessage);

router.post("/react/:messageId", protect, reactToMessage);
router.put("/read/:messageId", protect, markMessageAsRead);

module.exports = router;