import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("token", res.data.token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: res.data.user.id,
          name: res.data.user.name,
          email: res.data.user.email
        })
      );

      window.location.href = "/workspaces";

    } catch (err) {
      console.log(err);
      alert("Login failed");
    }
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

      {/* LEFT SIDE */}
      <div className="w-1/2 flex items-center justify-center">
  <img src="/logo.png" className="w-[820px] drop-shadow-2xl" />
</div>

      {/* RIGHT SIDE */}
      <div className="w-1/2 flex items-center justify-center">

        <form
          onSubmit={handleLogin}
          className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl w-96 text-white border border-white/20 shadow-xl"
        >

          <h2 className="text-2xl font-bold mb-6 text-center">
            Welcome Back
          </h2>

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-4 rounded bg-white/20 placeholder-gray-300 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD WITH EYE ICON */}
        <div className="relative mb-4">
         <input
          type={showPassword ? "text" : "password"}   // 🔥 CHANGE HERE
          placeholder="Password"
          className="w-full p-3 rounded bg-white/20 placeholder-gray-300 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
         />

        <span
          onClick={() => setShowPassword(!showPassword)}   // 🔥 ADD THIS
          className="absolute right-3 top-3 cursor-pointer text-white"
        >
          {showPassword ? "🙈" : "👁"}   {/* 🔥 TOGGLE ICON */}
        </span>
        </div>

          <button className="w-full bg-blue-500 hover:bg-blue-600 p-3 rounded font-semibold">
            Login
          </button>

          <p className="text-sm mt-4 text-center">
            Don’t have an account?{" "}
            <Link to="/register" className="text-blue-400">
              Sign up
            </Link>
          </p>

        </form>
      </div>

    </div>
  );
}