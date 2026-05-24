import { useState, useEffect } from "react";
import API from "../services/api";

export default function Workspace() {

  const [workspaces, setWorkspaces] = useState([]);
  const [name, setName] = useState("");

  const loadWorkspaces = async () => {
    try {
      const res = await API.get("/workspaces");
      setWorkspaces(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const createWorkspace = async () => {
    if (!name) return;

    try {
      const res = await API.post("/workspaces", { name });
      setWorkspaces((prev) => [...prev, res.data]);
      setName("");
    } catch (err) {
      console.log(err);
      alert("Unauthorized or error");
    }
  };

  const enterWorkspace = (ws) => {
    localStorage.setItem("workspaceId", ws._id);
    window.location.href = "/chat";
  };

  return (
    <div
      className="h-screen w-full flex"
      style={{
        backgroundImage: "url('/galaxy-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >

      {/* 🔥 LEFT SIDE (BIG LOGO) */}
      <div className="w-1/2 flex items-center justify-center">
      <img src="/logo.png" className="w-[820px] drop-shadow-2xl" />
      </div>

      {/* 🔥 RIGHT SIDE */}
      <div className="w-1/2 flex items-center justify-center">

        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl w-96 text-white border border-white/20 shadow-xl">

          <h2 className="text-2xl font-bold mb-6 text-center">
            Your Workspaces
          </h2>

          {/* 🔥 CREATE WORKSPACE */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="New workspace..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 p-3 rounded bg-white/20 placeholder-gray-300 outline-none"
            />

            <button
              onClick={createWorkspace}
              className="bg-purple-500 hover:bg-purple-600 px-4 rounded"
            >
              +
            </button>
          </div>

          {/* 🔥 WORKSPACE LIST */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
           {workspaces.map((ws) => (
  <div
    key={ws._id}
    className="p-3 bg-white/20 rounded flex justify-between items-center hover:bg-white/30 transition"
  >
    <span
      onClick={() => enterWorkspace(ws)}
      className="cursor-pointer"
    >
      {ws.name}
    </span>

    <button
      onClick={async () => {
        const confirmDelete = window.confirm("Delete workspace?");
        if (!confirmDelete) return;

        try {
          await API.delete(`/workspaces/${ws._id}`);
          setWorkspaces((prev) =>
            prev.filter((w) => w._id !== ws._id)
          );
        } catch (err) {
          console.log(err);
          alert("Delete failed");
        }
      }}
      className="text-red-400 text-sm"
    >
      ✕
    </button>
  </div>
))}
          </div>

        </div>

      </div>

    </div>
  );
}