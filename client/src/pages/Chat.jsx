import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";
import API from "../services/api";

import AppLayout    from "../components/layout/AppLayout";
import ChatHeader   from "../components/chat/ChatHeader";
import MessageList  from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import BottomPanel  from "../components/dashboard/BottomPanel";

export default function Chat() {

  const [selectedThread, setSelectedThread]             = useState(null);
  const [selectedChannel, setSelectedChannel]           = useState(null);
  const [onlineUsers, setOnlineUsers]                   = useState([]);
  const [replyTo, setReplyTo]                           = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [allMessages, setAllMessages]                   = useState([]);
  const [notifCount, setNotifCount]                     = useState(0);

  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("user") || "{}")
  );

  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Load fresh profile from server on mount
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    API.get("/users/me")
      .then(res => {
        localStorage.setItem("user", JSON.stringify(res.data));
        setCurrentUser(res.data);
      })
      .catch(console.error);
  }, []);

  // Tell server this user is online
  useEffect(() => {
    if (currentUser?._id) {
      socket.emit("userOnline", currentUser._id);
    }
  }, [currentUser?._id]);

  // Bell notification counter
  // Uses a REF-based handler so it never conflicts with BottomPanel's listener
  const currentUserIdRef = useRef(currentUser?._id);
  useEffect(() => {
    currentUserIdRef.current = currentUser?._id;
  }, [currentUser?._id]);

  useEffect(() => {
    // Named function — only this exact function will be removed on cleanup
    function chatBellHandler(msg) {
      const senderId = String(msg.sender?._id || msg.sender || "");
      const myId     = String(currentUserIdRef.current || "");
      // Only count if message is from someone else
      if (senderId && myId && senderId !== myId) {
        setNotifCount(p => p + 1);
      }
    }

    socket.on("receiveMessage", chatBellHandler);

    // This only removes chatBellHandler, not BottomPanel's handler
    return () => socket.off("receiveMessage", chatBellHandler);
  }, []); // empty deps — register once, use ref for userId

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    setHighlightedMessageId(thread?.parent?._id || null);
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AppLayout setSelectedChannel={setSelectedChannel} selectedThread={selectedThread}>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Chat box */}
        <div className="flex-1 flex justify-center min-h-0 px-4 pt-3">
          <div
            className="w-full max-w-3xl flex flex-col min-h-0 rounded-xl border overflow-hidden shadow-xl"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
            }}
          >
            <ChatHeader
              channel={selectedChannel}
              messages={allMessages}
              notifCount={notifCount}
              onBellClick={() => setNotifCount(0)}
              currentUser={currentUser}
              onProfileUpdate={handleProfileUpdate}
            />

            <div className="flex-1 overflow-y-auto min-h-0">
              <MessageList
                channelId={selectedChannel?._id}
                setReplyTo={setReplyTo}
                inputRef={inputRef}
                setOnlineUsersGlobal={setOnlineUsers}
                setSelectedThread={handleThreadSelect}
                highlightedMessageId={highlightedMessageId}
                onMessagesChange={setAllMessages}
                currentUser={currentUser}
              />
            </div>

            <MessageInput
              channelId={selectedChannel?._id}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              inputRef={inputRef}
              currentUser={currentUser}
            />
          </div>
        </div>

        <BottomPanel
          channelId={selectedChannel?._id}
          setSelectedChannel={setSelectedChannel}
          setSelectedThread={handleThreadSelect}
          currentUser={currentUser}
          onProfileUpdate={handleProfileUpdate}
        />

      </div>

    </AppLayout>
  );
}