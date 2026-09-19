import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { formatRupees } from "../lib/format";
import Avatar from "./Avatar.jsx";
import toast from "react-hot-toast";

export default function MessagesSection({ roomId, currentUserId, onRefresh, refreshTrigger }) {
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${roomId}/settlements/suggestions`);
      setPendingSettlements(res.data.pendingSettlements || []);
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
      await api.delete(`/rooms/${roomId}/settlements/pending/${settlementId}`);
      toast.success("Payment message deleted successfully");
      fetchMessages();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted mb-1">
            Payment Notifications Log
          </p>
          <h2 className="text-lg font-medium text-ink dark:text-white flex items-center gap-2">
            💬 Payment Messages ({pendingSettlements.length})
          </h2>
        </div>
        <button
          type="button"
          onClick={fetchMessages}
          className="text-xs font-mono uppercase tracking-wider text-cover dark:text-gold hover:underline"
        >
          Refresh
        </button>
      </div>
      <p className="text-xs text-ink/50 dark:text-dark-ink-muted mb-6">
        All pending payment notifications in this workspace. Any room member can delete outdated or mistaken messages at any time.
      </p>

      {loading ? (
        <p className="font-mono text-xs text-ink/40 dark:text-dark-ink-muted">loading messages...</p>
      ) : pendingSettlements.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-ink/10 dark:border-white/10 rounded-2xl">
          <p className="text-xs text-ink/40 dark:text-white/40 font-mono">
            No active payment messages in this workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingSettlements.map((msg) => {
            const isSender = msg.payer === currentUserId;
            const isReceiver = msg.receiver === currentUserId;

            return (
              <div
                key={msg.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-ink/10 dark:border-white/10 shadow-sm"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="flex items-center -space-x-2 shrink-0 pt-0.5 sm:pt-0">
                    <Avatar name={msg.fromName} size="sm" />
                    <Avatar name={msg.toName} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink dark:text-white">
                        {isSender ? "You" : msg.fromName}
                      </span>
                      <span className="text-xs text-ink/50 dark:text-white/50">notified payment of</span>
                      <span className="font-mono text-sm font-bold text-cover dark:text-gold">
                        {formatRupees(msg.amount)}
                      </span>
                      <span className="text-xs text-ink/50 dark:text-white/50">to</span>
                      <span className="text-sm font-semibold text-ink dark:text-white">
                        {isReceiver ? "You" : msg.toName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono uppercase bg-ink/5 dark:bg-white/10 text-ink/60 dark:text-white/60 px-2 py-0.5 rounded">
                        Method: {msg.paymentMethod || "Cash/UPI"}
                      </span>
                      {msg.date && (
                        <span className="text-[10px] text-ink/40 dark:text-white/40">
                          {new Date(msg.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
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
                    title="Delete message from workspace history (Accessible to any member at any time)"
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
