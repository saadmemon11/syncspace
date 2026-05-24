import { useEffect, useState } from "react";
import API from "../../services/api";
import socket from "../../services/socket";

export default function ChannelList({ setSelectedChannel }) {

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // ── WORKSPACES ─────────────────────────────────────────────────
  const [workspaces,        setWorkspaces]        = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => localStorage.getItem("workspaceId") || null
  );
  const [loadingWS, setLoadingWS] = useState(true);

  // ── WORKSPACE MODALS ───────────────────────────────────────────
  const [showCreateWS, setShowCreateWS] = useState(false);
  const [showJoinWS,   setShowJoinWS]   = useState(false);
  const [newWSName,    setNewWSName]    = useState("");
  const [joinWSName,   setJoinWSName]   = useState("");
  const [wsMsg,        setWsMsg]        = useState("");

  // ── JOIN REQUESTS ──────────────────────────────────────────────
  const [joinRequests,     setJoinRequests]     = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);

  // ── CHANNELS ───────────────────────────────────────────────────
  const [channels,          setChannels]          = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [notifications,     setNotifications]     = useState({});
  const [showInput,         setShowInput]         = useState(false);
  const [newChannel,        setNewChannel]        = useState("");

  // ── USERS (DM list) ────────────────────────────────────────────
  // Stores full user objects including avatar so we can show profile pictures
  const [users, setUsers] = useState([]);

  // ── ADD FRIEND ─────────────────────────────────────────────────
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendInput,     setFriendInput]     = useState("");
  const [friendMsg,       setFriendMsg]       = useState("");

  // ═══════════════════════════════════════════════════════════════
  // LOAD ON MOUNT
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    loadWorkspaces();
    loadAllJoinRequests();
    loadUsers();
  }, []);

  const loadUsers = () => {
    API.get("/users").then(r => setUsers(r.data)).catch(console.error);
  };

  // ── SOCKET LISTENERS ───────────────────────────────────────────
  useEffect(() => {
    // Owner gets notified of join request
    socket.on("workspaceJoinRequest", (data) => {
      setJoinRequests(prev => [...prev, data]);
      setShowJoinRequests(true);
    });

    // This user's request was accepted
    socket.on("workspaceRequestAccepted", (data) => {
      alert(`Your request to join "${data.workspaceName}" was accepted!`);
      loadWorkspaces();
    });

    // This user's request was rejected
    socket.on("workspaceRequestRejected", (data) => {
      alert(`Your request to join "${data.workspaceName}" was rejected.`);
    });

    // Someone updated their profile — refresh user list so DM avatars update
    socket.on("userProfileUpdated", (updatedUser) => {
      setUsers(prev =>
        prev.map(u =>
          u._id === updatedUser.userId
            ? { ...u, name: updatedUser.name, avatar: updatedUser.avatar }
            : u
        )
      );
    });

    return () => {
      socket.off("workspaceJoinRequest");
      socket.off("workspaceRequestAccepted");
      socket.off("workspaceRequestRejected");
      socket.off("userProfileUpdated");
    };
  }, []);

  // Channel notification listener
  useEffect(() => {
    const handler = (msg) => {
      const msgChannelId = msg.channel?._id || msg.channel;
      if (String(msgChannelId) === String(selectedChannelId)) return;
      if (msg.threadParent) return;
      setNotifications(prev => ({
        ...prev,
        [msgChannelId]: (prev[msgChannelId] || 0) + 1,
      }));
    };
    socket.on("receiveMessage", handler);
    return () => socket.off("receiveMessage", handler);
  }, [selectedChannelId]);

  // ═══════════════════════════════════════════════════════════════
  // WORKSPACE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  const loadWorkspaces = async () => {
    try {
      setLoadingWS(true);
      const res = await API.get("/workspaces");
      setWorkspaces(res.data);
      if (!activeWorkspaceId && res.data.length > 0) {
        selectWorkspace(res.data[0]);
      } else if (activeWorkspaceId) {
        loadChannelsFor(activeWorkspaceId);
      }
    } catch (err) {
      console.error("loadWorkspaces:", err);
    } finally {
      setLoadingWS(false);
    }
  };

  const loadAllJoinRequests = async () => {
    try {
      const res = await API.get("/workspaces/join-requests");
      setJoinRequests(res.data);
    } catch {
      // Not an owner or no requests
    }
  };

  const selectWorkspace = (ws) => {
    localStorage.setItem("workspaceId", ws._id);
    setActiveWorkspaceId(ws._id);
    setSelectedChannel(null);
    setSelectedChannelId(null);
    setChannels([]);
    loadChannelsFor(ws._id);
  };

  const createWorkspace = async () => {
    if (!newWSName.trim()) return;
    try {
      const res = await API.post("/workspaces", { name: newWSName.trim() });
      setWorkspaces(prev => [...prev, res.data]);
      selectWorkspace(res.data);
      setNewWSName("");
      setShowCreateWS(false);
      setWsMsg("");
    } catch {
      setWsMsg("Failed to create workspace");
    }
  };

  const joinWorkspace = async () => {
    if (!joinWSName.trim()) return;
    setWsMsg("Sending request...");
    try {
      const res = await API.post("/workspaces/join-request", {
        workspaceName: joinWSName.trim(),
      });
      setWsMsg("✅ " + res.data.message);
      setJoinWSName("");
      setTimeout(() => {
        setWsMsg("");
        setShowJoinWS(false);
      }, 3000);
    } catch (err) {
      setWsMsg("❌ " + (err.response?.data?.message || "Workspace not found"));
    }
  };

  const deleteWorkspace = async (e, wsId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this workspace? All its channels will be lost.")) return;
    try {
      await API.delete(`/workspaces/${wsId}`);
      const updated = workspaces.filter(w => w._id !== wsId);
      setWorkspaces(updated);
      if (activeWorkspaceId === wsId) {
        if (updated.length > 0) {
          selectWorkspace(updated[0]);
        } else {
          setActiveWorkspaceId(null);
          localStorage.removeItem("workspaceId");
          setChannels([]);
          setSelectedChannel(null);
        }
      }
    } catch {
      alert("Failed to delete workspace");
    }
  };

  const acceptRequest = async (workspaceId, userId) => {
    try {
      await API.post("/workspaces/join-request/accept", { workspaceId, userId });
      setJoinRequests(prev =>
        prev.filter(r => !(
          String(r.workspaceId) === String(workspaceId) &&
          String(r.user?._id) === String(userId)
        ))
      );
    } catch {
      alert("Failed to accept request");
    }
  };

  const rejectRequest = async (workspaceId, userId) => {
    try {
      await API.post("/workspaces/join-request/reject", { workspaceId, userId });
      setJoinRequests(prev =>
        prev.filter(r => !(
          String(r.workspaceId) === String(workspaceId) &&
          String(r.user?._id) === String(userId)
        ))
      );
    } catch {
      alert("Failed to reject request");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // CHANNEL FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  const loadChannelsFor = async (wsId) => {
    if (!wsId) return;
    try {
      const res = await API.get(`/channels/${wsId}`);
      setChannels(res.data);
    } catch (err) {
      console.error("loadChannels:", err);
    }
  };

  const createChannel = async () => {
    if (!newChannel.trim() || !activeWorkspaceId) return;
    try {
      const res = await API.post("/channels", {
        name: newChannel.trim(),
        workspaceId: activeWorkspaceId,
      });
      setChannels(prev => [...prev, res.data]);
      setNewChannel("");
      setShowInput(false);
    } catch (err) {
      console.error("createChannel:", err);
    }
  };

  const deleteChannel = async (e, channelId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this channel?")) return;
    try {
      await API.delete(`/channels/${channelId}`);
      setChannels(prev => prev.filter(c => c._id !== channelId));
      if (selectedChannelId === channelId) {
        setSelectedChannel(null);
        setSelectedChannelId(null);
      }
    } catch (err) {
      alert("Could not delete: " + (err.response?.data?.message || err.message));
    }
  };

  const sendFriendRequest = async () => {
    if (!friendInput.trim()) return;
    try {
      await API.post("/users/friend-request", { to: friendInput.trim() });
      setFriendMsg("✅ Request sent!");
      setFriendInput("");
      setTimeout(() => { setFriendMsg(""); setShowFriendModal(false); }, 2000);
    } catch {
      setFriendMsg("❌ User not found");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="w-64 bg-[#0f172a] flex flex-col border-r border-gray-800 text-white h-full overflow-hidden">

      {/* ── LOGO — bigger and clearly visible ── */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-800 shrink-0">
        <img
          src="/logo.png"
          alt="SyncSpace"
          className="object-contain shrink-0"
          style={{ width: "42px", height: "42px" }}
        />
        <div>
          <p className="font-bold text-white text-base leading-tight">SyncSpace</p>
          <p className="text-xs text-gray-500 leading-tight">Collaborate · Connect</p>
        </div>
      </div>

      {/* ── WORKSPACES HEADER ── */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Workspaces
          </span>
          {joinRequests.length > 0 && (
            <button
              onClick={() => setShowJoinRequests(p => !p)}
              className="relative"
              title="Pending join requests"
            >
              <span className="text-yellow-400 text-sm">🔔</span>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {joinRequests.length}
              </span>
            </button>
          )}
        </div>

        {/* Create + Join buttons */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => { setShowCreateWS(true); setShowJoinWS(false); setWsMsg(""); }}
            className="flex-1 text-xs bg-purple-700 hover:bg-purple-600 text-white py-1.5 rounded-lg transition-colors font-medium"
          >
            + Create
          </button>
          <button
            onClick={() => { setShowJoinWS(true); setShowCreateWS(false); setWsMsg(""); }}
            className="flex-1 text-xs bg-[#1e293b] hover:bg-[#334155] text-white py-1.5 rounded-lg transition-colors font-medium border border-gray-700"
          >
            Join
          </button>
        </div>

        {/* Create form */}
        {showCreateWS && (
          <div className="mb-2 p-2 bg-[#1e293b] rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-1 font-medium">New Workspace Name</p>
            <input
              type="text"
              placeholder="e.g. Team Alpha"
              value={newWSName}
              onChange={e => setNewWSName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createWorkspace()}
              className="w-full p-1.5 rounded bg-[#0f172a] text-white outline-none text-sm border border-gray-700 mb-1.5"
              autoFocus
            />
            {wsMsg && <p className="text-xs text-red-400 mb-1">{wsMsg}</p>}
            <div className="flex gap-1">
              <button onClick={createWorkspace} className="flex-1 text-xs bg-purple-700 hover:bg-purple-600 text-white py-1 rounded">Create</button>
              <button onClick={() => { setShowCreateWS(false); setWsMsg(""); setNewWSName(""); }} className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 rounded">Cancel</button>
            </div>
          </div>
        )}

        {/* Join form */}
        {showJoinWS && (
          <div className="mb-2 p-2 bg-[#1e293b] rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-1 font-medium">Enter Workspace Name Exactly</p>
            <input
              type="text"
              placeholder="Type exact workspace name..."
              value={joinWSName}
              onChange={e => setJoinWSName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && joinWorkspace()}
              className="w-full p-1.5 rounded bg-[#0f172a] text-white outline-none text-sm border border-gray-700 mb-1.5"
              autoFocus
            />
            {wsMsg && (
              <p className={`text-xs mb-1 ${wsMsg.startsWith("✅") ? "text-green-400" : wsMsg === "Sending request..." ? "text-gray-400" : "text-red-400"}`}>
                {wsMsg}
              </p>
            )}
            <div className="flex gap-1">
              <button onClick={joinWorkspace} className="flex-1 text-xs bg-blue-700 hover:bg-blue-600 text-white py-1 rounded">Send Request</button>
              <button onClick={() => { setShowJoinWS(false); setWsMsg(""); setJoinWSName(""); }} className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 rounded">Cancel</button>
            </div>
          </div>
        )}

        {/* Join requests panel for workspace owners */}
        {showJoinRequests && joinRequests.length > 0 && (
          <div className="mb-2 p-2 bg-[#1e293b] rounded-lg border border-yellow-800">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">
                Join Requests ({joinRequests.length})
              </p>
              <button onClick={() => setShowJoinRequests(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {joinRequests.map((req, i) => (
                <div key={i} className="bg-[#0f172a] rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-700">
                      {req.user?.avatar ? (
                        <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {req.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">{req.user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        wants to join <span className="text-purple-400">{req.workspaceName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => acceptRequest(req.workspaceId, req.user?._id)}
                      className="flex-1 text-xs bg-green-700 hover:bg-green-600 text-white py-1 rounded"
                    >✓ Accept</button>
                    <button
                      onClick={() => rejectRequest(req.workspaceId, req.user?._id)}
                      className="flex-1 text-xs bg-red-800 hover:bg-red-700 text-white py-1 rounded"
                    >✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── WORKSPACE LIST ── */}
      <div className="px-2 max-h-36 overflow-y-auto shrink-0 space-y-0.5 pb-1">
        {loadingWS ? (
          <p className="text-xs text-gray-500 px-2 py-1">Loading...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-xs text-gray-500 px-2 py-1">
            No workspaces — create or join one above
          </p>
        ) : (
          workspaces.map(ws => {
            const isOwner =
              ws.owner?._id === currentUser._id ||
              ws.owner === currentUser._id;
            return (
              <div
                key={ws._id}
                onClick={() => selectWorkspace(ws)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                  activeWorkspaceId === ws._id
                    ? "bg-[#1e293b] text-white"
                    : "text-gray-400 hover:bg-[#1e293b] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-[#334155] flex items-center justify-center text-sm shrink-0 font-bold text-purple-400">
                    {ws.name?.[0]?.toUpperCase() || "W"}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{ws.name}</span>
                    {isOwner && <span className="text-xs text-purple-500">owner</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {activeWorkspaceId === ws._id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                  {isOwner && (
                    <button
                      onClick={e => deleteWorkspace(e, ws._id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs px-1 transition-opacity"
                    >✕</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-800 mx-3 my-1 shrink-0" />

      {/* ── CHANNELS ── */}
      <div className="px-3 py-1 text-xs text-gray-400 uppercase flex justify-between items-center shrink-0">
        <span>Channels</span>
        <button onClick={() => setShowInput(p => !p)} className="text-lg hover:text-white" title="New channel">+</button>
      </div>

      {showInput && (
        <div className="px-3 pb-2 shrink-0">
          <input
            type="text"
            placeholder="Channel name..."
            value={newChannel}
            onChange={e => setNewChannel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createChannel()}
            className="w-full p-2 rounded bg-[#1e293b] text-white outline-none text-sm"
            autoFocus
          />
          <button onClick={createChannel} className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 p-1.5 rounded text-sm">
            Create
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">
        {channels.length === 0 && activeWorkspaceId && (
          <p className="text-xs text-gray-500 px-2 py-1">No channels yet</p>
        )}
        {channels.map(channel => (
          <div
            key={channel._id}
            onClick={() => {
              setSelectedChannel({ ...channel, type: "channel" });
              setSelectedChannelId(channel._id);
              setNotifications(prev => ({ ...prev, [channel._id]: 0 }));
            }}
            className={`group flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${
              selectedChannelId === channel._id ? "bg-[#1e293b]" : "hover:bg-[#1e293b]"
            }`}
          >
            <span className="text-sm truncate"># {channel.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {notifications[channel._id] > 0 && (
                <span className="bg-red-500 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {notifications[channel._id]}
                </span>
              )}
              <button
                onClick={e => deleteChannel(e, channel._id)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs transition-opacity"
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── DIRECT MESSAGES — with real profile avatars ── */}
      <div className="px-3 py-2 text-xs text-gray-400 uppercase border-t border-gray-800 shrink-0">
        Direct Messages
      </div>
      <div className="px-2 space-y-0.5 max-h-32 overflow-y-auto shrink-0">
        {users.map(user => (
          <div
            key={user._id}
            onClick={async () => {
              try {
                const res = await API.post("/channels/dm", { userId: user._id });
                setSelectedChannel({
                  ...res.data,
                  type: "dm",
                  name: user.name,
                  otherUser: user,
                });
                setSelectedChannelId(res.data._id);
              } catch (err) {
                console.error(err);
              }
            }}
            className="px-2 py-1.5 rounded hover:bg-[#1e293b] cursor-pointer flex items-center gap-2 transition-colors"
          >
            {/* Real avatar or initial */}
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-700">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm truncate text-gray-300">{user.name}</span>
          </div>
        ))}
      </div>

      {/* ── ADD FRIEND ── */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        <button
          onClick={() => setShowFriendModal(true)}
          className="w-full bg-purple-700 hover:bg-purple-600 p-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Friend
        </button>
      </div>

      {/* ADD FRIEND MODAL */}
      {showFriendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Add Friend</h3>
              <button onClick={() => { setShowFriendModal(false); setFriendMsg(""); }} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <input
              type="text"
              placeholder="Enter username or email..."
              value={friendInput}
              onChange={e => setFriendInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendFriendRequest()}
              className="w-full p-2 rounded bg-[#0f172a] text-white outline-none text-sm border border-gray-700 mb-3"
              autoFocus
            />
            {friendMsg && (
              <p className={`text-sm mb-2 text-center ${friendMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                {friendMsg}
              </p>
            )}
            <button onClick={sendFriendRequest} className="w-full bg-purple-700 hover:bg-purple-600 p-2 rounded-lg text-sm font-medium">
              Send Request
            </button>
          </div>
        </div>
      )}

    </div>
  );
}