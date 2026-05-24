const Message = require("../models/Message");
const Channel = require("../models/Channel");

const onlineUsers = new Set();

module.exports = (io) => {
  io.on("connection", (socket) => {

    // USER ONLINE — join personal room so DMs always reach them
    socket.on("userOnline", (userId) => {
      socket.userId = String(userId);
      onlineUsers.add(String(userId));
      socket.join(String(userId)); // ← personal room = their userId
      io.emit("userOnline", userId);
      io.emit("onlineUsersList", Array.from(onlineUsers));
    });

    socket.on("getOnlineUsers", () => {
      socket.emit("onlineUsersList", Array.from(onlineUsers));
    });

    // JOIN CHANNEL — null check to prevent members crash
    socket.on("joinChannel", async (channelId) => {
      try {
        if (!channelId) return;
        socket.join(String(channelId));
      } catch (err) {
        console.error("joinChannel error (handled):", err.message);
      }
    });

    // SEND MESSAGE
    socket.on("sendMessage", async (data) => {
      try {
        const senderId = socket.userId;
        if (!senderId || !data.channelId) return;

        const msg = await Message.create({
          content:      data.content     || "",
          channel:      data.channelId,
          sender:       senderId,
          threadParent: data.threadParent || null,
          fileData:     data.fileData    || null,
          fileName:     data.fileName    || null,
          fileType:     data.fileType    || null,
        });

        const populated = await Message.findById(msg._id)
          .populate("sender",  "name email avatar")
          .populate("channel", "name isDM members");

        // Emit to the channel room (both users who joined it)
        io.to(String(data.channelId)).emit("receiveMessage", populated);

        // EXTRA: For DM channels, also emit directly to each member's
        // personal room so they receive it even if they haven't clicked the DM
        const channel = await Channel.findById(data.channelId);
        if (channel && channel.isDM && channel.members) {
          channel.members.forEach(memberId => {
            io.to(String(memberId)).emit("receiveMessage", populated);
          });
        }

      } catch (err) {
        console.error("sendMessage error:", err.message);
      }
    });

    // TYPING
    socket.on("typing", (data) => {
      socket.to(String(data.channelId)).emit("userTyping", {
        name:   data.name,
        userId: data.userId,
      });
    });

    socket.on("stopTyping", (data) => {
      socket.to(String(data.channelId)).emit("userStopTyping");
    });

    // REACT — any user can react to any message
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
        console.error("reactMessage error:", err.message);
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("userOffline", socket.userId);
        io.emit("onlineUsersList", Array.from(onlineUsers));
      }
    });

  });
};