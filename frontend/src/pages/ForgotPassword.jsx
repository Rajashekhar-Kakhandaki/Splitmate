import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const inputCls = "w-full bg-white/50 dark:bg-black/20 border border-ink/10 dark:border-white/10 rounded-2xl px-4 py-3.5 text-ink dark:text-white outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all placeholder:text-ink/30 dark:placeholder:text-white/30";
const btnCls = "w-full bg-cover text-paper rounded-[1.25rem] py-4 font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-dark-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <h1 className="font-display italic text-4xl text-ink dark:text-dark-ink tracking-tight mb-3">
            SplitMate
          </h1>
          <p className="text-ink/60 dark:text-dark-ink-muted">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/40 dark:bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-white/10">
          {error && (
            <div className="mb-6 p-4 bg-owe/10 border border-owe/20 text-owe text-sm rounded-xl">
              {error}
            </div>
          )}
          
          {message && (
            <div className="mb-6 p-4 bg-cover/10 border border-cover/20 text-cover text-sm rounded-xl">
              {message}
            </div>
          )}

          <div className="space-y-4 mb-8">
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>

          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="mt-8 text-center text-sm text-ink/60 dark:text-dark-ink-muted">
            Remembered it?{" "}
            <Link to="/login" className="text-cover font-medium hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
