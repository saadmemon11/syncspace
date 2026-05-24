const express = require("express");
const router  = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createWorkspace,
  getMyWorkspaces,
  getOnlineUsers,
  deleteWorkspace,
  sendJoinRequest,
  getJoinRequests,
  getAllMyJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} = require("../controllers/workspaceController");

router.post("/",                          protect, createWorkspace);
router.get("/",                           protect, getMyWorkspaces);
router.get("/join-requests",              protect, getAllMyJoinRequests);  // owner sees all pending
router.get("/:workspaceId/online-users",  protect, getOnlineUsers);
router.get("/:workspaceId/join-requests", protect, getJoinRequests);
router.delete("/:workspaceId",            protect, deleteWorkspace);
router.post("/join-request",              protect, sendJoinRequest);       // user sends request
router.post("/join-request/accept",       protect, acceptJoinRequest);     // owner accepts
router.post("/join-request/reject",       protect, rejectJoinRequest);     // owner rejects

module.exports = router;