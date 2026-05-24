import { useEffect, useState } from "react";
import API from "../../services/api";
import socket from "../../services/socket";

export default function OnlineUser() {
  const [users,       setUsers]       = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Load all users with their avatar
  useEffect(() => {
    API.get("/users").then(res => setUsers(res.data)).catch(console.error);
  }, []);

  // Listen to online/offline socket events
  useEffect(() => {
    socket.emit("getOnlineUsers");

    socket.on("onlineUsersList", (list) => {
      setOnlineUsers(list.map(String));
    });

    socket.on("userOnline", (userId) => {
      setOnlineUsers(prev =>
        prev.includes(String(userId)) ? prev : [...prev, String(userId)]
      );
    });

    socket.on("userOffline", (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== String(userId)));
    });

    // When a user updates their profile name/avatar — refresh the list
    socket.on("userProfileUpdated", () => {
      API.get("/users").then(res => setUsers(res.data)).catch(console.error);
    });

    return () => {
      socket.off("onlineUsersList");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("userProfileUpdated");
    };
  }, []);

  const onlineCount = users.filter(u => onlineUsers.includes(String(u._id))).length;

  return (
    <div className="p-3 h-full flex flex-col">
      <h2 className="text-white font-semibold mb-1 shrink-0">Online Users</h2>
      <p className="text-xs text-gray-500 mb-3 shrink-0">
        {onlineCount} online · {users.length} total
      </p>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {users.map(user => {
          const isOnline = onlineUsers.includes(String(user._id));
          return (
            <div
              key={user._id}
              className="flex items-center justify-between bg-[#020617] p-2 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {/* Show real avatar if available, else first letter */}
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-700">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-white leading-tight">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {isOnline ? "🟢 Online" : "⚫ Offline"}
                  </p>
                </div>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isOnline ? "bg-green-500" : "bg-gray-600"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}