import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { CATEGORIES } from "../lib/categories";
import { formatRupees } from "../lib/format";
import Avatar from "./Avatar.jsx";

const FREQ_LABELS = { weekly: "Every week", monthly: "Every month" };

const inputCls = "mt-1 w-full rounded-lg border border-ink/15 dark:border-dark-border bg-white dark:bg-dark-surface text-ink dark:text-dark-ink px-3 py-2 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20";
const labelCls = "text-xs font-mono uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted";

export default function RecurringExpenses({ room, currentUserId, onExpenseLogged }) {
  const [items, setItems] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [applying, setApplying] = useState(null); // id of item being applied
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [frequency, setFrequency] = useState("monthly");
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [splitWith, setSplitWith] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState(room.members.map((m) => m.id));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${room.id}/recurring`);
      setItems(res.data.recurring);
    } catch {
      setError("Couldn't load recurring expenses.");
    }
  }, [room.id]);

  useEffect(() => { load(); }, [load]);

  // Request notification permission proactively on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function toggleMember(id) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function isDue(item) {
    return new Date(item.nextDueDate) <= new Date();
  }

  async function handleApply(item) {
    setApplying(item.id);
    setError("");
    try {
      await api.post(`/rooms/${room.id}/recurring/${item.id}/apply`);
      await load();
      onExpenseLogged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't log that expense.");
    } finally {
      setApplying(null);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/rooms/${room.id}/recurring/${id}`);
      await load();
    } catch {
      setError("Couldn't delete that recurring expense.");
    }
  }

  function resetForm() {
    setTitle(""); setAmount(""); setCategory(CATEGORIES[0]);
    setPaidBy(currentUserId); setFrequency("monthly");
    setSplitWith("all"); setSelectedMembers(room.members.map((m) => m.id));
    setNote(""); setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (splitWith === "custom" && selectedMembers.length === 0) {
      setFormError("Pick at least one member to split with.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/rooms/${room.id}/recurring`, {
        title,
        amount: Number(amount),
        category,
        paidBy,
        frequency,
        nextDueDate,
        splitWith,
        memberIds: splitWith === "custom" ? selectedMembers : undefined,
        note: note || undefined,
      });
      resetForm();
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Couldn't add recurring expense.");
    } finally {
      setSubmitting(false);
    }
  }

  const dueItems = items?.filter(isDue) ?? [];
  const upcomingItems = items?.filter((i) => !isDue(i)) ?? [];

  // Build a lookup of member names for display
  const memberMap = Object.fromEntries(room.members.map((m) => [m.id, m.name]));

  return (
    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted">
          Recurring Expenses
        </p>
        <button
          id="add-recurring-btn"
          onClick={() => {
            if (showForm) resetForm();
            setShowForm((s) => !s);
          }}
          className="text-xs font-mono text-cover dark:text-gold hover:underline"
        >
          {showForm ? "Cancel" : "+ Add recurring"}
        </button>
      </div>
      <p className="text-xs text-ink/50 dark:text-dark-ink-muted mb-4">
        Set up bills that repeat weekly or monthly. Hit "Log now" when it's due.
      </p>

      {error && (
        <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* ── Add form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 rounded-xl border border-ink/10 dark:border-dark-border bg-white/50 dark:bg-dark-surface space-y-3">

          {/* Helper callout explaining "Paid by" vs "Split between" */}
          <div className="rounded-lg bg-gold/10 dark:bg-gold/5 border border-gold/30 px-3 py-2">
            <p className="text-xs text-ink/70 dark:text-dark-ink-muted leading-relaxed">
              <span className="font-semibold text-ink dark:text-dark-ink">Paid by</span> = who physically pays the landlord / bill.
              {" "}<span className="font-semibold text-ink dark:text-dark-ink">Split between</span> = who shares the cost equally.
              For rent, the payer fronts the cash — everyone else owes them their share.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Title</span>
              <input
                type="text" required value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Rent"
                className={inputCls}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Amount (₹)</span>
              <input
                type="number" required min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="6500"
                className={`${inputCls} font-mono`}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {/* Paid by — who fronts the money */}
            <label className="block">
              <span className={labelCls}>Paid by (who fronts the cash)</span>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={inputCls}>
                {room.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelCls}>Frequency</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputCls}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>

            <label className="block">
              <span className={labelCls}>Next due date</span>
              <input
                type="date" value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className={inputCls}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelCls}>Note (optional)</span>
              <input
                type="text" value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Landlord payment via GPay"
                className={inputCls}
              />
            </label>
          </div>

          {/* Split between */}
          <div>
            <span className={labelCls}>Split between</span>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => { setSplitWith("all"); setSelectedMembers(room.members.map((m) => m.id)); }}
                className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                  splitWith === "all"
                    ? "bg-cover text-paper border-cover"
                    : "border-ink/15 dark:border-dark-border text-ink/60 dark:text-dark-ink-muted hover:border-ink/30"
                }`}
              >
                All members
              </button>
              <button
                type="button"
                onClick={() => setSplitWith("custom")}
                className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                  splitWith === "custom"
                    ? "bg-cover text-paper border-cover"
                    : "border-ink/15 dark:border-dark-border text-ink/60 dark:text-dark-ink-muted hover:border-ink/30"
                }`}
              >
                Select members
              </button>
            </div>

            {splitWith === "custom" && (
              <div className="flex flex-wrap gap-2 mt-2">
                {room.members.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                      selectedMembers.includes(m.id)
                        ? "bg-owed/15 border-owed text-owed"
                        : "border-ink/15 dark:border-dark-border text-ink/50 dark:text-dark-ink-muted hover:border-ink/30"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}

            {splitWith === "all" && (
              <p className="text-xs text-ink/40 dark:text-dark-ink-muted mt-1.5">
                Cost shared equally among all {room.members.length} members
              </p>
            )}
          </div>

          {formError && <p className="text-xs text-owe">{formError}</p>}

          <button
            type="submit" disabled={submitting}
            className="bg-cover text-paper rounded-lg px-4 py-2 text-sm font-medium hover:bg-cover-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add recurring expense"}
          </button>
        </form>
      )}

      {items === null && (
        <p className="font-mono text-xs text-ink/40 dark:text-dark-ink-muted">loading…</p>
      )}

      {items?.length === 0 && !showForm && (
        <p className="text-sm text-ink/50 dark:text-dark-ink-muted">
          No recurring expenses yet. Add things like Rent or WiFi that repeat every month.
        </p>
      )}

      {/* Due now */}
      {dueItems.length > 0 && (
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-owe mb-2">⚡ Due now</p>
          <div className="space-y-2">
            {dueItems.map((item) => (
              <RecurringRow
                key={item.id}
                item={item}
                memberMap={memberMap}
                isDue={true}
                applying={applying === item.id}
                onApply={() => handleApply(item)}
                onDelete={() => handleDelete(item.id)}
                totalMembers={room.members.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingItems.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 dark:text-dark-ink-muted mb-2">Upcoming</p>
          <div className="space-y-2">
            {upcomingItems.map((item) => (
              <RecurringRow
                key={item.id}
                item={item}
                memberMap={memberMap}
                isDue={false}
                applying={applying === item.id}
                onApply={() => handleApply(item)}
                onDelete={() => handleDelete(item.id)}
                totalMembers={room.members.length}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecurringRow({ item, memberMap, isDue, applying, onApply, onDelete, totalMembers }) {
  const dueDateStr = new Date(item.nextDueDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  // Build split label
  let splitLabel;
  if (item.splitWith === "custom" && item.splitMemberIds?.length > 0) {
    const names = item.splitMemberIds
      .map((id) => memberMap[id])
      .filter(Boolean)
      .join(", ");
    splitLabel = `Split: ${names}`;
  } else {
    splitLabel = `Split: all ${totalMembers} members`;
  }

  return (
    <div
      className={`flex items-start justify-between rounded-xl px-4 py-3 border gap-3 ${
        isDue
          ? "border-gold/50 bg-gold/5 dark:bg-gold/10"
          : "border-ink/10 dark:border-dark-border"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-ink dark:text-dark-ink">{item.title}</p>
          <span className="text-[10px] font-mono bg-ink/5 dark:bg-dark-border px-1.5 py-0.5 rounded text-ink/50 dark:text-dark-ink-muted">
            {FREQ_LABELS[item.frequency]}
          </span>
        </div>
        <p className="text-xs text-ink/50 dark:text-dark-ink-muted mt-0.5">
          {item.category} · Paid by {item.paidBy.name} · Due {dueDateStr}
        </p>
        {/* Split detail */}
        <p className="text-xs text-ink/40 dark:text-dark-ink-muted mt-0.5">
          {splitLabel}
          {item.note ? ` · ${item.note}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-sm text-ink dark:text-dark-ink">{formatRupees(item.amount)}</span>
        {isDue && (
          <button
            onClick={onApply}
            disabled={applying}
            className="text-xs font-mono uppercase tracking-wide bg-cover text-paper rounded-md px-3 py-1.5 hover:bg-cover-light transition-colors disabled:opacity-60"
          >
            {applying ? "…" : "Log now"}
          </button>
        )}
        <button
          onClick={onDelete}
          title="Delete recurring"
          className="text-ink/30 dark:text-dark-ink-muted hover:text-owe transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
