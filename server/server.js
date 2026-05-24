require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));        // ← big limit for base64 files
app.use(express.urlencoded({ limit: "50mb", extended: true }));

console.log("MONGO_URI:", process.env.MONGO_URI);
connectDB();

const authRoutes         = require("./routes/authRoutes");
const workspaceRoutes    = require("./routes/workspaceRoutes");
const channelRoutes      = require("./routes/channelRoutes");
const messageRoutes      = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes         = require("./routes/userRoutes");
const Message            = require("./models/Message");

app.use("/api/auth",          authRoutes);
app.use("/api/workspaces",    workspaceRoutes);
app.use("/api/channels",      channelRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users",         userRoutes);

app.get("/", (req, res) => res.send("🚀 SyncSpace backend running"));

const PORT = process.env.PORT || 5000;
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 50 * 1024 * 1024  // 50MB — allows large PDF/image base64
});
app.set("io", io);

const jwt       = require("jsonwebtoken");
const Channel   = require("./models/Channel");
const Workspace = require("./models/Workspace");

// Auth middleware for socket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", async (socket) => {

  // Join global room + personal room (for DMs)
  socket.join("global");
  socket.join(socket.user.id);   // ← personal room = their userId

  await User.findByIdAndUpdate(socket.user.id, { isOnline: true });
  console.log("🟢 Online:", socket.user.id);

  io.to("global").emit("userOnline", socket.user.id);

  // ── JOIN NOTIFICATION ROOM ─────────────────────────────
  socket.on("joinNotificationRoom", (userId) => {
    socket.join(userId);
  });

  // ── JOIN CHANNEL ───────────────────────────────────────
  socket.on("joinChannel", async (channelId, callback) => {
    try {
      if (!channelId) {
        if (callback) callback({ success: false, message: "No channelId" });
        return;
      }

      const channel = await Channel.findById(channelId);

      if (!channel) {
        if (callback) callback({ success: false, message: "Channel not found" });
        return;
      }

      // DM channel — check membership
      if (channel.type === "dm") {
        // members may be empty — just allow join if channel exists
        const members = channel.members || [];
        const isMember = members.length === 0 ||
          members.some(m => m.toString() === socket.user.id);

        if (!isMember) {
          if (callback) callback({ success: false, message: "Not part of DM" });
          return;
        }
      } else {
        // Workspace channel — check workspace membership
        // workspace could be null for old DMs created with isDM flag
        if (channel.workspace) {
          const workspace = await Workspace.findById(channel.workspace);
          if (workspace && workspace.members && workspace.members.length > 0) {
            const isMember = workspace.members.some(
              m => m.user && m.user.toString() === socket.user.id
            );
            if (!isMember) {
              if (callback) callback({ success: false, message: "Not a workspace member" });
              return;
            }
          }
        }
      }

      socket.join(channelId);
      console.log(`User ${socket.user.id} joined channel: ${channelId}`);
      if (callback) callback({ success: true });

    } catch (error) {
      console.log("Join error (handled):", error.message);
      if (callback) callback({ success: false, message: "Join failed" });
    }
  });

  // ── SEND MESSAGE ───────────────────────────────────────
  socket.on("sendMessage", async (data) => {
    try {
      if (!data.channelId) return;

      const message = await Message.create({
        content:      data.content      || "",
        sender:       socket.user.id,
        channel:      data.channelId,
        threadParent: data.threadParent || null,
        fileData:     data.fileData     || null,
        fileName:     data.fileName     || null,
        fileType:     data.fileType     || null,
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender",  "name email avatar")
        .populate("channel", "name type members");

      // Emit to channel room
      io.to(data.channelId).emit("receiveMessage", populatedMessage);

      // For DM: also emit directly to each member's personal room
      // so they receive even if they haven't opened this DM yet
      const channel = await Channel.findById(data.channelId);
      if (channel && channel.type === "dm" && channel.members) {
        channel.members.forEach(memberId => {
    // Only emit to the OTHER person's personal room, not the sender
    // Sender already got it from io.to(channelId) above
      if (String(memberId) !== String(socket.user.id)) {
      io.to(String(memberId)).emit("receiveMessage", populatedMessage);
      }
      });
      }

      // Thread emit
      if (data.threadParent) {
        io.to(data.channelId).emit("receiveThreadMessage", populatedMessage);
      }

      console.log("💬 Message saved:", populatedMessage.content || "[file]");

    } catch (error) {
      console.log("Message error:", error.message);
    }
  });

  // ── TYPING ─────────────────────────────────────────────
  // Only send to OTHERS — not back to sender
  socket.on("typing", async (data) => {
    const user = await User.findById(socket.user.id).select("name");
    const payload = { userId: socket.user.id, name: user?.name || "User" };
    socket.to(data.channelId).emit("userTyping", payload);  // socket.to = exclude sender
  });

  socket.on("stopTyping", (data) => {
    socket.to(data.channelId).emit("userStopTyping");
  });

  // ── REACT ──────────────────────────────────────────────
  socket.on("reactMessage", async ({ messageId, emoji, userId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const existingIdx = msg.reactions.findIndex(r => r.emoji === emoji);

      if (existingIdx >= 0) {
        const alreadyReacted = msg.reactions[existingIdx].users
          .map(String).includes(String(userId));

        if (alreadyReacted) {
          msg.reactions[existingIdx].users = msg.reactions[existingIdx].users
            .filter(u => String(u) !== String(userId));
          if (msg.reactions[existingIdx].users.length === 0) {
            msg.reactions.splice(existingIdx, 1);
          }
        } else {
          msg.reactions[existingIdx].users.push(userId);
        }
      } else {
        msg.reactions.push({ emoji, users: [userId] });
      }

      await msg.save();
      const updated = await Message.findById(messageId)
        .populate("sender", "name email avatar");

      io.emit("messageReacted", updated);
    } catch (err) {
      console.log("reactMessage error:", err.message);
    }
  });

  // ── DISCONNECT ─────────────────────────────────────────
  socket.on("disconnect", async () => {
    await User.findByIdAndUpdate(socket.user.id, { isOnline: false });
    console.log("⚫ Offline:", socket.user.id);
    io.to("global").emit("userOffline", socket.user.id);
  });

});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});