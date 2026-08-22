import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { receiptImageUrl as imageUrl } from "../lib/api.js";
import { useTheme } from "../context/ThemeContext.jsx";
import RoomsModal from "./RoomsModal.jsx";

export default function AppHeader({ crumb }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showRooms, setShowRooms] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 sm:px-12 py-6 border-b border-ink/10 dark:border-dark-border bg-paper dark:bg-dark-surface">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/dashboard" className="font-display italic text-xl text-ink dark:text-dark-ink">
          SplitMate
        </Link>
        {crumb && (
          <>
            <span className="text-ink/30 dark:text-dark-ink-muted">/</span>
            <span className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted">
              {crumb}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <button
            onClick={() => setShowRooms(true)}
            className="flex items-center gap-2 text-sm font-medium text-ink/70 dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-ink/10 dark:hover:border-dark-border hover:bg-ink/5 dark:hover:bg-dark-card"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 15.5v-11zM4.5 3.5a1 1 0 00-1 1v11a1 1 0 001 1h11a1 1 0 001-1v-11a1 1 0 00-1-1h-11z" />
              <path d="M4 9h12v1.5H4V9z" />
            </svg>
            <span className="hidden sm:inline">My Rooms</span>
          </button>
        )}
        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-2 group hover:bg-ink/5 dark:hover:bg-dark-card p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-ink/10 dark:hover:border-dark-border"
          >
            {user.avatarUrl ? (
              <img src={imageUrl(user.avatarUrl)} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-ink/10 dark:border-dark-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cover flex items-center justify-center text-white font-medium text-sm">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden sm:inline text-sm font-medium text-ink/80 dark:text-dark-ink-muted group-hover:text-ink dark:group-hover:text-dark-ink transition-colors">
              {user.name}
            </span>
          </Link>
        )}

        {/* Dark mode toggle */}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 dark:border-dark-border hover:bg-ink/5 dark:hover:bg-dark-card transition-colors text-ink/60 dark:text-dark-ink-muted shrink-0"
        >
          {theme === "dark" ? (
            /* Sun icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          ) : (
            /* Moon icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        <button
          onClick={logout}
          className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted hover:text-owe dark:hover:text-owe transition-colors shrink-0"
        >
          Log out
        </button>
      </div>

      {showRooms && <RoomsModal onClose={() => setShowRooms(false)} />}
    </header>
  );
}
