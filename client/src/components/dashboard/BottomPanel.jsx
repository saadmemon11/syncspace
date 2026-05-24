import { useState, useEffect, useRef } from "react";
import socket from "../../services/socket";
import API from "../../services/api";

function Card({ title, children }) {
  return (
    <div className="flex-1 min-w-0 bg-[#0f172a] border border-gray-800 rounded-xl p-3 flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 w-96 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BottomPanel({
  channelId,
  setSelectedChannel,
  setSelectedThread,
  currentUser,      // always use this prop — never read localStorage directly
  onProfileUpdate,
}) {
  // Keep userId in a ref so socket handlers always have the latest value
  // without needing to re-register the listeners
  const userIdRef = useRef(currentUser?._id);
  useEffect(() => {
    userIdRef.current = currentUser?._id;
  }, [currentUser?._id]);

  // NOTIFICATIONS card
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifs, setShowAllNotifs] = useState(false);

  // MESSAGES card
  const [recentMessages, setRecentMessages] = useState([]);

  // THREADS card
  const [recentThreads, setRecentThreads] = useState([]);

  // PROFILE edit modal
  const [showProfile, setShowProfile]     = useState(false);
  const [profileName, setProfileName]     = useState(currentUser?.name || "");
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatar || null);
  const [profileSaved, setProfileSaved]   = useState(false);
  const avatarInputRef = useRef(null);

  // FILE SHARE
  const fileShareRef = useRef(null);
  const [lastSharedFile, setLastSharedFile] = useState(null);

  // Sync profile fields when currentUser prop changes
  useEffect(() => {
    setProfileName(currentUser?.name || "");
    setProfileAvatar(currentUser?.avatar || null);
  }, [currentUser]);

  // ── SOCKET LISTENERS ─────────────────────────────────────────────
  // All handlers are named functions so they don't interfere with
  // Chat.jsx's listener (which also listens on receiveMessage)
  useEffect(() => {

    // MESSAGES CARD + NOTIFICATIONS CARD handler
    function bottomPanelMsgHandler(msg) {
      const myId = String(userIdRef.current || "");

      if (!msg.threadParent) {
        // Update MESSAGES card — show all messages live
        setRecentMessages(prev => {
          // Avoid duplicates
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [msg, ...prev].slice(0, 5);
        });

        // NOTIFICATION — only if message is from someone else
        const senderId = String(msg.sender?._id || "");
        if (senderId && myId && senderId !== myId) {
          const senderName = msg.sender?.name || "Someone";
          setNotifications(prev => [
            {
              id: Date.now() + Math.random(), // ensure unique
              text: senderName + " sent a message",
              detail: msg.content ? msg.content.slice(0, 40) : "Sent a file",
              avatar: senderName[0]?.toUpperCase() || "?",
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              channelId: msg.channel?._id || msg.channel,
            },
            ...prev,
          ].slice(0, 50));
        }
      } else {
        // THREADS CARD — reply received
        setRecentThreads(prev => {
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [msg, ...prev].slice(0, 5);
        });

        // Also notify about the thread reply if from someone else
        const senderId = String(msg.sender?._id || "");
        if (senderId && myId && senderId !== myId) {
          const senderName = msg.sender?.name || "Someone";
          setNotifications(prev => [
            {
              id: Date.now() + Math.random(),
              text: senderName + " replied to a thread",
              detail: msg.content ? msg.content.slice(0, 40) : "",
              avatar: senderName[0]?.toUpperCase() || "?",
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            ...prev,
          ].slice(0, 50));
        }
      }
    }

    // REACTION NOTIFICATION handler
    function bottomPanelReactionHandler(updatedMsg) {
      const myId = String(userIdRef.current || "");
      const msgOwnerId = String(updatedMsg.sender?._id || "");

      // Notify if someone reacted to MY message
      if (myId && msgOwnerId === myId) {
        const lastR = updatedMsg.reactions?.slice(-1)[0];
        if (lastR) {
          setNotifications(prev => [
            {
              id: Date.now() + Math.random(),
              text: "Someone reacted " + lastR.emoji + " to your message",
              detail: updatedMsg.content?.slice(0, 30) || "",
              avatar: lastR.emoji,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            ...prev,
          ].slice(0, 50));
        }
      }
    }

    // Register — these named functions won't conflict with Chat.jsx's listener
    socket.on("receiveMessage", bottomPanelMsgHandler);
    socket.on("messageReacted", bottomPanelReactionHandler);

    return () => {
      // Only remove OUR handlers — not any other file's handlers
      socket.off("receiveMessage", bottomPanelMsgHandler);
      socket.off("messageReacted", bottomPanelReactionHandler);
    };
  }, []); // register once — userId comes from ref

  // ── PROFILE HANDLERS ─────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setProfileAvatar(reader.result);
    reader.readAsDataURL(f);
  };

  const saveProfile = async () => {
    try {
      const res = await API.put("/users/profile", {
        name:   profileName,
        avatar: profileAvatar,
      });
      const updatedUser = {
        ...currentUser,
        name:   res.data.name,
        avatar: res.data.avatar,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (onProfileUpdate) onProfileUpdate(updatedUser); // updates ChatHeader avatar
      setProfileSaved(true);
      setTimeout(() => {
        setProfileSaved(false);
        setShowProfile(false);
      }, 1500);
    } catch {
      alert("Could not save profile. Please try again.");
    }
  };

  // ── FILE SHARE ────────────────────────────────────────────────────
  const handleFileShare = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!channelId) {
      alert("Please select a channel first before sharing a file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const id = String(channelId?._id || channelId);
      socket.emit("sendMessage", {
        content:   "",
        channelId: id,
        fileData:  reader.result,
        fileName:  f.name,
        fileType:  f.type,
      });
      setLastSharedFile(f.name);
      setTimeout(() => setLastSharedFile(null), 3000);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const displayAvatar = currentUser?.avatar || null;

  return (
    <div className="w-full px-4 pb-3 pt-2 shrink-0">
      <div className="flex gap-2">

        {/* ── 1. NOTIFICATIONS ── */}
        <Card title="Notifications">
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-500">No notifications yet</p>
          ) : (
            notifications.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 cursor-pointer hover:opacity-80"
                onClick={() => {
                  if (n.channelId && setSelectedChannel) {
                    setSelectedChannel({ _id: n.channelId });
                  }
                }}
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shrink-0 mt-0.5">
                  {n.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 truncate">{n.text}</p>
                  {n.detail && (
                    <p className="text-xs text-gray-500 truncate">{n.detail}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setShowAllNotifs(true)}
              className="text-xs text-purple-400 hover:text-purple-300 mt-1"
            >
              View All ({notifications.length})
            </button>
          )}
        </Card>

        {/* ── 2. MESSAGES ── */}
        <Card title="Messages">
          {recentMessages.length === 0 ? (
            <p className="text-xs text-gray-500">No messages yet</p>
          ) : (
            recentMessages.slice(0, 3).map((m, i) => (
              <div
                key={m._id || i}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                onClick={() => {
                  const cId = m.channel?._id || m.channel;
                  if (cId && setSelectedChannel) {
                    setSelectedChannel({ _id: cId });
                  }
                }}
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs shrink-0 font-bold">
                  {m.sender?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {m.sender?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {m.content?.slice(0, 28) || "📎 File"}
                  </p>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* ── 3. THREADS ── */}
        <Card title="Threads">
          {recentThreads.length === 0 ? (
            <p className="text-xs text-gray-500">No replies yet</p>
          ) : (
            recentThreads.slice(0, 3).map((t, i) => (
              <div
                key={t._id || i}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                onClick={() => {
                  if (setSelectedThread) {
                    setSelectedThread({
                      parent: { _id: t.threadParent, content: "Thread" },
                      replies: [t],
                    });
                    window.dispatchEvent(new Event("openThreads"));
                  }
                }}
              >
                <div className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white text-xs shrink-0 font-bold">
                  {t.sender?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {t.sender?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    ↳ {t.content?.slice(0, 25) || "📎 File"}
                  </p>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* ── 4. FILE SHARE ── */}
        <Card title="File Share">
          <p className="text-xs text-gray-500 leading-tight">
            Send a file to the current channel
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => fileShareRef.current?.click()}
              className="w-10 h-10 bg-red-700 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
              title="Share PDF"
            >
              <span className="text-white text-xs font-bold">PDF</span>
            </button>
            <button
              onClick={() => fileShareRef.current?.click()}
              className="w-10 h-10 bg-teal-700 hover:bg-teal-600 rounded-lg flex items-center justify-center text-lg transition-colors"
              title="Share Image"
            >
              🖼️
            </button>
            <button
              onClick={() => fileShareRef.current?.click()}
              className="w-10 h-10 bg-blue-700 hover:bg-blue-600 rounded-lg flex items-center justify-center text-lg transition-colors"
              title="Share any file"
            >
              📁
            </button>
          </div>
          <input
            ref={fileShareRef}
            type="file"
            hidden
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.txt,.zip"
            onChange={handleFileShare}
          />
          {lastSharedFile ? (
            <p className="text-xs text-green-400 truncate mt-1">
              ✅ Sent: {lastSharedFile}
            </p>
          ) : (
            <p className="text-xs text-gray-600 mt-1">Click icon to send</p>
          )}
        </Card>

        {/* ── 5. PROFILE ── */}
        <Card title="Profile">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-purple-600 hover:border-purple-400 transition shrink-0"
              onClick={() => setShowProfile(true)}
              title="Edit profile"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {currentUser?.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-white text-center truncate w-full">
              {currentUser?.name || "User"}
            </p>
            <button
              onClick={() => setShowProfile(true)}
              className="w-full px-2 py-1 text-xs font-medium text-white bg-gradient-to-r from-purple-700 to-purple-600 rounded-lg hover:opacity-90 transition"
            >
              Edit Profile
            </button>
          </div>
        </Card>

      </div>

      {/* ── ALL NOTIFICATIONS MODAL ── */}
      {showAllNotifs && (
        <Modal title="All Notifications" onClose={() => setShowAllNotifs(false)}>
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm">No notifications yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 bg-[#0f172a] rounded-lg cursor-pointer hover:bg-[#1e293b]"
                  onClick={() => {
                    if (n.channelId && setSelectedChannel) {
                      setSelectedChannel({ _id: n.channelId });
                      setShowAllNotifs(false);
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm shrink-0">
                    {n.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white">{n.text}</p>
                    {n.detail && (
                      <p className="text-xs text-gray-400 truncate">{n.detail}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {showProfile && (
        <Modal title="Edit Profile" onClose={() => setShowProfile(false)}>
          <div className="space-y-4">

            {/* Avatar with click to change */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 rounded-full overflow-hidden cursor-pointer border-2 border-purple-500 hover:border-purple-400 transition"
                onClick={() => avatarInputRef.current?.click()}
                title="Click to change photo"
              >
                {profileAvatar ? (
                  <img
                    src={profileAvatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profileName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                📷 Change Photo
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#0f172a] text-white outline-none text-sm border border-gray-700"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Email (read only)
              </label>
              <input
                type="text"
                value={currentUser?.email || ""}
                readOnly
                className="w-full p-2 rounded-lg bg-[#0a0f1e] text-gray-500 text-sm border border-gray-800 cursor-not-allowed"
              />
            </div>

            {profileSaved && (
              <p className="text-green-400 text-sm text-center">✅ Profile saved!</p>
            )}

            <button
              onClick={saveProfile}
              className="w-full bg-gradient-to-r from-purple-700 to-purple-600 hover:opacity-90 p-2 rounded-lg text-white text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}