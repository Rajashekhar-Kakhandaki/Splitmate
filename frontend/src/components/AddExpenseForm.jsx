import { useCallback, useState, useEffect } from "react";
import api from "../lib/api";
import { CATEGORIES } from "../lib/categories";
import ReceiptScanner from "./ReceiptScanner.jsx";
import useVoiceInput from "../hooks/useVoiceInput.js";

const inputCls = "mt-1 w-full rounded-xl border border-ink/15 dark:border-white/10 bg-white/50 dark:bg-black/20 text-ink dark:text-white px-4 py-2.5 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all backdrop-blur-sm";
const labelCls = "text-[10px] font-mono uppercase tracking-widest text-ink/50 dark:text-white/50";

export default function AddExpenseForm({ room, currentUserId, onCreated, onClose, initialData = null }) {
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title || "");
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : "");
  const [category, setCategory] = useState(initialData?.category || CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState(initialData?.paidBy?.id || currentUserId);
  
  // Format for datetime-local: YYYY-MM-DDThh:mm
  const formatDateTimeLocal = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [date, setDate] = useState(() => formatDateTimeLocal(initialData?.date));
  const [note, setNote] = useState(initialData?.note || "");
  
  const [splitMethod, setSplitMethod] = useState("equal");
  
  // State for different split methods
  const [selectedMembers, setSelectedMembers] = useState(() => {
    if (initialData?.shares) return initialData.shares.map(s => s.memberId);
    return room.members.map((m) => m.id);
  });
  
  const [exactAmounts, setExactAmounts] = useState(() => {
    const obj = {};
    room.members.forEach(m => obj[m.id] = "");
    if (initialData?.shares) {
      initialData.shares.forEach(s => obj[s.memberId] = String(s.shareAmount));
    }
    return obj;
  });

  const [percentages, setPercentages] = useState(() => {
    const obj = {};
    room.members.forEach(m => obj[m.id] = (100 / room.members.length).toFixed(2));
    if (initialData?.shares && initialData.amount) {
      initialData.shares.forEach(s => obj[s.memberId] = ((s.shareAmount / initialData.amount) * 100).toFixed(2));
    }
    return obj;
  });

  const [shareCounts, setShareCounts] = useState(() => {
    const obj = {};
    room.members.forEach(m => obj[m.id] = "1");
    return obj;
  });

  // Determine initial split method based on incoming data if editing
  useEffect(() => {
    if (initialData?.shares && initialData.amount) {
      // Check if it's equal
      const isEqual = initialData.shares.every(s => Math.abs(s.shareAmount - (initialData.amount / initialData.shares.length)) < 0.1);
      if (isEqual) setSplitMethod("equal");
      else setSplitMethod("exact");
    }
  }, [initialData]);

  const [receiptUrl, setReceiptUrl] = useState(initialData?.receiptUrl || null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const handleVoiceResult = useCallback(({ title: vTitle, amount: vAmount, category: vCategory }) => {
    setVoiceTranscript("");
    if (vTitle && !title) setTitle(vTitle);
    if (vAmount && !amount) setAmount(String(vAmount));
    if (vCategory && category === CATEGORIES[0]) setCategory(vCategory);
  }, [title, amount, category]);

  const { listening, supported: voiceSupported, startListening, stopListening } = useVoiceInput(handleVoiceResult);

  function handleScanned({ receiptUrl: url, guessedAmount, guessedTitle, previewUrl }) {
    setReceiptUrl(url);
    setReceiptPreview(previewUrl);
    if (guessedAmount && !amount) setAmount(String(guessedAmount));
    if (guessedTitle && !title) setTitle(guessedTitle);
  }

  function toggleMember(id) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function handleExactChange(id, val) {
    setExactAmounts(prev => ({ ...prev, [id]: val }));
  }

  function handlePercentChange(id, val) {
    setPercentages(prev => ({ ...prev, [id]: val }));
  }

  function handleShareChange(id, val) {
    setShareCounts(prev => ({ ...prev, [id]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    const numericAmount = Math.round(Number(amount) * 100) / 100;
    if (numericAmount <= 0) {
      return setError("Amount must be greater than 0");
    }

    let computedShares = [];

    if (splitMethod === "equal") {
      if (selectedMembers.length === 0) return setError("Select at least one member to split with.");
      const shareAmount = Math.round((numericAmount / selectedMembers.length) * 100) / 100;
      let sum = 0;
      selectedMembers.forEach((id, i) => {
        let actual = shareAmount;
        if (i === selectedMembers.length - 1) {
          actual = Math.round((numericAmount - sum) * 100) / 100; // fix rounding errors
        }
        computedShares.push({ memberId: id, shareAmount: actual });
        sum += actual;
      });
    } 
    else if (splitMethod === "exact") {
      let sum = 0;
      room.members.forEach(m => {
        const val = Number(exactAmounts[m.id]) || 0;
        if (val > 0) {
          computedShares.push({ memberId: m.id, shareAmount: val });
          sum += val;
        }
      });
      if (Math.abs(sum - numericAmount) > 0.05) {
        return setError(`Exact amounts sum to ₹${sum.toFixed(2)}, but total is ₹${numericAmount.toFixed(2)}`);
      }
    }
    else if (splitMethod === "percent") {
      let percentSum = 0;
      room.members.forEach(m => {
        const p = Number(percentages[m.id]) || 0;
        percentSum += p;
      });
      if (Math.abs(percentSum - 100) > 0.1) {
        return setError(`Percentages must add up to 100% (currently ${percentSum.toFixed(1)}%)`);
      }
      let sum = 0;
      const validMembers = room.members.filter(m => (Number(percentages[m.id]) || 0) > 0);
      validMembers.forEach((m, i) => {
        const p = Number(percentages[m.id]);
        let actual = Math.round((numericAmount * (p / 100)) * 100) / 100;
        if (i === validMembers.length - 1) {
          actual = Math.round((numericAmount - sum) * 100) / 100; // fix rounding errors
        }
        computedShares.push({ memberId: m.id, shareAmount: actual });
        sum += actual;
      });
    }
    else if (splitMethod === "shares") {
      let totalShares = 0;
      room.members.forEach(m => totalShares += (Number(shareCounts[m.id]) || 0));
      if (totalShares === 0) return setError("Total shares must be greater than 0");
      
      let sum = 0;
      const validMembers = room.members.filter(m => (Number(shareCounts[m.id]) || 0) > 0);
      validMembers.forEach((m, i) => {
        const s = Number(shareCounts[m.id]);
        let actual = Math.round((numericAmount * (s / totalShares)) * 100) / 100;
        if (i === validMembers.length - 1) {
          actual = Math.round((numericAmount - sum) * 100) / 100; // fix rounding errors
        }
        computedShares.push({ memberId: m.id, shareAmount: actual });
        sum += actual;
      });
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        amount: numericAmount,
        category,
        paidBy,
        date: date ? new Date(date).toISOString() : undefined,
        note: note || undefined,
        splitWith: "custom",
        computedShares,
        receiptUrl: receiptUrl || undefined,
      };

      if (isEditing) {
        await api.put(`/rooms/${room.id}/expenses/${initialData.id}`, payload);
      } else {
        await api.post(`/rooms/${room.id}/expenses`, payload);
      }
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save that expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-ink/10 dark:border-white/10 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50">
          {isEditing ? "Edit Expense" : "Log Expense"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-ink/40 dark:text-white/40 hover:text-ink dark:hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {error && (
        <p className="text-sm text-owe bg-owe/10 border border-owe/20 rounded-xl px-4 py-3 shadow-sm">
          {error}
        </p>
      )}

      {!isEditing && <ReceiptScanner onScanned={handleScanned} />}
      
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="block">
          <span className={labelCls}>Title</span>
          <div className="relative">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Milk, Uber"
              className={`${inputCls} ${voiceSupported ? "pr-10" : ""}`}
            />
            {!isEditing && voiceSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  listening
                    ? "bg-owe text-paper animate-pulse"
                    : "text-ink/40 hover:text-cover hover:bg-ink/5 dark:text-white/40 dark:hover:text-gold dark:hover:bg-white/5"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                  <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H10.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                </svg>
              </button>
            )}
          </div>
        </label>

        <label className="block">
          <span className={labelCls}>Amount (₹)</span>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`${inputCls} font-mono`}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Paid by</span>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className={inputCls}
          >
            {room.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Date & Time</span>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Note (optional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add details..."
            className={inputCls}
          />
        </label>
      </div>

      {/* Advanced Split Section */}
      <div className="pt-4 border-t border-ink/10 dark:border-white/10">
        <span className={labelCls}>Split Method</span>
        <div className="flex flex-wrap gap-2 mt-3 mb-6 bg-ink/5 dark:bg-white/5 p-1 rounded-xl">
          {[
            { id: "equal", label: "Equally" },
            { id: "exact", label: "Exact Amounts" },
            { id: "percent", label: "Percentages" },
            { id: "shares", label: "By Shares" }
          ].map(method => (
            <button
              key={method.id}
              type="button"
              onClick={() => setSplitMethod(method.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                splitMethod === method.id
                  ? "bg-white dark:bg-[#1a1a1a] text-ink dark:text-white shadow-sm"
                  : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
          {room.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-ink/5 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
              <span className="text-sm font-medium text-ink dark:text-white truncate">{m.name}</span>
              
              {splitMethod === "equal" && (
                <button
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`w-6 h-6 flex items-center justify-center rounded-full border transition-all ${
                    selectedMembers.includes(m.id)
                      ? "bg-cover border-cover text-white"
                      : "border-ink/20 dark:border-white/20 hover:border-cover/50"
                  }`}
                >
                  {selectedMembers.includes(m.id) && (
                    <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )}

              {splitMethod === "exact" && (
                <div className="flex items-center gap-2 max-w-[120px]">
                  <span className="text-xs text-ink/40 dark:text-white/40 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={exactAmounts[m.id]}
                    onChange={(e) => handleExactChange(m.id, e.target.value)}
                    className="w-full bg-transparent border-b border-ink/10 dark:border-white/10 text-right font-mono text-sm outline-none focus:border-cover transition-colors"
                    placeholder="0.00"
                  />
                </div>
              )}

              {splitMethod === "percent" && (
                <div className="flex items-center gap-2 max-w-[100px]">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={percentages[m.id]}
                    onChange={(e) => handlePercentChange(m.id, e.target.value)}
                    className="w-full bg-transparent border-b border-ink/10 dark:border-white/10 text-right font-mono text-sm outline-none focus:border-cover transition-colors"
                    placeholder="0"
                  />
                  <span className="text-xs text-ink/40 dark:text-white/40 font-mono">%</span>
                </div>
              )}

              {splitMethod === "shares" && (
                <div className="flex items-center gap-2 max-w-[100px]">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={shareCounts[m.id]}
                    onChange={(e) => handleShareChange(m.id, e.target.value)}
                    className="w-full bg-transparent border-b border-ink/10 dark:border-white/10 text-right font-mono text-sm outline-none focus:border-cover transition-colors"
                    placeholder="0"
                  />
                  <span className="text-[10px] uppercase text-ink/40 dark:text-white/40 tracking-wider">shares</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-2 bg-cover text-paper rounded-[1rem] py-3.5 text-sm font-medium hover:bg-cover-light transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60"
      >
        {submitting ? "Saving…" : (isEditing ? "Save Changes" : "Log Expense")}
      </button>
    </form>
  );
}
