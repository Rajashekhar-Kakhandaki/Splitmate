import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const inputCls = "mt-2 w-full rounded-xl border border-ink/15 dark:border-white/10 bg-white/50 dark:bg-black/20 text-ink dark:text-white px-4 py-3 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all backdrop-blur-sm";
const labelCls = "text-[10px] font-mono uppercase tracking-widest text-ink/50 dark:text-white/50";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't create your account. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="One account, join or create as many rooms as you live in."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <label className="block">
          <span className={labelCls}>Name</span>
          <input
            id="signup-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rajashekhar"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Email</span>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@dsatm.edu"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Password</span>
          <input
            id="signup-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={inputCls}
          />
        </label>

        <button
          id="signup-submit"
          type="submit"
          disabled={submitting}
          className="w-full mt-4 bg-cover text-paper rounded-[1rem] py-3.5 text-sm font-medium hover:bg-cover-light transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-ink/60 dark:text-dark-ink-muted mt-6 text-center">
        Already have a room?{" "}
        <Link to="/login" className="text-cover dark:text-gold font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
