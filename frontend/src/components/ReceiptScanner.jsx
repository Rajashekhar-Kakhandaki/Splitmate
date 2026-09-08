import { useRef, useState, useEffect } from "react";
import api, { receiptImageUrl } from "../lib/api";

export default function ReceiptScanner({ onScanned, initialReceiptUrl }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(() => (initialReceiptUrl ? receiptImageUrl(initialReceiptUrl) : null));
  const [status, setStatus] = useState("idle"); // idle | scanning | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialReceiptUrl) {
      setPreview(receiptImageUrl(initialReceiptUrl));
    }
  }, [initialReceiptUrl]);

  async function handleFile(file) {
    if (!file) return;
    setError("");
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);
    setStatus("scanning");
    setProgress(0);

    try {
      let guessedAmount = null;
      let guessedTitle = null;

      try {
        const { scanReceipt } = await import("../lib/ocr");
        const ocrRes = await scanReceipt(file, setProgress);
        guessedAmount = ocrRes?.guessedAmount ?? null;
        guessedTitle = ocrRes?.guessedTitle ?? null;
      } catch (ocrErr) {
        console.warn("OCR non-fatal warning:", ocrErr);
      }

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
        previewUrl: localPreviewUrl,
      });
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.error || "Couldn't upload photo. Please try again.");
    }
  }

  function handleClear() {
    setPreview(null);
    setStatus("idle");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onScanned({
      receiptUrl: null,
      guessedAmount: null,
      guessedTitle: null,
      previewUrl: null,
    });
  }

  return (
    <div className="stitched rounded-2xl bg-white/50 dark:bg-dark-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted">
          Receipt / Bill photo
        </p>
        {status !== "idle" && status !== "error" && (
          <span className="text-xs font-mono text-ink/60 dark:text-dark-ink-muted">
            {status === "scanning" && `Reading image… ${Math.round(progress * 100)}%`}
            {status === "uploading" && "Uploading photo…"}
            {status === "done" && "✓ Photo attached"}
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
          <div className="relative group shrink-0">
            <img
              src={preview}
              alt="Receipt preview"
              className="w-16 h-16 rounded-xl object-cover border border-ink/10 dark:border-dark-border shadow-sm"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-ink/20 dark:border-dark-border flex items-center justify-center text-ink/30 text-lg">
            📷
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "scanning" || status === "uploading"}
            className="text-xs font-mono uppercase tracking-wide border border-ink/20 dark:border-dark-border text-ink/70 dark:text-dark-ink-muted rounded-xl px-3.5 py-2 hover:border-ink/40 dark:hover:border-dark-ink-muted hover:bg-ink/5 dark:hover:bg-white/5 transition-all disabled:opacity-60 cursor-pointer"
          >
            {preview ? "📷 Change Photo" : "📷 Take or Attach Photo"}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleClear}
              disabled={status === "scanning" || status === "uploading"}
              className="text-xs font-mono uppercase tracking-wide text-owe hover:bg-owe/10 rounded-xl px-3 py-2 border border-owe/20 transition-all cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-owe mt-2">{error}</p>}
    </div>
  );
}
