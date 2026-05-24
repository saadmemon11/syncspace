const Notification = require("../models/Notification");

// GET USER NOTIFICATIONS
const getNotifications = async (req, res) => {

  try {

    const notifications = await Notification.find({
      user: req.user._id
    })
    .populate("message")
    .populate("channel","name")
    .sort({ createdAt: -1 });

    res.json(notifications);

  } catch (error) {

    res.status(500).json({ message: "Failed to fetch notifications" });

  }

};

// MARK NOTIFICATION AS READ
const markNotificationRead = async (req,res) => {

  try {

    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { read: true },
      { new: true }
    );

    res.json(notification);

  } catch (error) {

    res.status(500).json({ message: "Failed to update notification" });

  }

};

module.exports = {
  getNotifications,
  markNotificationRead
};