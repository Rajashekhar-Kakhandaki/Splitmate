import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";
import { useTheme } from "../context/ThemeContext.jsx";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

// Ledger-book palette, reused across every chart so colors stay consistent
// with the rest of the app.
const PALETTE = ["#14251C", "#B08D57", "#2F6F5E", "#A23B3B", "#3B5BA2", "#7A4FA3", "#B0703E", "#6B8E23", "#8B5E3C", "#4A6670", "#9B7EDE"];

export default function AnalyticsCharts({
  categoryBreakdown,
  monthlyTrend,
  memberContribution,
  dailyTrend = [],
  myDailyTrend = [],
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [dailyViewMode, setDailyViewMode] = useState("mine"); // "mine" | "group"

  const textColor = isDark ? "#8A9E8E" : "#23201A";
  const borderColor = isDark ? "#0F1A14" : "#F5EFDE";

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { family: "Inter", size: 11 }, color: textColor } },
    },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: isDark ? "rgba(45,68,56,0.4)" : "rgba(0,0,0,0.05)" } },
      y: { ticks: { color: textColor }, grid: { color: isDark ? "rgba(45,68,56,0.4)" : "rgba(0,0,0,0.05)" } },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { family: "Inter", size: 11 }, color: textColor } },
    },
  };

  const categoryData = useMemo(() => {
    const safeCategory = categoryBreakdown || {};
    const labels = Object.keys(safeCategory);
    const values = Object.values(safeCategory);
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: borderColor,
          borderWidth: 2,
        },
      ],
    };
  }, [categoryBreakdown, borderColor]);

  const monthlyData = useMemo(
    () => ({
      labels: (monthlyTrend || []).map((m) => m?.month || ""),
      datasets: [
        {
          label: "Spend",
          data: (monthlyTrend || []).map((m) => m?.total || 0),
          backgroundColor: isDark ? "#2D4438" : "#14251C",
          borderRadius: 4,
        },
      ],
    }),
    [monthlyTrend, isDark]
  );

  const memberData = useMemo(
    () => ({
      labels: (memberContribution || []).map((m) => m?.name || "Member"),
      datasets: [
        {
          label: "Paid this month",
          data: (memberContribution || []).map((m) => m?.total || 0),
          backgroundColor: (memberContribution || []).map((_, i) => PALETTE[i % PALETTE.length]),
          borderRadius: 4,
        },
      ],
    }),
    [memberContribution]
  );

  // Dynamic daily data according to selected dailyViewMode ("mine" vs "group")
  const activeDailyData = useMemo(() => {
    const labels = (dailyTrend || []).map((d) => d?.day || "");

    if (dailyViewMode === "mine") {
      return {
        labels,
        datasets: [
          {
            label: "Your daily spend",
            data: (myDailyTrend || []).map((d) => d?.total || 0),
            borderColor: "#2F6F5E",
            backgroundColor: "rgba(47, 111, 94, 0.15)",
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      };
    }

    // "group" mode
    return {
      labels,
      datasets: [
        {
          label: "Group daily spend",
          data: (dailyTrend || []).map((d) => d?.total || 0),
          borderColor: "#B08D57",
          backgroundColor: "rgba(176, 141, 87, 0.15)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [dailyViewMode, dailyTrend, myDailyTrend]);

  const hasCategoryData = Object.keys(categoryBreakdown || {}).length > 0;
  const hasDailyData = (dailyTrend || []).length > 0;

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <ChartCard title="Category breakdown (this month)">
        {hasCategoryData ? (
          <div className="h-56">
            <Pie data={categoryData} options={pieOptions} />
          </div>
        ) : (
          <EmptyChart label="No expenses logged this month yet." />
        )}
      </ChartCard>

      <ChartCard title="Monthly trend (last 6 months)">
        <div className="h-56">
          <Bar
            data={monthlyData}
            options={{ ...commonOptions, plugins: { legend: { display: false } } }}
          />
        </div>
      </ChartCard>

      <ChartCard title="Member contribution (this month)">
        <div className="h-56">
          <Bar
            data={memberData}
            options={{ ...commonOptions, plugins: { legend: { display: false } } }}
          />
        </div>
      </ChartCard>

      <ChartCard
        title="Individual & Daily Expense Graph"
        action={
          <div className="flex items-center gap-1 bg-ink/5 dark:bg-white/10 p-0.5 rounded-lg border border-ink/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDailyViewMode("mine")}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md transition-all ${
                dailyViewMode === "mine"
                  ? "bg-cover text-white shadow-sm font-semibold"
                  : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
              }`}
            >
              Your Spend
            </button>
            <button
              type="button"
              onClick={() => setDailyViewMode("group")}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md transition-all ${
                dailyViewMode === "group"
                  ? "bg-cover text-white shadow-sm font-semibold"
                  : "text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
              }`}
            >
              Group Total
            </button>
          </div>
        }
      >
        {hasDailyData ? (
          <div className="h-56">
            <Line
              data={activeDailyData}
              options={{ ...commonOptions, plugins: { legend: { display: false } } }}
            />
          </div>
        ) : (
          <EmptyChart label="No expenses logged this month yet." />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, action, children }) {
  return (
    <div className="border border-ink/5 dark:border-white/5 bg-white/20 dark:bg-white/5 rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 dark:text-dark-ink-muted">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-ink/40 dark:text-dark-ink-muted text-center px-6">
      {label}
    </div>
  );
}
