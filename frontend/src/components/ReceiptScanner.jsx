import { useRef, useState } from "react";
import api from "../lib/api";

export default function ReceiptScanner({ onScanned }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | scanning | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    setStatus("scanning");
    setProgress(0);

    try {
      const { scanReceipt } = await import("../lib/ocr");
      const { guessedAmount, guessedTitle } = await scanReceipt(file, setProgress);

      setStatus("uploading");
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await api.post("/uploads/receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus("done");
      onScanned({
        receiptUrl: res.data.url,
        guessedAmount,
        guessedTitle,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.error || "Couldn't scan that receipt. You can still fill the form in by hand.");
    }
  }

  return (
    <div className="stitched rounded-2xl bg-white/50 dark:bg-dark-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted">
          Scan a receipt (optional)
        </p>
        {status !== "idle" && status !== "error" && (
          <span className="text-xs text-ink/40 dark:text-dark-ink-muted">
            {status === "scanning" && `Reading… ${Math.round(progress * 100)}%`}
            {status === "uploading" && "Saving photo…"}
            {status === "done" && "Done — fields pre-filled below"}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-3 flex items-center gap-3">
        {preview ? (
          <img
            src={preview}
            alt="Receipt preview"
            className="w-16 h-16 rounded-lg object-cover border border-ink/10 dark:border-dark-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-ink/20 dark:border-dark-border flex items-center justify-center text-ink/30 text-xs">
            📷
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "scanning" || status === "uploading"}
          className="text-xs font-mono uppercase tracking-wide border border-ink/20 dark:border-dark-border text-ink/60 dark:text-dark-ink-muted rounded-md px-3 py-2 hover:border-ink/40 dark:hover:border-dark-ink-muted transition-colors disabled:opacity-60"
        >
          {preview ? "Retake / choose another" : "Take or choose photo"}
        </button>
      </div>

      {error && <p className="text-xs text-owe mt-2">{error}</p>}
    </div>
  );
}
