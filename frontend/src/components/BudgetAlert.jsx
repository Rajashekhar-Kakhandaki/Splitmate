import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { formatRupees } from "../lib/format";

const SESSION_NOTIFIED_KEY = "splitmate_budget_notified";

function getSessionNotified() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_NOTIFIED_KEY) || "{}");
  } catch {
    return {};
  }
}

function markSessionNotified(roomId, pct) {
  const map = getSessionNotified();
  map[roomId] = pct;
  sessionStorage.setItem(SESSION_NOTIFIED_KEY, JSON.stringify(map));
}

export default function BudgetAlert({ roomId, totalThisMonth, onBudgetChange }) {
  const [budget, setBudget] = useState(null); // { monthlyLimit, totalThisMonth, percentage }
  const [editing, setEditing] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const notifiedRef = useRef(getSessionNotified());

  const loadBudget = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${roomId}/budget`);
      setBudget(res.data);

      // Trigger browser notification if threshold crossed and not yet notified this session
      const { monthlyLimit, percentage } = res.data;
      if (!monthlyLimit || !percentage) return;

      const notified = getSessionNotified();
      const alreadyAt = notified[roomId] || 0;

      async function tryNotify(title, body) {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icons/icon-192.png" });
        }
      }

      if (percentage >= 100 && alreadyAt < 100) {
        markSessionNotified(roomId, 100);
        notifiedRef.current = getSessionNotified();
        tryNotify("💸 Budget Exceeded!", `You've spent ${formatRupees(res.data.totalThisMonth)} — over your ₹${monthlyLimit} budget for this room.`);
      } else if (percentage >= 80 && alreadyAt < 80) {
        markSessionNotified(roomId, 80);
        notifiedRef.current = getSessionNotified();
        tryNotify("⚠️ Budget Alert — 80%", `You've used ${percentage}% of your ₹${monthlyLimit} monthly budget.`);
      }
    } catch {
      // silently fail — budget is optional
    }
  }, [roomId]);

  useEffect(() => { loadBudget(); }, [loadBudget, totalThisMonth]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.put(`/rooms/${roomId}/budget`, { monthlyLimit: Number(limitInput) });
      setEditing(false);
      setLimitInput("");
      await loadBudget();
      onBudgetChange?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/rooms/${roomId}/budget`);
      setBudget(null);
      setEditing(false);
      onBudgetChange?.();
    } catch {
      // ignore
    }
  }

  const pct = budget?.percentage ?? 0;
  const limit = budget?.monthlyLimit;
  const spent = budget?.totalThisMonth ?? 0;

  const barColor =
    pct >= 100 ? "bg-owe" :
    pct >= 80  ? "bg-amber-500" :
                 "bg-owed";

  const bgColor =
    pct >= 100 ? "bg-owe/10 border-owe/30 dark:border-owe/40" :
    pct >= 80  ? "bg-amber-500/10 border-amber-500/30 dark:border-amber-500/40" :
                 "bg-white/40 dark:bg-white/5 border-ink/10 dark:border-white/10";

  return (
    <div className={`backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border shadow-sm transition-colors ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted">
            Monthly Budget
          </p>
          {limit ? (
            <p className="text-sm text-ink dark:text-dark-ink mt-0.5">
              <span className={`font-mono font-semibold ${pct >= 100 ? "text-owe" : pct >= 80 ? "text-amber-600 dark:text-amber-400" : "text-owed"}`}>
                {formatRupees(spent)}
              </span>
              <span className="text-ink/50 dark:text-dark-ink-muted"> / {formatRupees(limit)}</span>
              <span className={`ml-2 text-xs font-mono ${pct >= 100 ? "text-owe" : pct >= 80 ? "text-amber-600 dark:text-amber-400" : "text-ink/50 dark:text-dark-ink-muted"}`}>
                {pct}%
              </span>
            </p>
          ) : (
            <p className="text-sm text-ink/50 dark:text-dark-ink-muted mt-0.5">No budget set</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {limit && (
            <button
              onClick={handleDelete}
              title="Remove budget"
              className="text-ink/30 dark:text-dark-ink-muted hover:text-owe transition-colors text-xs font-mono"
            >
              Remove
            </button>
          )}
          <button
            id="budget-edit-btn"
            onClick={() => {
              setEditing((e) => !e);
              setLimitInput(limit ? String(limit) : "");
            }}
            title="Set budget"
            className="w-7 h-7 flex items-center justify-center rounded-full border border-ink/15 dark:border-dark-border text-ink/50 dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink hover:border-ink/40 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {limit && (
        <div className="w-full bg-ink/10 dark:bg-dark-border rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      {/* Status badge */}
      {limit && pct >= 80 && (
        <p className={`text-xs mt-2 font-mono ${pct >= 100 ? "text-owe" : "text-amber-600 dark:text-amber-400"}`}>
          {pct >= 100
            ? "⛔ Budget exceeded — watch your spending!"
            : "⚠️ Approaching budget limit"}
        </p>
      )}

      {/* Inline edit form */}
      {editing && (
        <form onSubmit={handleSave} className="mt-3 flex gap-2">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-sm text-ink/50 dark:text-dark-ink-muted font-mono">₹</span>
            <input
              id="budget-limit-input"
              type="number"
              min="1"
              step="1"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="Monthly limit"
              className="flex-1 rounded-lg border border-ink/15 dark:border-dark-border bg-white dark:bg-dark-surface text-ink dark:text-dark-ink px-3 py-1.5 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 font-mono"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-cover text-paper rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-cover-light transition-colors disabled:opacity-60"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-ink/40 dark:text-dark-ink-muted hover:text-ink text-sm px-2"
          >
            ✕
          </button>
        </form>
      )}
      {error && <p className="text-xs text-owe mt-2">{error}</p>}

      {!limit && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="mt-2 text-xs font-mono text-cover dark:text-gold hover:underline"
        >
          + Set a monthly budget
        </button>
      )}
    </div>
  );
}
