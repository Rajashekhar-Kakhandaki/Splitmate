import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatRupees } from "../lib/format";
import Avatar from "./Avatar.jsx";
import toast from "react-hot-toast";

export default function SettleUp({ roomId, currentUserId, onSettled, refreshTrigger }) {
  const [suggestions, setSuggestions] = useState(null);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [error, setError] = useState("");
  const [settlingKey, setSettlingKey] = useState(null);
  const [notifyingKey, setNotifyingKey] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [customAmounts, setCustomAmounts] = useState({});
  const [upiConfirmPayment, setUpiConfirmPayment] = useState(null);

  async function refresh() {
    const res = await api.get(`/rooms/${roomId}/settlements/suggestions`);
    setSuggestions(res.data.suggestions);
    setPendingSettlements(res.data.pendingSettlements || []);
  }

  useEffect(() => {
    refresh().catch(() => setError("Couldn't load settle-up suggestions."));
    // Request notification permission if not already granted
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [roomId, refreshTrigger]);

  // Trigger browser notification for new pending settlements directed at me
  useEffect(() => {
    if (pendingSettlements.length === 0) return;
    const myPendings = pendingSettlements.filter((p) => p.receiver === currentUserId);
    
    if ("Notification" in window && Notification.permission === "granted") {
      myPendings.forEach(p => {
        const seenKey = `seen_notify_${p.id}`;
        if (!sessionStorage.getItem(seenKey)) {
          new Notification("Payment Notification", {
            body: `${p.fromName} says they sent you ${formatRupees(p.amount)}. Please confirm and mark settled.`,
          });
          sessionStorage.setItem(seenKey, "true");
        }
      });
    }
  }, [pendingSettlements, currentUserId]);

  async function markSettled(s) {
    const key = `${s.from}-${s.to}`;
    const amountToSettle = s.customAmount || Number(customAmounts[key] !== undefined ? customAmounts[key] : s.amount) || s.amount;
    setError("");
    setSettlingKey(key);
    try {
      await api.post(`/rooms/${roomId}/settlements`, {
        payer: s.from,
        receiver: s.to,
        amount: amountToSettle,
        status: "settled",
      });
      setCustomAmounts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await refresh();
      onSettled?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't mark that as settled.");
    } finally {
      setSettlingKey(null);
    }
  }

  async function notifyPaid(s, paymentMethod) {
    const key = `${s.from}-${s.to}`;
    const amountToPay = Number(customAmounts[key] !== undefined ? customAmounts[key] : s.amount) || s.amount;
    setError("");
    setNotifyingKey(key);
    try {
      await api.post(`/rooms/${roomId}/settlements`, {
        payer: s.from,
        receiver: s.to,
        amount: amountToPay,
        status: "pending",
        paymentMethod,
      });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't send notification.");
    } finally {
      setNotifyingKey(null);
    }
  }

  async function cancelPendingSettlement(pendingId, isSender = false) {
    setCancellingId(pendingId);
    setError("");
    try {
      await api.delete(`/rooms/${roomId}/settlements/pending/${pendingId}`);
      toast.success(isSender ? "Payment notification taken back." : "Marked as not received.");
      await refresh();
      onSettled?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't cancel notification.");
    } finally {
      setCancellingId(null);
    }
  }

  function payViaUpi(s) {
    const key = `${s.from}-${s.to}`;
    const amountToPay = Number(customAmounts[key] !== undefined ? customAmounts[key] : s.amount) || s.amount;

    const upiId = s.toUpiId ? s.toUpiId.trim() : "";
    const payeeName = encodeURIComponent(s.toName || "Member");
    const note = encodeURIComponent(`SplitMate settlement to ${s.toName}`);

    const upiUrl = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&am=${amountToPay.toFixed(2)}&tn=${note}&cu=INR`
      : `upi://pay?pn=${payeeName}&am=${amountToPay.toFixed(2)}&tn=${note}&cu=INR`;

    // Trigger native UPI app (Google Pay, PhonePe, Paytm, BHIM) intent launcher
    window.location.href = upiUrl;

    // Show confirmation banner upon returning to SplitMate
    setUpiConfirmPayment({ suggestion: s, amountToPay });
  }

  async function confirmUpiSent() {
    if (!upiConfirmPayment) return;
    const { suggestion } = upiConfirmPayment;
    setUpiConfirmPayment(null);
    await notifyPaid(suggestion, "UPI");
  }

  function cancelUpiSent() {
    setUpiConfirmPayment(null);
  }

  if (suggestions === null && !error) {
    return <p className="font-mono text-xs text-ink/40 dark:text-dark-ink-muted">loading settle up…</p>;
  }

  return (
    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted mb-1">
        Settle up
      </p>
      <p className="text-xs text-ink/50 dark:text-dark-ink-muted mb-4">
        The fewest payments that would clear every balance in this room.
      </p>

      {error && (
        <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* UPI Post-Launch Confirmation Banner */}
      {upiConfirmPayment && (
        <div className="mb-5 p-4 bg-cover/10 border border-cover/30 rounded-2xl animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-cover dark:text-gold font-bold">
              ⚡ UPI Payment Confirmation
            </span>
          </div>
          <p className="text-xs text-ink/80 dark:text-white/80 mb-3">
            Did your payment of <span className="font-mono font-bold">{formatRupees(upiConfirmPayment.amountToPay)}</span> to <span className="font-semibold">{upiConfirmPayment.suggestion.toName}</span> succeed in your UPI app?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={confirmUpiSent}
              className="flex-1 bg-cover text-white font-mono text-[10px] uppercase tracking-wider py-2 px-3 rounded-xl font-semibold shadow-sm hover:bg-cover-light transition-all cursor-pointer"
            >
              Yes, Payment Sent
            </button>
            <button
              onClick={cancelUpiSent}
              className="flex-1 bg-ink/5 dark:bg-white/10 text-ink/70 dark:text-white/70 font-mono text-[10px] uppercase tracking-wider py-2 px-3 rounded-xl hover:bg-ink/10 dark:hover:bg-white/20 transition-all cursor-pointer"
            >
              No, Cancelled
            </button>
          </div>
        </div>
      )}

      {/* Receiver Alert Banner */}
      {pendingSettlements.filter(p => p.receiver === currentUserId).map(p => (
        <div key={p.id} className="flex flex-col gap-3 p-4 mb-5 rounded-2xl bg-cover/10 border border-cover/20 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar name={p.fromName} size="sm" />
            <p className="leading-snug text-sm text-ink dark:text-white">
              <span className="font-medium text-cover dark:text-gold">{p.fromName}</span> says they sent you{" "}
              <span className="font-mono font-medium">{formatRupees(p.amount)}</span>. 
            </p>
          </div>
          <div className="pl-[2.25rem] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-ink/70 dark:text-white/60">
              <span className="font-medium">Method:</span> {p.paymentMethod || "Other"}<br/>
              Check your account to confirm.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => cancelPendingSettlement(p.id, false)}
                disabled={cancellingId === p.id}
                className="text-xs font-mono uppercase tracking-widest bg-owe/10 hover:bg-owe/20 text-owe border border-owe/30 rounded-lg px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                title="Decline if money was not received in your account"
              >
                {cancellingId === p.id ? "..." : "Not Received"}
              </button>
              <button
                onClick={() => markSettled({ from: p.payer, to: p.receiver, amount: p.amount, customAmount: p.amount })}
                disabled={settlingKey === `${p.payer}-${p.receiver}`}
                className="text-xs font-mono uppercase tracking-widest bg-cover text-paper rounded-lg px-4 py-2 hover:bg-cover-light transition-all shadow-md disabled:opacity-50"
              >
                {settlingKey === `${p.payer}-${p.receiver}` ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {suggestions?.length === 0 && (
        <p className="text-sm text-owed">Everyone's settled up. Nothing to pay.</p>
      )}

      <div className="space-y-3">
        {suggestions?.map((s) => {
          const key = `${s.from}-${s.to}`;
          // Highlight rows that involve the current user
          const iAmPayer    = s.from === currentUserId; // I owe money → I can mark settled
          const iAmReceiver = s.to   === currentUserId; // someone owes me
          const involvesMe  = iAmPayer || iAmReceiver;

          const pendingNotice = pendingSettlements.find((p) => p.payer === s.from && p.receiver === s.to);

          return (
            <div
              key={key}
              className={`flex flex-col rounded-[1.25rem] p-4 border gap-4 ${
                involvesMe
                  ? "border-cover/30 bg-cover/5 dark:border-gold/30 dark:bg-gold/5 shadow-sm"
                  : "border-ink/10 dark:border-white/10"
              }`}
            >
              {/* Who pays whom */}
              <div className="flex items-center gap-3 text-sm min-w-0">
                <div className="flex items-center -space-x-2 shrink-0">
                  <Avatar name={s.fromName} size="sm" />
                  <Avatar name={s.toName} size="sm" />
                </div>
                <div className="truncate flex-1">
                  <span className={`font-medium ${iAmPayer ? "text-owe" : "text-ink/80 dark:text-white/80"}`}>
                    {iAmPayer ? "You" : s.fromName}
                  </span>
                  <span className="text-ink/40 dark:text-white/40 mx-2 text-xs uppercase tracking-widest font-mono">owe</span>
                  <span className={`font-medium ${iAmReceiver ? "text-owed" : "text-ink/80 dark:text-white/80"}`}>
                    {iAmReceiver ? "You" : s.toName}
                  </span>
                  {s.toUpiId && (
                    <span className="ml-2 text-[10px] font-mono bg-ink/5 dark:bg-white/10 px-2 py-0.5 rounded text-ink/60 dark:text-white/60">
                      {s.toUpiId}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount + action */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 bg-white/60 dark:bg-black/20 rounded-xl p-2.5 border border-ink/5 dark:border-white/5">
                {involvesMe ? (
                  <div className="flex items-center gap-2 border-b-2 border-ink/10 focus-within:border-cover dark:border-white/10 dark:focus-within:border-gold px-2 pb-1 transition-colors w-full sm:w-auto">
                    <span className="font-mono text-sm text-ink/40 dark:text-white/40">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={s.amount}
                      value={customAmounts[key] !== undefined ? customAmounts[key] : s.amount}
                      onChange={(e) => setCustomAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full sm:w-20 bg-transparent outline-none font-mono text-lg font-semibold text-ink dark:text-white text-right"
                    />
                  </div>
                ) : (
                  <span className="font-mono text-lg font-semibold text-ink dark:text-white pl-2">
                    {formatRupees(s.amount)}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  {iAmReceiver ? (
                    <button
                      id={`settle-btn-${key}`}
                      onClick={() => markSettled(s)}
                      disabled={settlingKey === key}
                      className="w-full sm:w-auto text-[10px] font-mono uppercase tracking-widest bg-cover text-paper rounded-lg px-4 py-2.5 hover:bg-cover-light transition-all shadow-md disabled:opacity-60"
                    >
                      {settlingKey === key ? "…" : "Mark settled"}
                    </button>
                  ) : iAmPayer ? (
                    pendingNotice ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-cover dark:text-gold border border-cover/20 dark:border-gold/20 bg-cover/5 dark:bg-gold/5 rounded-lg px-3 py-2 text-center">
                          Notification sent
                        </span>
                        <button
                          type="button"
                          onClick={() => cancelPendingSettlement(pendingNotice.id, true)}
                          disabled={cancellingId === pendingNotice.id}
                          className="text-[10px] font-mono uppercase tracking-widest text-owe hover:bg-owe/10 border border-owe/30 rounded-lg px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                          title="Recall/take back mistaken payment notification"
                        >
                          {cancellingId === pendingNotice.id ? "..." : "Take Back"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => payViaUpi(s)}
                          disabled={notifyingKey === key}
                          className="flex-1 sm:flex-none text-[10px] font-mono uppercase tracking-widest bg-cover text-white rounded-lg px-3.5 py-2.5 hover:bg-cover-light transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60 font-semibold cursor-pointer"
                          title={s.toUpiId ? `Pay ${s.toUpiId} via Google Pay / PhonePe / Paytm` : `Pay ${s.toName} via UPI app`}
                        >
                          <span>⚡ Pay via UPI</span>
                        </button>
                        <button
                          onClick={() => notifyPaid(s, "Cash")}
                          disabled={notifyingKey === key}
                          className="flex-1 sm:flex-none text-[10px] font-mono uppercase tracking-widest bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-ink dark:text-white rounded-lg px-3 py-2.5 hover:bg-ink/10 dark:hover:bg-white/10 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          {notifyingKey === key ? "…" : "Cash"}
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
