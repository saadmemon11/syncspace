const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const {
  getUsers,
  getMyProfile,
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
} = require("../controllers/userController");

router.get("/",                       auth, getUsers);
router.get("/me",                     auth, getMyProfile);       // ← NEW: reload profile
router.put("/profile",                auth, updateProfile);
router.post("/friend-request",        auth, sendFriendRequest);
router.post("/friend-request/accept", auth, acceptFriendRequest);
router.post("/friend-request/reject", auth, rejectFriendRequest);
router.get("/friends",                auth, getFriends);
router.get("/pending-requests",       auth, getPendingRequests);

module.exports = router;