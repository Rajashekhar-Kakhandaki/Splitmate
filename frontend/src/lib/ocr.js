/**
 * Downscales an input image File to a max dimension (default 1000px) using an HTML Canvas.
 * This prevents WebAssembly out-of-memory crashes when processing multi-megapixel photos on mobile.
 */
export async function resizeImageForOcr(file, maxDimension = 1000) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      return resolve(file);
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        return resolve(file);
      }
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const resizedFile = new File([blob], file.name || "receipt.jpg", {
            type: blob.type || "image/jpeg",
          });
          resolve(resizedFile);
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

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
  try {
    const resizedFile = await resizeImageForOcr(file, 1000);
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
      } = await worker.recognize(resizedFile);
      return {
        text,
        guessedAmount: guessTotalAmount(text),
        guessedTitle: guessTitle(text),
      };
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.warn("OCR failed or was bypassed:", err);
    return {
      text: "",
      guessedAmount: null,
      guessedTitle: null,
    };
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
