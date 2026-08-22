import { createWorker } from "tesseract.js";

/**
 * Runs client-side OCR on a receipt image and makes a best-effort guess at
 * the total amount and a title, so the Add Expense form can be pre-filled.
 * Nothing leaves the browser except the raw image (uploaded separately,
 * after the user confirms) — the OCR itself runs locally via WASM.
 *
 * @param {File} file
 * @param {(progress: number) => void} [onProgress] 0–1
 * @returns {Promise<{ text: string, guessedAmount: number|null, guessedTitle: string|null }>}
 */
export async function scanReceipt(file, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(m.progress);
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return {
      text,
      guessedAmount: guessTotalAmount(text),
      guessedTitle: guessTitle(text),
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Looks for a line containing a "total"-like keyword and pulls the number
 * next to it; falls back to the largest rupee-formatted number anywhere in
 * the text (receipts almost always show the total as the biggest number).
 */
export function guessTotalAmount(text) {
  const lines = text.split("\n");
  const totalKeywords = /\b(total|grand total|amount due|net amount|net payable|to pay)\b/i;

  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const amount = extractAmount(line);
      if (amount !== null) return amount;
    }
  }

  // Fallback: largest plausible currency amount anywhere in the receipt.
  const allAmounts = [...text.matchAll(/(?:₹|rs\.?|inr)?\s?(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/gi)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => !Number.isNaN(n) && n > 0 && n < 1000000);

  if (allAmounts.length === 0) return null;
  return Math.max(...allAmounts);
}

function extractAmount(line) {
  const match = line.match(/(?:₹|rs\.?|inr)?\s?(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ""));
  return Number.isNaN(value) ? null : value;
}

/**
 * Guesses a short title from the first non-empty, non-numeric-heavy line
 * near the top of the receipt — usually the store/vendor name.
 */
export function guessTitle(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 5)) {
    const digitRatio = (line.match(/\d/g) || []).length / line.length;
    if (line.length >= 3 && line.length <= 40 && digitRatio < 0.4) {
      return line.replace(/[^a-zA-Z0-9&'.\- ]/g, "").trim() || null;
    }
  }
  return null;
}
