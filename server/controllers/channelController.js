const Channel = require("../models/Channel");

exports.getChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ workspace: req.params.workspaceId });
    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createChannel = async (req, res) => {
  try {
    const { name, workspaceId } = req.body;
    const channel = await Channel.create({
      name,
      workspace: workspaceId,
      type: "public",
      createdBy: req.user.id,
    });
    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    await Channel.findByIdAndDelete(req.params.id);
    res.json({ message: "Channel deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE OR GET DM CHANNEL — fixed to use type:"dm" consistently
exports.getDMChannel = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Find existing DM between these two users
    let channel = await Channel.findOne({
      type: "dm",                                        // ← was isDM:true before (wrong)
      members: { $all: [currentUserId, userId], $size: 2 },
    });

    if (!channel) {
      channel = await Channel.create({
        name: "dm",
        type: "dm",                                      // ← use type field, not isDM
        members: [currentUserId, userId],
      });
    }

    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};