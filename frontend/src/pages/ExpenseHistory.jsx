import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { receiptImageUrl } from "../lib/api";
import { formatRupees } from "../lib/format";
import AppHeader from "../components/AppHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AddExpenseForm from "../components/AddExpenseForm.jsx";
import toast from "react-hot-toast";

const inputCls = "mt-1.5 w-full rounded-xl border border-ink/15 dark:border-white/10 bg-white/50 dark:bg-black/20 text-ink dark:text-white px-4 py-2.5 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all backdrop-blur-sm";
const labelCls = "text-[10px] font-mono uppercase tracking-widest text-ink/50 dark:text-white/50";

export default function ExpenseHistory() {
  const { id } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [error, setError] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payer, setPayer] = useState("");

  useEffect(() => {
    api
      .get(`/rooms/${id}`)
      .then((res) => setRoom(res.data.room))
      .catch((err) => setError(err.response?.data?.error || "Couldn't load this room."));
  }, [id]);

  async function search() {
    setError("");
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (from) params.from = from;
      if (to) params.to = to;
      if (payer) params.payer = payer;
      const res = await api.get(`/rooms/${id}/expenses`, { params });
      setExpenses(res.data.expenses);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't search expenses.");
    }
  }

  useEffect(() => {
    if (room) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  function handleSubmit(e) {
    e.preventDefault();
    search();
  }

  function clearFilters() {
    setKeyword("");
    setFrom("");
    setTo("");
    setPayer("");
    setTimeout(search, 0);
  }

  async function confirmDelete() {
    if (!deletingExpense) return;
    try {
      await api.delete(`/rooms/${id}/expenses/${deletingExpense.id}`);
      toast.success("Expense deleted successfully");
      setDeletingExpense(null);
      search();
    } catch (err) {
      toast.error(err.response?.data?.error || "Couldn't delete expense.");
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212]">
        <AppHeader crumb="History" />
        <main className="px-6 sm:px-12 py-12 max-w-2xl mx-auto">
          <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2">
            {error}
          </p>
        </main>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212]">
        <AppHeader crumb="History" />
        <main className="px-6 sm:px-12 py-12 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-ink/10 dark:border-white/10 border-t-cover animate-spin"></div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/40 dark:text-dark-ink-muted">Loading History...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212] selection:bg-cover/20 transition-colors">
      <AppHeader crumb={`${room.roomName} · History`} />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <main className="mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-16 max-w-[1400px] w-full animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase bg-ink/5 dark:bg-white/10 text-ink/60 dark:text-white/60 px-2.5 py-1 rounded-md backdrop-blur-sm border border-ink/5 dark:border-white/5">
                History
              </span>
            </div>
            <h1 className="font-display text-5xl lg:text-6xl text-ink dark:text-white tracking-tight">Ledger</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50">
              Workspace Code: 
            </span>
            <span className="font-mono text-base font-bold tracking-[0.15em] text-ink dark:text-white">
              {room.roomCode}
            </span>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column (Spans 4) - Filters */}
          <div className="lg:col-span-4 flex flex-col gap-8 sticky top-8">
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50 mb-6">
                Search & Filters
              </p>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <label className="block">
                  <span className={labelCls}>Keyword</span>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. Milk, Uber"
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <span className={labelCls}>Member / Paid by</span>
                  <select
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Anyone</option>
                    {room?.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className={labelCls}>From</span>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className={inputCls}
                    />
                  </label>

                  <label className="block">
                    <span className={labelCls}>To</span>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    type="submit"
                    className="w-full bg-cover text-paper rounded-[1rem] px-4 py-3.5 text-sm font-medium hover:bg-cover-light transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full text-sm font-medium text-ink/50 dark:text-white/50 hover:text-ink dark:hover:text-white px-4 py-3 transition-colors rounded-[1rem] border border-transparent hover:border-ink/10 dark:hover:border-white/10 hover:bg-ink/5 dark:hover:bg-white/5"
                  >
                    Clear filters
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column (Spans 8) - Results */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {expenses === null ? (
              <div className="py-20 flex justify-center">
                <p className="font-mono text-xs uppercase tracking-widest text-ink/40 dark:text-dark-ink-muted animate-pulse">Searching...</p>
              </div>
            ) : expenses?.length === 0 ? (
              <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-16 shadow-sm text-center">
                <p className="text-lg font-medium text-ink/40 dark:text-white/40">No expenses match those filters.</p>
                <p className="text-sm text-ink/30 dark:text-white/30 mt-2">Try adjusting your search criteria.</p>
              </div>
            ) : (
              <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50">
                    Results ({expenses.length})
                  </p>
                </div>
                
                <div className="divide-y divide-ink/5 dark:divide-white/5">
                  {expenses?.map((exp) => {
                    const selectedMemberShare = payer ? exp.shares?.find((s) => s.memberId === payer) : null;
                    const isSelectedMemberPayer = payer ? exp.paidBy.id === payer : true;
                    const isIndividual = exp.shares && exp.shares.length === 1;
                    const isSelective = exp.shares && exp.shares.length > 1 && room?.members && exp.shares.length < room.members.length;

                    let displayAmount = exp.amount;
                    let amountSubtitle = null;

                    if (payer && !isSelectedMemberPayer && selectedMemberShare) {
                      displayAmount = selectedMemberShare.shareAmount;
                      const selectedName = room?.members.find((m) => m.id === payer)?.name || "Member";
                      amountSubtitle = `${selectedName}'s split share (Total bill: ${formatRupees(exp.amount)})`;
                    }

                    return (
                      <div key={exp.id} className="group flex items-center justify-between py-5 gap-4 hover:bg-ink/5 dark:hover:bg-white/5 -mx-4 px-4 rounded-xl transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          {exp.receiptUrl ? (
                            <a href={receiptImageUrl(exp.receiptUrl)} target="_blank" rel="noreferrer" className="shrink-0 relative overflow-hidden rounded-xl border border-ink/10 dark:border-white/10 shadow-sm">
                              <img
                                src={receiptImageUrl(exp.receiptUrl)}
                                alt="Receipt"
                                className="w-14 h-14 object-cover hover:scale-110 transition-transform duration-300"
                              />
                            </a>
                          ) : (
                            <div className="shrink-0 w-14 h-14 rounded-xl bg-ink/5 dark:bg-white/5 flex items-center justify-center border border-ink/5 dark:border-white/5">
                              <span className="font-mono text-sm text-ink/40 dark:text-white/40">{exp.category.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-medium truncate text-ink dark:text-white">{exp.title}</p>
                              {isIndividual && (
                                <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider bg-cover/10 text-cover dark:text-gold dark:bg-gold/10 px-2 py-0.5 rounded-full border border-cover/20 dark:border-gold/20">
                                  Personal
                                </span>
                              )}
                              {isSelective && (
                                <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                                  {exp.shares.length} Members
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-ink/60 dark:text-white/50 mt-0.5">
                              {exp.category} · paid by <span className="font-medium text-ink/80 dark:text-white/80">{exp.paidBy.name}</span>
                            </p>
                            {amountSubtitle && (
                              <p className="text-xs font-mono text-cover dark:text-gold mt-0.5">
                                {amountSubtitle}
                              </p>
                            )}
                            {exp.note && (
                              <p className="text-xs text-ink/40 dark:text-white/40 mt-1 line-clamp-1 italic">
                                "{exp.note}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-4 border-l border-ink/5 dark:border-white/5 pl-4 ml-2 relative">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 absolute right-4 z-20 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md p-1 rounded-xl border border-ink/15 dark:border-white/15 shadow-xl">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExpense(exp);
                              }}
                              className="text-xs uppercase tracking-wider font-semibold text-ink/80 dark:text-white/80 hover:text-cover dark:hover:text-gold px-3 py-1.5 hover:bg-ink/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingExpense(exp);
                              }}
                              className="text-xs uppercase tracking-wider font-semibold text-owe hover:text-red-500 px-3 py-1.5 hover:bg-owe/10 rounded-lg transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="text-right group-hover:opacity-10 transition-opacity">
                            <p className="font-mono text-xl font-medium text-ink dark:text-white">{formatRupees(displayAmount)}</p>
                            <p className="text-[10px] uppercase tracking-widest text-ink/40 dark:text-white/30 mt-1 flex flex-col items-end gap-0.5">
                              <span>
                                {new Date(exp.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="text-[9px] opacity-70">
                                {new Date(exp.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
          </div>

        </div>
      </main>

      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl">
            <AddExpenseForm
              room={room}
              currentUserId={user.id}
              initialData={editingExpense}
              onClose={() => setEditingExpense(null)}
              onCreated={() => {
                setEditingExpense(null);
                search();
              }}
            />
          </div>
        </div>
      )}

      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 shadow-2xl border border-ink/10 dark:border-white/10">
            <h3 className="text-xl font-display text-ink dark:text-white mb-2">Delete Expense?</h3>
            <p className="text-sm text-ink/60 dark:text-white/60 mb-6">
              Are you sure you want to delete "{deletingExpense.title}"? This will permanently remove it and recalculate everyone's balances.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeletingExpense(null)}
                className="flex-1 text-sm font-medium text-ink dark:text-white bg-ink/5 dark:bg-white/5 hover:bg-ink/10 dark:hover:bg-white/10 py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 text-sm font-medium text-paper bg-owe hover:bg-red-600 py-3 rounded-xl transition-colors shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
