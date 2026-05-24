import { useState, useEffect } from "react";
import ChannelList from "./ChannelList";
import Sidebar from "./Sidebar";
import OnlineUser from "../user/OnlineUser";
import ThreadPanel from "../dashboard/ThreadPanel";

function Toggle({ on, onToggle, label, icon }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span style={{ color: "var(--text-secondary)" }} className="text-sm">
        {icon} {label}
      </span>
      <button
        onClick={onToggle}
        className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          on ? "bg-purple-600" : "bg-gray-500"
        }`}
      >
        {/* Circle: left = off, right = on */}
        <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          on ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}

export default function AppLayout({ children, setSelectedChannel, selectedThread }) {

  const [activeTab, setActiveTab] = useState("online");

  // Read dark mode preference on load
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  const [notifOn, setNotifOn] = useState(() => {
    return localStorage.getItem("notificationsEnabled") !== "false";
  });

  // Open thread tab when message clicked
  useEffect(() => {
    const handler = () => setActiveTab("threads");
    window.addEventListener("openThreads", handler);
    return () => window.removeEventListener("openThreads", handler);
  }, []);

  // Apply dark/light mode to entire document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>

      {/* ── MAIN ROW ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        <Sidebar />

        <ChannelList setSelectedChannel={setSelectedChannel} />

        {/* Center */}
        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          {children}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="w-72 flex flex-col overflow-hidden border-l"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
          }}
        >
          {/* Tabs */}
          <div className="flex shrink-0 border-b" style={{ borderColor: "var(--border-color)" }}>
            {["online", "threads"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 p-3 text-sm font-medium transition-colors capitalize"
                style={{
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
                }}
              >
                {tab === "online" ? "Online" : "Threads"}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === "online" ? (
              <OnlineUser />
            ) : (
              <ThreadPanel replies={selectedThread} />
            )}
          </div>

          {/* ── SETTINGS SECTION ── */}
          <div
            className="border-t p-4 shrink-0"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}>
              Settings
            </p>

            <Toggle
              on={darkMode}
              onToggle={() => setDarkMode(p => !p)}
              icon="🌙"
              label="Dark Mode"
            />
            <Toggle
              on={notifOn}
              onToggle={() => {
                setNotifOn(p => {
                  localStorage.setItem("notificationsEnabled", String(!p));
                  return !p;
                });
              }}
              icon="🔔"
              label="Notifications"
            />
            <div className="flex items-center justify-between py-1 cursor-pointer hover:opacity-75">
              <span style={{ color: "var(--text-secondary)" }} className="text-sm">🔒 Security</span>
              <span style={{ color: "var(--text-muted)" }}>›</span>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-3 text-xs text-red-400 hover:text-red-300 py-1.5 rounded-lg hover:bg-red-900/20 transition border border-red-900/40"
            >⏻ Logout</button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer
        className="h-10 flex items-center justify-center gap-8 shrink-0 border-t"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        {["ℹ️ About Us", "❓ Help Center", "⚙️ Workspace Settings"].map(label => (
          <button key={label} className="text-xs hover:opacity-100 opacity-60 transition"
            style={{ color: "var(--text-primary)" }}>
            {label}
          </button>
        ))}
        <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 transition">
          ⏻ Logout
        </button>
      </footer>

    </div>
  );
}