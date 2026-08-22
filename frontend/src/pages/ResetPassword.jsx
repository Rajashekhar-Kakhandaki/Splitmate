import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import toast from "react-hot-toast";

const inputCls = "w-full bg-white/50 dark:bg-black/20 border border-ink/10 dark:border-white/10 rounded-2xl px-4 py-3.5 text-ink dark:text-white outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all placeholder:text-ink/30 dark:placeholder:text-white/30";
const btnCls = "w-full bg-cover text-paper rounded-[1.25rem] py-4 font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/reset-password", { token, newPassword });
      toast.success("Password reset successfully. You can now log in.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password. The link might have expired.");
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
          <p className="text-ink/60 dark:text-dark-ink-muted">Set your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/40 dark:bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-white/10">
          {error && (
            <div className="mb-6 p-4 bg-owe/10 border border-owe/20 text-owe text-sm rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-8">
            <input
              type="password"
              placeholder="New password"
              required
              minLength="6"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              required
              minLength="6"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
          
          <p className="mt-8 text-center text-sm text-ink/60 dark:text-dark-ink-muted">
            Back to{" "}
            <Link to="/login" className="text-cover font-medium hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
