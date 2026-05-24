import { useEffect, useState, useRef } from "react";
import API from "../../services/api";
import socket from "../../services/socket";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏", "✅", "🚀"];

// ── File preview component ────────────────────────────────────────
function FilePreview({ msg }) {
  if (!msg.fileData) return null;

  const isImage = msg.fileType && msg.fileType.startsWith("image/");
  const isPDF   = msg.fileType === "application/pdf";

  if (isImage) {
    return (
      <div style={{ marginTop: "8px" }}>
        <img
          src={msg.fileData}
          alt={msg.fileName || "image"}
          onClick={() => window.open(msg.fileData, "_blank")}
          style={{
            maxWidth: "260px",
            maxHeight: "200px",
            borderRadius: "10px",
            cursor: "pointer",
            display: "block",
            objectFit: "cover",
          }}
          title="Click to view full size"
        />
        <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
          {msg.fileName}
        </p>
      </div>
    );
  }

  if (isPDF) {
    return (
      <div
        onClick={() => window.open(msg.fileData, "_blank")}
        style={{
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 12px",
          backgroundColor: "#450a0a",
          border: "1px solid #991b1b",
          borderRadius: "10px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#dc2626",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "white", fontSize: "10px", fontWeight: "bold" }}>
            PDF
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: "white", fontSize: "13px", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {msg.fileName || "document.pdf"}
          </p>
          <p style={{ color: "#fca5a5", fontSize: "11px", margin: 0 }}>
            Click to open
          </p>
        </div>
      </div>
    );
  }

  // Other files
  const icons = { zip: "🗜️", rar: "🗜️", doc: "📝", docx: "📝", txt: "📄", mp4: "🎬", mp3: "🎵" };
  const ext  = msg.fileName?.split(".").pop()?.toLowerCase() || "";
  const icon = icons[ext] || "📎";

  return (
    <a
      href={msg.fileData}
      download={msg.fileName || "file"}
      style={{
        marginTop: "8px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        backgroundColor: "#172554",
        border: "1px solid #1e40af",
        borderRadius: "10px",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          backgroundColor: "#1d4ed8",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "18px",
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: "white", fontSize: "13px", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {msg.fileName || "file"}
        </p>
        <p style={{ color: "#93c5fd", fontSize: "11px", margin: 0 }}>
          Click to download
        </p>
      </div>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function MessageList({
  channelId,
  setReplyTo,
  inputRef,
  setOnlineUsersGlobal,
  setSelectedThread,
  highlightedMessageId,
  onMessagesChange,
  currentUser,
}) {
  const [messages,     setMessages]     = useState([]);
  const [typingUser,   setTypingUser]   = useState(null);
  const [openMenuId,   setOpenMenuId]   = useState(null);
  const [showEmojiFor, setShowEmojiFor] = useState(null);

  const bottomRef     = useRef(null);
  const currentUserId =
    currentUser?._id ||
    JSON.parse(localStorage.getItem("user") || "{}")?._id;

  // ── Load messages from API ──────────────────────────────────────
  const loadMessages = async () => {
    if (!channelId) return;
    try {
      const res = await API.get("/messages/channel/" + channelId);
      setMessages(res.data);
    } catch (err) {
      console.error("loadMessages error:", err.message);
    }
  };

  // Report messages up to Chat.jsx (used by search)
  useEffect(() => {
    if (onMessagesChange) onMessagesChange(messages);
  }, [messages]);

  // ── Channel change — join room and listen for messages ──────────
  useEffect(() => {
    if (!channelId) return;

    setMessages([]);
    setTypingUser(null);
    loadMessages();

    const id = String(channelId);
    socket.emit("joinChannel", id);

    // ⚠️ KEY FIX: Define handler as named function
    // NEVER use socket.off("receiveMessage") without a handler arg —
    // that removes ALL listeners including notification handlers in
    // Chat.jsx and BottomPanel.jsx
    function messageListReceiveHandler(msg) {
      const msgChannelId = String(msg.channel?._id || msg.channel);
      if (msgChannelId !== id) return;
      setMessages((prev) => {
        // Avoid duplicate messages
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    }

    socket.on("receiveMessage", messageListReceiveHandler);

    // Cleanup: only remove THIS handler, not others
    return () => {
      socket.off("receiveMessage", messageListReceiveHandler);
    };
  }, [channelId]);

  // ── Typing indicator ────────────────────────────────────────────
  useEffect(() => {
    function typingHandler(data) {
      // Don't show typing indicator to the person who is typing
      if (String(data.userId) === String(currentUserId)) return;
      setTypingUser(data.name);
    }
    function stopTypingHandler() {
      setTypingUser(null);
    }

    socket.on("userTyping",     typingHandler);
    socket.on("userStopTyping", stopTypingHandler);

    return () => {
      socket.off("userTyping",     typingHandler);
      socket.off("userStopTyping", stopTypingHandler);
    };
  }, [currentUserId]);

  // ── Reactions — update message instantly ───────────────────────
  useEffect(() => {
    function reactionHandler(updated) {
      setMessages((prev) =>
        prev.map((m) => (m._id === updated._id ? { ...updated } : m))
      );
    }
    socket.on("messageReacted", reactionHandler);
    return () => socket.off("messageReacted", reactionHandler);
  }, []);

  // ── Auto scroll to latest message ──────────────────────────────
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Message actions ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await API.delete("/messages/" + id);
      setMessages((prev) => prev.filter((m) => m._id !== id));
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (msg) => {
    const newText = prompt("Edit message:", msg.content);
    if (!newText || newText === msg.content) return;
    try {
      const res = await API.put("/messages/" + msg._id, { content: newText });
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? res.data : m))
      );
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = (messageId, emoji) => {
    socket.emit("reactMessage", { messageId, emoji, userId: currentUserId });
    setShowEmojiFor(null);
    setOpenMenuId(null);
  };

  const mainMessages = messages.filter((m) => !m.threadParent);
  const replies      = messages.filter((m) =>  m.threadParent);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="px-4 py-4 pb-6 space-y-4"
      onClick={() => {
        setOpenMenuId(null);
        setShowEmojiFor(null);
      }}
    >
      {mainMessages.length === 0 && (
        <p className="text-center text-gray-500 text-sm mt-10">
          No messages yet. Say hello! 👋
        </p>
      )}

      {mainMessages.map((main) => {
        const isMe = String(main.sender?._id) === String(currentUserId);
        const childReplies = replies.filter(
          (r) => String(r.threadParent) === String(main._id)
        );
        const isHighlighted = main._id === highlightedMessageId;

        return (
          <div key={main._id} id={"msg-" + main._id} className="group">
            <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div style={{ maxWidth: "320px" }}>

                <p className="text-xs text-gray-400 mb-1">{main.sender?.name}</p>

                <div className="relative">
                  {/* Message bubble */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setSelectedThread) {
                        setSelectedThread({ parent: main, replies: childReplies });
                      }
                      window.dispatchEvent(new Event("openThreads"));
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      backgroundColor: isMe ? "#2563eb" : "#1e293b",
                      color: "white",
                      outline: isHighlighted ? "2px solid #7c3aed" : "none",
                    }}
                  >
                    {main.content && main.content.length > 0 && (
                      <p style={{ margin: 0 }}>{main.content}</p>
                    )}
                    <FilePreview msg={main} />
                  </div>

                  {/* Three dots button — shown on hover */}
                  <div
                    className="absolute -top-3 right-0 hidden group-hover:flex"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === main._id ? null : main._id)
                      }
                      style={{
                        backgroundColor: "#374151",
                        color: "white",
                        border: "1px solid #4b5563",
                        borderRadius: "999px",
                        padding: "1px 8px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      •••
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {openMenuId === main._id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        top: "28px",
                        [isMe ? "right" : "left"]: 0,
                        backgroundColor: "#1e293b",
                        border: "1px solid #374151",
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                        zIndex: 50,
                        minWidth: "160px",
                        padding: "4px 0",
                      }}
                    >
                      {/* Edit & Delete — own messages only */}
                      {isMe && (
                        <>
                          <button
                            onClick={() => handleEdit(main)}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#334155")}
                            onMouseOut={(e)  => (e.currentTarget.style.backgroundColor = "transparent")}
                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 16px", background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "13px", textAlign: "left" }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(main._id)}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#334155")}
                            onMouseOut={(e)  => (e.currentTarget.style.backgroundColor = "transparent")}
                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 16px", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "13px", textAlign: "left" }}
                          >
                            🗑️ Delete
                          </button>
                          <div style={{ borderTop: "1px solid #374151", margin: "4px 0" }} />
                        </>
                      )}

                      {/* React — available for ALL messages */}
                      <button
                        onClick={() =>
                          setShowEmojiFor(showEmojiFor === main._id ? null : main._id)
                        }
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#334155")}
                        onMouseOut={(e)  => (e.currentTarget.style.backgroundColor = "transparent")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 16px", background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "13px", textAlign: "left" }}
                      >
                        😊 React
                      </button>

                      {showEmojiFor === main._id && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px 12px 10px" }}>
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(main._id, emoji)}
                              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "2px" }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reactions row */}
                {main.reactions &&
                  main.reactions.filter((r) => r.users && r.users.length > 0).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                      {main.reactions
                        .filter((r) => r.users && r.users.length > 0)
                        .map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleReact(main._id, r.emoji)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              border: r.users.map(String).includes(String(currentUserId))
                                ? "1px solid #7c3aed"
                                : "1px solid #4b5563",
                              backgroundColor: r.users.map(String).includes(String(currentUserId))
                                ? "#4c1d95"
                                : "#1e293b",
                              cursor: "pointer",
                              fontSize: "12px",
                              color: "#d1d5db",
                            }}
                          >
                            {r.emoji} <span>{r.users.length}</span>
                          </button>
                        ))}
                    </div>
                  )}

                {/* Reply button */}
                <button
                  onClick={() => {
                    if (setReplyTo) setReplyTo(main);
                    if (inputRef && inputRef.current) inputRef.current.focus();
                  }}
                  style={{ background: "none", border: "none", color: "#60a5fa", fontSize: "12px", cursor: "pointer", marginTop: "4px", padding: 0 }}
                >
                  Reply
                </button>

                {childReplies.length > 0 && (
                  <p style={{ fontSize: "12px", color: "#a78bfa", marginTop: "2px" }}>
                    💬 {childReplies.length} {childReplies.length === 1 ? "reply" : "replies"}
                  </p>
                )}
              </div>
            </div>

            {/* Inline thread replies */}
            {childReplies.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  marginLeft: "24px",
                  paddingLeft: "12px",
                  borderLeft: isHighlighted ? "2px solid #7c3aed" : "2px solid #374151",
                }}
              >
                {childReplies.map((reply) => (
                  <div
                    key={reply._id}
                    style={{ backgroundColor: "#0f172a", borderRadius: "10px", padding: "6px 12px", marginBottom: "4px" }}
                  >
                    <p style={{ fontSize: "11px", color: "#a78bfa", fontWeight: 600, margin: 0 }}>
                      {reply.sender?.name}
                    </p>
                    <p style={{ fontSize: "13px", color: "#e2e8f0", margin: 0 }}>
                      {reply.content}
                    </p>
                    <FilePreview msg={reply} />
                  </div>
                ))}
              </div>
            )}

          </div>
        );
      })}

      {/* Typing indicator */}
      {typingUser && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9ca3af", fontSize: "13px", fontStyle: "italic" }}>
          <div style={{ display: "flex", gap: "3px" }}>
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="animate-bounce"
                style={{ width: "6px", height: "6px", backgroundColor: "#60a5fa", borderRadius: "50%", display: "inline-block", animationDelay: d + "ms" }}
              />
            ))}
          </div>
          {typingUser} is typing...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}