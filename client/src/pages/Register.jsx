import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await API.post("/auth/register", {
        name,
        email,
        password
      });

      alert("Registered successfully");
      window.location.href = "/login";

    } catch (err) {
      console.log(err);
      alert("Registration failed");
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

      {/* LEFT */}
      <div className="w-1/2 flex items-center justify-center">
  <img src="/logo.png" className="w-[820px] drop-shadow-2xl" />
</div>

      {/* RIGHT */}
      <div className="w-1/2 flex items-center justify-center">

        <form
          onSubmit={handleRegister}
          className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl w-96 text-white border border-white/20 shadow-xl"
        >

          <h2 className="text-2xl font-bold mb-6 text-center">
            Create Account
          </h2>

          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 mb-4 rounded bg-white/20 placeholder-gray-300 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-4 rounded bg-white/20 placeholder-gray-300 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

        <div className="relative mb-4">
         <input
             type={showPassword ? "text" : "password"}
             placeholder="Password"
             className="w-full p-3 rounded bg-white/20 placeholder-gray-300 outline-none"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
        />

        <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 cursor-pointer text-white"
       >
            {showPassword ? "🙈" : "👁"}
        </span>
        </div>

          <button className="w-full bg-purple-500 hover:bg-purple-600 p-3 rounded font-semibold">
            Register
          </button>

          <p className="text-sm mt-4 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400">
              Login
            </Link>
          </p>

        </form>
      </div>

    </div>
  );
}