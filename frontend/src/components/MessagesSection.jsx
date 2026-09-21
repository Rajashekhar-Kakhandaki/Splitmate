import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { formatRupees } from "../lib/format";
import Avatar from "./Avatar.jsx";
import toast from "react-hot-toast";

export default function MessagesSection({ roomId, currentUserId, onRefresh, refreshTrigger }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState("all"); // "all", "pending", "settled", "upi", "cash", "unspecified"

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${roomId}/settlements/suggestions`);
      setMessages(res.data.allMessages || res.data.pendingSettlements || []);
    } catch (err) {
      console.error("Failed to load payment messages:", err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, refreshTrigger]);

  async function handleDeleteMessage(settlementId) {
    setDeletingId(settlementId);
    try {
      await api.delete(`/rooms/${roomId}/settlements/${settlementId}`);
      toast.success("Payment message deleted successfully");
      fetchMessages();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpdateMethod(settlementId, newMethod) {
    setUpdatingId(settlementId);
    try {
      await api.patch(`/rooms/${roomId}/settlements/${settlementId}`, { paymentMethod: newMethod });
      toast.success(`Payment method updated to ${newMethod}`);
      fetchMessages();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update payment method");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredMessages = messages.filter((msg) => {
    const rawMethod = (msg.paymentMethod || "").toLowerCase();
    if (filter === "pending") return msg.status === "pending";
    if (filter === "settled") return msg.status === "settled";
    if (filter === "upi") return rawMethod === "upi";
    if (filter === "cash") return rawMethod === "cash";
    if (filter === "unspecified") return !msg.paymentMethod;
    return true; // "all"
  });

  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const settledCount = messages.filter((m) => m.status === "settled").length;
  const upiCount = messages.filter((m) => (m.paymentMethod || "").toLowerCase() === "upi").length;
  const cashCount = messages.filter((m) => (m.paymentMethod || "").toLowerCase() === "cash").length;
  const unspecifiedCount = messages.filter((m) => !m.paymentMethod).length;

  return (
    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted mb-0.5">
            Payment Notifications & Transaction Log
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-ink dark:text-white flex items-center gap-2">
              💬 Messages & History ({messages.length})
            </h2>
            <button
              onClick={() => fetchMessages()}
              className="text-xs text-ink/40 dark:text-white/40 hover:text-ink dark:hover:text-white p-1 rounded transition-colors"
              title="Refresh messages"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-ink/5 dark:bg-white/10 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              filter === "all"
                ? "bg-white dark:bg-dark-surface text-ink dark:text-white font-semibold shadow-sm"
                : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
            }`}
          >
            All ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              filter === "pending"
                ? "bg-white dark:bg-dark-surface text-ink dark:text-white font-semibold shadow-sm"
                : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("settled")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              filter === "settled"
                ? "bg-white dark:bg-dark-surface text-ink dark:text-white font-semibold shadow-sm"
                : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
            }`}
          >
            Confirmed ({settledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("upi")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              filter === "upi"
                ? "bg-white dark:bg-dark-surface text-ink dark:text-white font-semibold shadow-sm"
                : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
            }`}
          >
            ⚡ UPI ({upiCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("cash")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              filter === "cash"
                ? "bg-white dark:bg-dark-surface text-ink dark:text-white font-semibold shadow-sm"
                : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
            }`}
          >
            💵 Cash ({cashCount})
          </button>
          {unspecifiedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("unspecified")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                filter === "unspecified"
                  ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 font-semibold shadow-sm"
                  : "text-amber-600 dark:text-amber-400 hover:opacity-80"
              }`}
            >
              ❓ Unset ({unspecifiedCount})
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-ink/50 dark:text-dark-ink-muted mb-5">
        Complete history of payment notifications sent, confirmed settlements, UPI & Cash messages. Click the method badge on any message to toggle between UPI & Cash.
      </p>

      {loading ? (
        <p className="font-mono text-xs text-ink/40 dark:text-dark-ink-muted">loading transaction messages log...</p>
      ) : filteredMessages.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-ink/10 dark:border-white/10 rounded-2xl">
          <p className="text-xs text-ink/40 dark:text-white/40 font-mono">
            {filter === "all"
              ? "No messages found in this workspace."
              : `No ${filter} messages found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
          {filteredMessages.map((msg) => {
            const isSender = msg.payer === currentUserId;
            const isReceiver = msg.receiver === currentUserId;
            const isPending = msg.status === "pending";
            const rawMethod = (msg.paymentMethod || "").toUpperCase();

            return (
              <div
                key={msg.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  isPending
                    ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/25 shadow-sm"
                    : "bg-white/60 dark:bg-black/20 border-ink/10 dark:border-white/10"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="flex items-center -space-x-2 shrink-0 pt-0.5 sm:pt-0">
                    <Avatar name={msg.fromName} size="sm" />
                    <Avatar name={msg.toName} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-ink dark:text-white">
                        {isSender ? "You" : msg.fromName}
                      </span>
                      <span className="text-xs text-ink/60 dark:text-white/60">
                        {isPending ? "sent notification of" : "paid"}
                      </span>
                      <span className="font-mono text-sm font-bold text-cover dark:text-gold">
                        {formatRupees(msg.amount)}
                      </span>
                      <span className="text-xs text-ink/60 dark:text-white/60">to</span>
                      <span className="text-sm font-semibold text-ink dark:text-white">
                        {isReceiver ? "You" : msg.toName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Status Tag */}
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${
                          isPending
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {isPending ? "⏰ Pending Notification" : "✓ Confirmed Settlement"}
                      </span>

                      {/* Payment Method Badge / Toggle */}
                      {rawMethod === "UPI" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateMethod(msg.id, "Cash")}
                          disabled={updatingId === msg.id}
                          className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20 transition-all cursor-pointer"
                          title="Click to switch method to Cash"
                        >
                          ⚡ UPI Payment ⚙️
                        </button>
                      ) : rawMethod === "CASH" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateMethod(msg.id, "UPI")}
                          disabled={updatingId === msg.id}
                          className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          title="Click to switch method to UPI"
                        >
                          💵 Cash Payment ⚙️
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                            ❓ Unset
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateMethod(msg.id, "UPI")}
                            disabled={updatingId === msg.id}
                            className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded hover:bg-indigo-500/30 cursor-pointer"
                          >
                            Set UPI
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMethod(msg.id, "Cash")}
                            disabled={updatingId === msg.id}
                            className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-500/30 cursor-pointer"
                          >
                            Set Cash
                          </button>
                        </div>
                      )}

                      {/* Timestamp */}
                      {msg.date && (
                        <span className="text-[10px] text-ink/40 dark:text-white/40 font-mono">
                          {new Date(msg.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{" "}
                          at {new Date(msg.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-ink/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(msg.id)}
                    disabled={deletingId === msg.id}
                    className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider bg-owe/10 hover:bg-owe/20 text-owe border border-owe/30 rounded-xl px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    title="Delete this message/payment record from history for corrections"
                  >
                    <span>🗑️</span>
                    <span>{deletingId === msg.id ? "Deleting..." : "Delete Message"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
