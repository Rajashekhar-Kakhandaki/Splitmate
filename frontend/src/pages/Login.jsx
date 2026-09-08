import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Shared input class for dark mode
const inputCls = "mt-2 w-full rounded-xl border border-ink/15 dark:border-white/10 bg-white/50 dark:bg-black/20 text-ink dark:text-white px-4 py-3 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all backdrop-blur-sm";
const labelCls = "text-[10px] font-mono uppercase tracking-widest text-ink/50 dark:text-white/50";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't log you in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to your room"
      subtitle="Pick up where the last expense left off."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <label className="block">
          <span className={labelCls}>Email</span>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="raj@dsatm.edu"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Password</span>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputCls}
          />
        </label>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-cover hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={submitting}
          className="w-full mt-4 bg-cover text-paper rounded-[1rem] py-3.5 text-sm font-medium hover:bg-cover-light transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-ink/60 dark:text-dark-ink-muted mt-6 text-center">
        New to SplitMate?{" "}
        <Link to="/signup" className="text-cover dark:text-gold font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
