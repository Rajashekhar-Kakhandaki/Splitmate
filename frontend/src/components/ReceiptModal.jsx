import { useState, useEffect } from "react";
import { receiptImageUrl } from "../lib/api";

export default function ReceiptModal({ imageUrl, title, onClose }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const fullUrl = receiptImageUrl(imageUrl);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-[#1a1a1a] border border-ink/10 dark:border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 dark:border-white/10 shrink-0 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <span className="text-xl">📷</span>
            <h3 className="font-display text-lg font-medium text-ink dark:text-white truncate">
              {title ? `Bill/Receipt: ${title}` : "Receipt Photo"}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono uppercase tracking-wider text-cover hover:text-cover-light px-3 py-1.5 rounded-lg border border-cover/20 bg-cover/5 transition-colors hidden sm:inline-block"
            >
              Open Original ↗
            </a>
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="text-xs font-mono uppercase tracking-wider text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white px-3 py-1.5 rounded-lg border border-ink/10 dark:border-white/10 transition-colors"
            >
              {isZoomed ? "Zoom Out" : "Zoom In"}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink/40 dark:text-white/40 hover:text-ink dark:hover:text-white hover:bg-ink/5 dark:hover:bg-white/10 transition-all font-bold text-lg"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content / Image Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-ink/5 dark:bg-black/40 min-h-[300px]">
          <img
            src={fullUrl}
            alt={title || "Receipt"}
            onClick={() => setIsZoomed(!isZoomed)}
            className={`transition-all duration-300 rounded-xl object-contain cursor-zoom-in ${
              isZoomed ? "w-auto max-w-none max-h-none cursor-zoom-out" : "max-w-full max-h-[70vh]"
            }`}
          />
        </div>

        {/* Mobile footer open link */}
        <div className="p-3 border-t border-ink/10 dark:border-white/10 text-center sm:hidden shrink-0">
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono uppercase tracking-wider text-cover hover:underline"
          >
            Open original file in new browser tab ↗
          </a>
        </div>
      </div>
    </div>
  );
}
