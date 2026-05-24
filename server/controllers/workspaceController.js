const Workspace = require("../models/Workspace");
const User      = require("../models/User");

// CREATE WORKSPACE
const createWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.create({
      name:    req.body.name,
      owner:   req.user._id,
      members: [{ user: req.user._id, role: "owner" }],
    });
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ message: "Failed to create workspace" });
  }
};

// GET MY WORKSPACES (workspaces where I am a member)
const getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id,
    }).populate("owner", "name email");
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch workspaces" });
  }
};

// GET ONLINE USERS IN WORKSPACE
const getOnlineUsers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate("members.user", "name email isOnline");
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const onlineUsers = workspace.members
      .map((m) => m.user)
      .filter((u) => u && u.isOnline);
    res.json(onlineUsers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch online users" });
  }
};

// DELETE WORKSPACE (owner only)
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await workspace.deleteOne();
    res.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

// ── NEW: SEND JOIN REQUEST ─────────────────────────────────────
// User searches workspace by name and sends join request to owner
const sendJoinRequest = async (req, res) => {
  try {
    const { workspaceName } = req.body;
    const userId = req.user._id;

    if (!workspaceName?.trim()) {
      return res.status(400).json({ message: "Please enter a workspace name" });
    }

    // Search by name — case insensitive, trim spaces
    // Also search across ALL workspaces (not just user's)
    const workspace = await Workspace.find({})
      .populate("owner", "name email");

    // Find manually — most flexible approach, handles any spacing/case
    const found = workspace.find(
      ws => ws.name.trim().toLowerCase() === workspaceName.trim().toLowerCase()
    );

    if (!found) {
      return res.status(404).json({
        message: `Workspace "${workspaceName}" not found. Make sure you type the exact name.`,
      });
    }

    // Check if already a member
    const alreadyMember = found.members.some(
      m => m.user.toString() === userId.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: "You are already a member of this workspace." });
    }

    // Check if request already pending
    const alreadyRequested = found.joinRequests.some(
      r => r.user.toString() === userId.toString()
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: "Request already sent. Wait for the owner to respond." });
    }

    // Add join request
    found.joinRequests.push({ user: userId });
    await found.save();

    // Notify workspace owner via socket
    const io = req.app.get("io");
    if (io) {
      const requestingUser = await User.findById(userId).select("name email avatar");
      io.to(found.owner._id.toString()).emit("workspaceJoinRequest", {
        workspaceId:   found._id,
        workspaceName: found.name,
        user:          requestingUser,
      });
    }

    res.json({
      message: `Request sent to join "${found.name}". The owner will be notified.`,
    });
  } catch (error) {
    console.error("sendJoinRequest error:", error);
    res.status(500).json({ message: "Failed to send join request" });
  }
};

// ── NEW: GET JOIN REQUESTS (for workspace owner) ───────────────
const getJoinRequests = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId)
      .populate("joinRequests.user", "name email avatar");

    if (!workspace) return res.status(404).json({ message: "Not found" });

    // Only owner can see requests
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(workspace.joinRequests);
  } catch (error) {
    res.status(500).json({ message: "Failed to get join requests" });
  }
};

// ── NEW: GET ALL PENDING REQUESTS FOR ALL MY WORKSPACES ────────
const getAllMyJoinRequests = async (req, res) => {
  try {
    // Find all workspaces owned by this user that have pending requests
    const workspaces = await Workspace.find({
      owner: req.user._id,
      "joinRequests.0": { $exists: true }, // has at least one request
    }).populate("joinRequests.user", "name email avatar");

    // Flatten into a simple list
    const requests = [];
    workspaces.forEach((ws) => {
      ws.joinRequests.forEach((req) => {
        requests.push({
          workspaceId:   ws._id,
          workspaceName: ws.name,
          user:          req.user,
          requestedAt:   req.requestedAt,
        });
      });
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to get requests" });
  }
};

// ── NEW: ACCEPT JOIN REQUEST ───────────────────────────────────
const acceptJoinRequest = async (req, res) => {
  try {
    const { workspaceId, userId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove from joinRequests
    workspace.joinRequests = workspace.joinRequests.filter(
      (r) => r.user.toString() !== userId.toString()
    );

    // Add to members
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === userId.toString()
    );
    if (!alreadyMember) {
      workspace.members.push({ user: userId, role: "member" });
    }

    await workspace.save();

    // Notify the accepted user via socket — they will reload workspaces
    const io = req.app.get("io");
    if (io) {
      io.to(userId.toString()).emit("workspaceRequestAccepted", {
        workspaceId:   workspace._id,
        workspaceName: workspace.name,
      });
    }

    res.json({ message: "User added to workspace successfully" });
  } catch (error) {
    console.error("acceptJoinRequest error:", error);
    res.status(500).json({ message: "Failed to accept request" });
  }
};

// ── NEW: REJECT JOIN REQUEST ───────────────────────────────────
const rejectJoinRequest = async (req, res) => {
  try {
    const { workspaceId, userId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove from joinRequests
    workspace.joinRequests = workspace.joinRequests.filter(
      (r) => r.user.toString() !== userId.toString()
    );
    await workspace.save();

    // Notify rejected user
    const io = req.app.get("io");
    if (io) {
      io.to(userId.toString()).emit("workspaceRequestRejected", {
        workspaceName: workspace.name,
      });
    }

    res.json({ message: "Request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject request" });
  }
};

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getOnlineUsers,
  deleteWorkspace,
  sendJoinRequest,
  getJoinRequests,
  getAllMyJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
};