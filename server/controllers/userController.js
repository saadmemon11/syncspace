const User = require("../models/User");

// GET all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select("name email avatar");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const updateData = {};
    if (name)   updateData.name   = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("name email avatar");

    // ← NEW: tell all connected clients that this user updated their profile
    // So OnlineUser list and DM list refresh instantly without page reload
    const io = req.app.get("io");
    if (io) {
      io.emit("userProfileUpdated", {
        userId: user._id,
        name:   user.name,
        avatar: user.avatar,
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const { to } = req.body;
    const target = await User.findOne({
      $or: [{ name: to }, { email: to }]
    });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (String(target._id) === String(req.user.id))
      return res.status(400).json({ message: "Cannot add yourself" });

    // Avoid duplicates
    if (!target.pendingRequests.includes(req.user.id)) {
      target.pendingRequests.push(req.user.id);
      await target.save();
    }
    res.json({ message: "Request sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST accept friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { from } = req.body;
    const me = await User.findById(req.user.id);
    me.pendingRequests = me.pendingRequests.filter(id => String(id) !== String(from));
    if (!me.friends.includes(from)) me.friends.push(from);
    await me.save();

    const other = await User.findById(from);
    if (!other.friends.includes(req.user.id)) {
      other.friends.push(req.user.id);
      await other.save();
    }
    res.json({ message: "Friend added" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST reject friend request
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { from } = req.body;
    const me = await User.findById(req.user.id);
    me.pendingRequests = me.pendingRequests.filter(id => String(id) !== String(from));
    await me.save();
    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET friends list
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends", "name email avatar");
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("pendingRequests", "name email");
    res.json(user.pendingRequests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET current user's own profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email avatar");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};