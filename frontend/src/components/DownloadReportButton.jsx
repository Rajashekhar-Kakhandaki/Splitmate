import { useState } from "react";
import api from "../lib/api";

async function triggerDownload(blobPromise, filename, mimeType) {
  const res = await blobPromise;
  const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function DownloadReportButton({ roomId, roomName }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingXls, setDownloadingXls] = useState(false);
  const [error, setError] = useState("");

  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const safeName = roomName.replace(/\s+/g, "_");
  const safeMonth = monthLabel.replace(/\s+/g, "_");

  async function handlePdf() {
    setError("");
    setDownloadingPdf(true);
    try {
      await triggerDownload(
        api.get(`/rooms/${roomId}/report`, { responseType: "blob" }),
        `splitmate-${safeName}-${safeMonth}.pdf`,
        "application/pdf"
      );
    } catch {
      setError("Couldn't generate the PDF report.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleExcel() {
    setError("");
    setDownloadingXls(true);
    try {
      await triggerDownload(
        api.get(`/rooms/${roomId}/report/excel`, { responseType: "blob" }),
        `splitmate-${safeName}-${safeMonth}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } catch {
      setError("Couldn't generate the Excel report.");
    } finally {
      setDownloadingXls(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        id="download-pdf-btn"
        onClick={handlePdf}
        disabled={downloadingPdf}
        className="text-xs font-mono uppercase tracking-wide border border-ink/20 dark:border-dark-border text-ink/60 dark:text-dark-ink-muted rounded-md px-3 py-2 hover:border-ink/40 dark:hover:border-dark-ink-muted transition-colors disabled:opacity-60"
      >
        {downloadingPdf ? "Generating…" : "📄 PDF Report"}
      </button>

      <button
        id="download-excel-btn"
        onClick={handleExcel}
        disabled={downloadingXls}
        className="text-xs font-mono uppercase tracking-wide border border-owed/30 dark:border-owed/40 text-owed rounded-md px-3 py-2 hover:bg-owed/5 transition-colors disabled:opacity-60"
      >
        {downloadingXls ? "Generating…" : "📊 Excel Export"}
      </button>

      {error && <p className="text-xs text-owe">{error}</p>}
    </div>
  );
}
