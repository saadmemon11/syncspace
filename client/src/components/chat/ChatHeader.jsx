import { useState, useRef, useEffect } from "react";
import { FiSearch, FiBell, FiX } from "react-icons/fi";

export default function ChatHeader({
  channel,
  messages = [],
  notifCount = 0,
  onBellClick,
  currentUser,
  // onProfileUpdate no longer needed here — editing is in BottomPanel only
}) {
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch]       = useState(false);

  const searchRef = useRef(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    const results = messages.filter(m =>
      m.content?.toLowerCase().includes(val.toLowerCase())
    );
    setSearchResults(results.slice(0, 8));
    setShowSearch(results.length > 0);
  };

  const goToMessage = (id) => {
    setShowSearch(false);
    setSearchQuery("");
    setTimeout(() => {
      const el = document.getElementById("msg-" + id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Flash highlight
        el.style.transition = "background-color 0.3s ease";
        el.style.backgroundColor = "rgba(124,58,237,0.25)";
        setTimeout(() => {
          el.style.backgroundColor = "";
        }, 2500);
      }
    }, 100);
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b shrink-0"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor:     "var(--border-color)",
      }}
    >
      {/* Channel name */}
      <h2
        className="text-lg font-semibold truncate mr-4"
        style={{ color: "var(--text-primary)" }}
      >
        {channel?.type === "dm"
          ? channel?.name || "Direct Message"
          : channel?.name
            ? "# " + channel.name
            : "Select a channel"}
      </h2>

      {/* Right side controls */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Search */}
        <div ref={searchRef} className="relative">
          <div
            className="flex items-center px-3 py-1.5 rounded-lg gap-2"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <FiSearch style={{ color: "var(--text-muted)" }} className="shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-28"
              style={{ color: "var(--text-primary)" }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowSearch(false); }}>
                <FiX style={{ color: "var(--text-muted)" }} />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div
              className="absolute top-10 right-0 w-72 rounded-xl shadow-2xl z-50 overflow-hidden border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor:     "var(--border-color)",
              }}
            >
              <p
                className="text-xs px-3 py-2 border-b"
                style={{
                  color:       "var(--text-muted)",
                  borderColor: "var(--border-color)",
                }}
              >
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map(msg => (
                  <div
                    key={msg._id}
                    onClick={() => goToMessage(msg._id)}
                    className="px-3 py-2.5 cursor-pointer border-b hover:bg-[#334155]"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <p className="text-xs text-purple-400 mb-0.5 font-medium">
                      {msg.sender?.name}
                    </p>
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bell with notification count */}
        <button
          onClick={onBellClick}
          className="relative"
          title="Clear notifications"
        >
          <FiBell
            className="text-xl"
            style={{ color: "var(--text-secondary)" }}
          />
          {notifCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5 font-bold">
              {notifCount > 99 ? "99+" : notifCount}
            </span>
          )}
        </button>

        {/* Profile avatar — READ ONLY here, edit is in bottom panel profile card */}
        <div
          className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-600 cursor-default shrink-0"
          title={currentUser?.name || "You"}
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}