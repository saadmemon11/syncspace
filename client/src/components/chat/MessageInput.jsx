import { useState, useEffect, useRef } from "react";
import socket from "../../services/socket";
import API from "../../services/api";
import { FiSend, FiSmile, FiPaperclip, FiX } from "react-icons/fi";

const EMOJI_LIST = [
  "😀","😂","😅","😊","😍","🥰","😎","🤔","😢","😭",
  "😡","🥳","🤩","😴","🤗","👍","👎","👏","🙏","🤝",
  "❤️","🔥","💯","✅","🎉","🚀","⭐","💪","🎯","👀",
  "😮","😲","🤯","😏","😬","🙄","😇","🤓","👋","✌️",
  "🍕","🎮","🏆","💡","🎵","💰","📱","💻","🌟","⚡",
];

export default function MessageInput({
  channelId,
  replyTo,
  setReplyTo,
  inputRef,
  currentUser,
}) {
  const [message,       setMessage]       = useState("");
  const [file,          setFile]          = useState(null);
  const [fileData,      setFileData]      = useState(null);
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [users,         setUsers]         = useState([]);
  const [showMention,   setShowMention]   = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [sending,       setSending]       = useState(false); // prevent double-send

  const emojiRef    = useRef(null);
  const fileRef     = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    API.get("/users").then(r => setUsers(r.data)).catch(console.error);
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // FILE SELECTED → convert to base64, then auto-focus text input
  // so user can press Enter to send immediately
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result);

      // ← KEY FIX: after file loads, focus the text input
      // so pressing Enter works without clicking the input first
      setTimeout(() => {
        if (inputRef && inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    };
    reader.readAsDataURL(f);
    e.target.value = ""; // reset so same file can be picked again
  };

  // SEND — handles text only, file only, or text + file together
  const sendMessage = () => {
    if (sending) return; // prevent double send

    const hasText = message.trim().length > 0;
    const hasFile = fileData !== null;

    if (!hasText && !hasFile) return;
    if (!channelId) return;

    const id = String(channelId);

    setSending(true);

    socket.emit("sendMessage", {
      content:      message.trim(),
      channelId:    id,
      threadParent: replyTo?._id || null,
      fileData:     fileData     || null,
      fileName:     file?.name   || null,
      fileType:     file?.type   || null,
    });

    socket.emit("stopTyping", { channelId: id });

    // Reset state
    setMessage("");
    setFile(null);
    setFileData(null);
    setReplyTo(null);
    setShowMention(false);
    setShowEmoji(false);

    // Re-focus text input after send so user can type next message immediately
    setTimeout(() => {
      setSending(false);
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Typing indicator — emits to server which broadcasts to others only
  const handleTyping = () => {
    const id = channelId ? String(channelId) : null;
    if (!id) return;

    socket.emit("typing", {
      channelId: id,
      userId:    currentUser?._id,
      name:      currentUser?.name,
    });

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("stopTyping", { channelId: id });
    }, 1200);
  };

  // Whether send button / Enter should be active
  const canSend = channelId && (message.trim().length > 0 || fileData !== null);

  return (
    <div
      className="p-3 border-t shrink-0"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor:     "var(--border-color)",
      }}
    >
      {/* Reply preview */}
      {replyTo && (
        <div
          className="mb-2 p-2 rounded-lg flex justify-between items-center text-sm border-l-2 border-purple-500"
          style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}
        >
          <span>
            Replying to{" "}
            <b style={{ color: "var(--text-primary)" }}>{replyTo?.sender?.name}</b>
            {": "}
            {replyTo?.content?.slice(0, 50)}
          </span>
          <button onClick={() => setReplyTo(null)} className="ml-2 shrink-0">
            <FiX />
          </button>
        </div>
      )}

      {/* File preview — shown once file is selected */}
      {file && (
        <div
          className="mb-2 text-sm flex justify-between items-center p-2 rounded-lg"
          style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">
              {file.type.startsWith("image/") ? "🖼️" : "📄"}
            </span>
            <span className="truncate">{file.name}</span>
            <span className="text-xs text-gray-500 shrink-0">
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Quick send button shown next to file preview */}
            {fileData && (
              <button
                onClick={sendMessage}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded-lg transition-colors"
              >
                Send
              </button>
            )}
            {!fileData && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
            <button
              onClick={() => { setFile(null); setFileData(null); }}
              className="hover:text-red-400 transition-colors"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}

      {/* @mention dropdown */}
      {showMention && filteredUsers.length > 0 && (
        <div
          className="mb-2 rounded-lg max-h-36 overflow-y-auto border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          {filteredUsers.map(u => (
            <div
              key={u._id}
              onClick={() => {
                setMessage(prev => prev.replace(/@(\w*)$/, `@${u.name} `));
                setShowMention(false);
              }}
              className="px-3 py-2 cursor-pointer text-sm hover:bg-[#334155]"
              style={{ color: "var(--text-primary)" }}
            >
              {u.name}
            </div>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div
          ref={emojiRef}
          className="mb-2 p-2 rounded-xl border flex flex-wrap gap-1"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          {EMOJI_LIST.map(e => (
            <button
              key={e}
              onClick={() => setMessage(prev => prev + e)}
              className="text-xl hover:scale-125 transition-transform p-0.5"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Main input bar */}
      <div
        className="flex items-center rounded-xl px-3 py-2 gap-2"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        {/* Emoji toggle */}
        <button
          type="button"
          onClick={() => setShowEmoji(p => !p)}
          title="Emoji"
          className="shrink-0"
        >
          <FiSmile
            className="text-xl transition-colors"
            style={{ color: showEmoji ? "#a855f7" : "var(--text-muted)" }}
          />
        </button>

        {/* File attach */}
        <label className="cursor-pointer shrink-0" title="Attach file">
          <FiPaperclip
            className="text-xl hover:text-purple-400 transition-colors"
            style={{ color: file ? "#a855f7" : "var(--text-muted)" }}
          />
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.zip,.txt,.doc,.docx"
            onChange={handleFileChange}
          />
        </label>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          placeholder={
            !channelId  ? "Select a channel first..." :
            file        ? "Add a message (optional) then press Enter..." :
                          "Type a message..."
          }
          value={message}
          disabled={!channelId}
          onChange={e => {
            const value = e.target.value;
            setMessage(value);
            handleTyping();

            const match = value.match(/@(\w*)$/);
            if (match) {
              const kw = match[1].toLowerCase();
              setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(kw)));
              setShowMention(true);
            } else {
              setShowMention(false);
            }
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              // Enter sends whether there is text, file, or both
              if (canSend) sendMessage();
            }
          }}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)" }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={sendMessage}
          disabled={!canSend}
          title="Send"
          className="shrink-0 transition-colors"
          style={{ color: canSend ? "#a855f7" : "var(--text-muted)" }}
        >
          <FiSend className="text-xl" />
        </button>
      </div>
    </div>
  );
}