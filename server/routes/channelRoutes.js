const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const {
  getChannels,
  createChannel,
  deleteChannel,
  getDMChannel,
} = require("../controllers/channelController");

router.get("/:workspaceId", auth, getChannels);
router.post("/",            auth, createChannel);
router.delete("/:id",       auth, deleteChannel);   // ← THIS WAS MISSING
router.post("/dm",          auth, getDMChannel);

module.exports = router;