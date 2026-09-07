import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { receiptImageUrl } from "../lib/api";
import { formatRupees } from "../lib/format";
import { useAuth } from "../context/AuthContext.jsx";
import AppHeader from "../components/AppHeader.jsx";
import Avatar from "../components/Avatar.jsx";
import AddExpenseForm from "../components/AddExpenseForm.jsx";
import SettleUp from "../components/SettleUp.jsx";
import AnalyticsCharts from "../components/AnalyticsCharts.jsx";
import DownloadReportButton from "../components/DownloadReportButton.jsx";
import BudgetAlert from "../components/BudgetAlert.jsx";
import RecurringExpenses from "../components/RecurringExpenses.jsx";

export default function RoomDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAll = useCallback(async () => {
    const [roomRes, dashboardRes] = await Promise.all([
      api.get(`/rooms/${id}`),
      api.get(`/rooms/${id}/dashboard`),
    ]);
    setRoom(roomRes.data.room);
    setDashboard(dashboardRes.data);
    setRefreshKey(prev => prev + 1);
  }, [id]);

  useEffect(() => {
    loadAll().catch((err) =>
      setError(err.response?.data?.error || "Couldn't load this room.")
    );
  }, [loadAll]);

  function copyCode() {
    if (!room) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper dark:bg-dark-bg">
        <AppHeader crumb="Room" />
        <main className="px-6 sm:px-12 py-12 max-w-2xl mx-auto">
          <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2">
            {error}
          </p>
        </main>
      </div>
    );
  }

  if (!room || !dashboard) {
    return (
      <div className="min-h-screen bg-paper dark:bg-dark-bg">
        <AppHeader crumb="Room" />
        <main className="px-6 sm:px-12 py-12 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-ink/10 dark:border-white/10 border-t-cover animate-spin"></div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/40 dark:text-dark-ink-muted">Loading Workspace...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212] selection:bg-cover/20 transition-colors">
      <AppHeader crumb={room.roomName} />

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase bg-ink/5 dark:bg-white/10 text-ink/60 dark:text-white/60 px-2.5 py-1 rounded-md backdrop-blur-sm border border-ink/5 dark:border-white/5">
                Workspace
              </span>
              <span className="text-xs font-medium text-ink/40 dark:text-white/40 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cover"></div>
                {room.members.length} {room.members.length === 1 ? "member" : "members"} active
              </span>
            </div>
            <h1 className="font-display text-5xl lg:text-6xl text-ink dark:text-white tracking-tight">{room.roomName}</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copyCode}
              className="flex items-center gap-3 rounded-full bg-white/60 dark:bg-white/5 border border-ink/10 dark:border-white/10 px-5 py-2.5 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm backdrop-blur-sm"
              title="Copy room code"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50">
                Code
              </span>
              <span className="font-mono text-base font-bold tracking-[0.15em] text-ink dark:text-white">
                {room.roomCode}
              </span>
              <span className="font-mono text-[10px] text-cover dark:text-gold">
                {copied ? "Copied!" : ""}
              </span>
            </button>
            <DownloadReportButton roomId={id} roomName={room.roomName} />
            <Link
              to={`/rooms/${id}/history`}
              className="flex items-center gap-2 rounded-full bg-white/60 dark:bg-white/5 border border-ink/10 dark:border-white/10 px-5 py-2.5 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm backdrop-blur-sm font-mono text-[10px] uppercase tracking-widest text-ink/70 dark:text-white/70"
            >
              History →
            </Link>
          </div>
        </div>

        {/* 4-Column Stat Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          <StatCard label="Total this month" value={formatRupees(dashboard.totalThisMonth)} />
          <StatCard label="Your spend this month" value={formatRupees(dashboard.myContributionThisMonth)} />
          <StatCard label="To Pay" value={formatRupees(dashboard.youOwe)} tone="owe" />
          <StatCard label="To Receive" value={formatRupees(dashboard.youAreOwed)} tone="owed" />
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column (Spans 8) - Main Activity */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-10">
            
            {/* Add Expense Section */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-2 shadow-sm">
              {showAddExpense ? (
                <div className="p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] rounded-[1.5rem] shadow-lg">
                  <AddExpenseForm
                    room={room}
                    currentUserId={user.id}
                    onClose={() => setShowAddExpense(false)}
                    onCreated={() => {
                      setShowAddExpense(false);
                      loadAll();
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="w-full group flex items-center justify-center gap-4 py-8 rounded-[1.5rem] border-2 border-dashed border-ink/15 dark:border-white/15 hover:border-cover dark:hover:border-cover hover:bg-cover/5 dark:hover:bg-cover/10 transition-all"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-cover text-white shadow-lg group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </div>
                  <span className="font-display text-2xl text-ink dark:text-white">Log an Expense</span>
                </button>
              )}
            </div>

            {/* Recent expenses */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted">
                  Recent Activity
                </p>
                <Link to={`/rooms/${id}/history`} className="text-xs font-medium text-cover hover:underline">View all</Link>
              </div>
              
              {dashboard.recentExpenses.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-ink/10 dark:border-white/10 rounded-2xl">
                  <p className="text-ink/40 dark:text-white/40">No expenses logged yet. Add one above.</p>
                </div>
              ) : (
                <div className="divide-y divide-ink/5 dark:divide-white/5">
                  {dashboard.recentExpenses.slice(0, 5).map((exp) => (
                    <div key={exp.id} className="group flex items-center justify-between py-4 gap-4 hover:bg-ink/5 dark:hover:bg-white/5 -mx-4 px-4 rounded-xl transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        {exp.receiptUrl ? (
                          <a href={receiptImageUrl(exp.receiptUrl)} target="_blank" rel="noreferrer" className="shrink-0 relative overflow-hidden rounded-xl border border-ink/10 dark:border-white/10 shadow-sm">
                            <img
                              src={receiptImageUrl(exp.receiptUrl)}
                              alt="Receipt"
                              className="w-12 h-12 object-cover hover:scale-110 transition-transform duration-300"
                            />
                          </a>
                        ) : (
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-ink/5 dark:bg-white/5 flex items-center justify-center border border-ink/5 dark:border-white/5">
                            <span className="font-mono text-xs text-ink/40 dark:text-white/40">{exp.category.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-medium truncate text-ink dark:text-white">{exp.title}</p>
                            {exp.shares && exp.shares.length === 1 && (
                              <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider bg-cover/10 text-cover dark:text-gold dark:bg-gold/10 px-2 py-0.5 rounded-full border border-cover/20 dark:border-gold/20">
                                Personal
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5">
                            {exp.category} · paid by <span className="font-medium text-ink/70 dark:text-white/70">{exp.paidBy.name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-lg font-medium text-ink dark:text-white">{formatRupees(exp.amount)}</p>
                        <p className="text-[10px] uppercase tracking-widest text-ink/40 dark:text-white/30 mt-1 flex flex-col items-end gap-0.5">
                          <span>{new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                          <span className="text-[9px] opacity-70">{new Date(exp.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analytics */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted mb-4 pl-2">
                Spending Analytics
              </p>
              <AnalyticsCharts
                categoryBreakdown={dashboard.categoryBreakdown}
                monthlyTrend={dashboard.monthlyTrend}
                memberContribution={dashboard.memberContribution}
                dailyTrend={dashboard.dailyTrend}
              />
            </div>

          </div>

          {/* Right Column (Spans 4) - Management */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">
            
            {/* Budget Alert Component manages its own styling, but we wrap it for consistent layout */}
            <BudgetAlert
              roomId={id}
              totalThisMonth={dashboard.totalThisMonth}
              onBudgetChange={loadAll}
            />
            
            <SettleUp roomId={id} currentUserId={user.id} onSettled={loadAll} refreshTrigger={refreshKey} />
            
            <RecurringExpenses
              room={room}
              currentUserId={user.id}
              onExpenseLogged={loadAll}
            />

            {/* Members Widget */}
            <div className="bg-white/40 dark:bg-white/5 border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50 mb-5">
                Workspace Members
              </p>
              <div className="space-y-4">
                {room.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.name} size="md" />
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-white">{m.name}</p>
                      <p className="text-xs text-ink/40 dark:text-white/40">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const isOwe = tone === "owe";
  const isOwed = tone === "owed";
  
  let bgClass = "bg-white/60 dark:bg-white/5";
  let borderClass = "border-ink/10 dark:border-white/10";
  let textClass = "text-ink dark:text-white";
  let shadowClass = "shadow-sm";
  
  if (isOwe) {
    bgClass = "bg-gradient-to-br from-owe/10 to-owe/5 dark:from-owe/20 dark:to-owe/5";
    borderClass = "border-owe/20 dark:border-owe/20";
    textClass = "text-owe dark:text-red-400";
    shadowClass = "shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)]";
  } else if (isOwed) {
    bgClass = "bg-gradient-to-br from-owed/10 to-owed/5 dark:from-owed/20 dark:to-owed/5";
    borderClass = "border-owed/20 dark:border-owed/20";
    textClass = "text-owed dark:text-emerald-400";
    shadowClass = "shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]";
  }

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] p-6 sm:p-8 border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${bgClass} ${borderClass} ${shadowClass}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-white/50 mb-3 relative z-10">
        {label}
      </p>
      <p className={`font-display text-3xl sm:text-4xl tracking-tight relative z-10 ${textClass}`}>
        {value}
      </p>
      
      {/* Decorative background glow for tone cards */}
      {(isOwe || isOwed) && (
        <div className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-50 ${isOwe ? 'bg-owe' : 'bg-owed'}`}></div>
      )}
    </div>
  );
}
