const Message = require("../models/Message");
const Channel = require("../models/Channel");
const Workspace = require("../models/Workspace");
const Notification = require("../models/Notification");
const User = require("../models/User");

// SEND MESSAGE
const sendMessage = async (req, res) => {
  try {
    const { content, channelId, threadParent, fileData, fileName, fileType } = req.body;

    const channelExists = await Channel.findById(channelId);
    if (!channelExists) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const message = await Message.create({
      content:      content      || "",
      sender:       req.user._id,
      channel:      channelId,
      threadParent: threadParent || null,
      fileData:     fileData     || null,   // ← added
      fileName:     fileName     || null,   // ← added
      fileType:     fileType     || null,   // ← added
    });

    const populatedMessage = await message.populate("sender", "name email avatar");

    // 🔔 DETECT @MENTIONS
if (content) {

  const mentionMatches = content.match(/@(\w+)/g);

  if (mentionMatches) {

    for (const mention of mentionMatches) {

      const username = mention.replace("@", "");

      const mentionedUser = await User.findOne({ name: username });

      if (mentionedUser) {

        await Notification.create({
          user: mentionedUser._id,
          message: message._id,
          workspace: channelExists.workspace,
          channel: channelId,
          type: "mention"
        });

      }

    }

  }

}

    // CREATE NOTIFICATIONS FOR CHANNEL MEMBERS
const workspace = await Workspace.findById(channelExists.workspace);

for (const member of workspace.members) {

  if (member.user.toString() !== req.user._id.toString()) {

    const notification = await Notification.create({
  user: member.user,
  message: message._id,
  workspace: workspace._id,
  channel: channelExists._id,
  type: "message"
});

// 🔥 SEND REALTIME NOTIFICATION
const io = req.app.get("io");
io.to(member.user.toString()).emit("newNotification", notification);

  }

}

    // 🔥 Emit real-time event
    const io = req.app.get("io");
    io.to(channelId).emit("receiveMessage", populatedMessage);

    res.status(201).json(populatedMessage);

  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
};

// GET MESSAGES BY CHANNEL
const getChannelMessages = async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.channelId })
      .populate("sender", "name email avatar")  // added avatar
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// EDIT MESSAGE
const editMessage = async (req, res) => {
  try {

    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can edit
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to edit this message" });
    }

    message.content = content;
    message.edited = true;

    await message.save();

    const populatedMessage = await message.populate("sender", "name email");

    // 🔥 Emit socket update
    const io = req.app.get("io");
    io.to(message.channel.toString()).emit("messageEdited", populatedMessage);

    res.json(populatedMessage);

  } catch (error) {
    res.status(500).json({ message: "Failed to edit message" });
  }
};

// DELETE MESSAGE
const deleteMessage = async (req, res) => {
  try {

    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // 🔥 Only sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to delete this message" });
    }

    await message.deleteOne();

    // 🔥 Emit realtime delete
    const io = req.app.get("io");
    io.to(message.channel.toString()).emit("messageDeleted", {
      messageId
    });

    res.json({ message: "Message deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" });
  }
};

// ADD REACTION
const reactToMessage = async (req, res) => {
  try {

    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Add reaction
    message.reactions.push({
      emoji,
      user: req.user._id
    });

    await message.save();

    const populatedMessage = await message.populate("sender", "name email");

    // 🔥 emit realtime update
    const io = req.app.get("io");
    io.to(message.channel.toString()).emit("messageReaction", populatedMessage);

    res.json(populatedMessage);

  } catch (error) {
    res.status(500).json({ message: "Failed to react to message" });
  }
};

// SEND FILE MESSAGE
const sendFileMessage = async (req, res) => {
  try {
    const { channelId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const message = await Message.create({
  content: "",
  sender: req.user._id,
  channel: channelId,
  file: req.file.filename
});

    const populatedMessage = await message.populate("sender", "name email");

    const io = req.app.get("io");
   io.to(channelId.toString()).emit("receiveMessage", populatedMessage);

    res.status(201).json(populatedMessage);

  } catch (error) {
    console.log(error);   // VERY IMPORTANT
    res.status(500).json({ message: "File upload failed" });
  }
};

// MARK MESSAGE AS READ
const markMessageAsRead = async (req, res) => {
  try {

    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      {
        $addToSet: { readBy: req.user._id }
      },
      { new: true }
    ).populate("readBy", "name email");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json(message);

  } catch (error) {
    res.status(500).json({ message: "Failed to mark message as read" });
  }
};

// REPLY TO MESSAGE (THREAD)
const replyToMessage = async (req, res) => {
  try {

    const { content, channelId, parentMessageId } = req.body;

    const parentMessage = await Message.findById(parentMessageId);

    if (!parentMessage) {
      return res.status(404).json({ message: "Parent message not found" });
    }

    const reply = await Message.create({
      content,
      sender: req.user._id,
      channel: channelId,
      threadParent: parentMessageId
    });

    const populatedReply = await reply.populate("sender", "name email");

    const io = req.app.get("io");

    io.to(channelId).emit("newThreadReply", populatedReply);

    res.status(201).json(populatedReply);

  } catch (error) {
    res.status(500).json({ message: "Failed to send reply" });
  }
};

module.exports = {
  sendMessage,
  getChannelMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  sendFileMessage,
  markMessageAsRead,
  replyToMessage
};