/**
 * useVoiceInput — wraps the Web Speech API for hands-free expense entry.
 *
 * Usage:
 *   const { listening, supported, startListening } = useVoiceInput(onResult);
 *
 * onResult({ title, amount }) — called once a final transcript is captured.
 * Returns:
 *   listening  — boolean, true while mic is open
 *   supported  — boolean, false if browser has no SpeechRecognition
 *   startListening — function to open the mic
 */

import { useCallback, useRef, useState } from "react";

const CATEGORY_KEYWORDS = {
  rent: "Rent",
  electricity: "Electricity",
  electric: "Electricity",
  wifi: "WiFi",
  internet: "WiFi",
  water: "Water",
  grocery: "Grocery",
  groceries: "Grocery",
  kitchen: "Kitchen",
  gas: "Gas",
  cleaning: "Cleaning",
  snacks: "Snacks",
  snack: "Snacks",
  restaurant: "Dining Out",
  dining: "Dining Out",
  lunch: "Dining Out",
  dinner: "Dining Out",
  breakfast: "Dining Out",
  cafe: "Dining Out",
  furniture: "Furniture",
};

function parseTranscript(transcript) {
  const text = transcript.toLowerCase().trim();

  // Extract amount — look for a number (incl. decimals) in the string.
  // "pizza sixty rupees" → try word-to-number for common Indian English
  const WORD_NUMS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100, thousand: 1000,
  };

  let amount = null;

  // Try digit-based number first
  const digitMatch = text.match(/\b(\d+(?:\.\d+)?)\b/);
  if (digitMatch) {
    amount = parseFloat(digitMatch[1]);
  } else {
    // Try spoken number words
    const words = text.split(/\s+/);
    let sum = 0;
    let current = 0;
    for (const w of words) {
      const n = WORD_NUMS[w];
      if (n !== undefined) {
        if (n === 100) {
          current = current === 0 ? 100 : current * 100;
        } else if (n === 1000) {
          sum += (current === 0 ? 1 : current) * 1000;
          current = 0;
        } else {
          current += n;
        }
      }
    }
    const total = sum + current;
    if (total > 0) amount = total;
  }

  // Detect category from keyword list
  let category = null;
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (text.includes(kw)) {
      category = cat;
      break;
    }
  }

  // Build title — remove the number and "rupees"/"rs"/"inr" noise words, then capitalize
  const noisePattern = /\b(\d+(?:\.\d+)?|rupees?|rs|inr)\b/gi;
  const titleRaw = transcript.replace(noisePattern, "").trim().replace(/\s+/g, " ");
  const title = titleRaw.length > 0
    ? titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1)
    : "";

  return { title, amount, category };
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const supported = Boolean(SpeechRecognitionAPI);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || listening) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(result);

      // Only act on final results
      if (event.results[event.results.length - 1].isFinal) {
        const parsed = parseTranscript(result);
        onResult(parsed);
      }
    };

    recognition.start();
  }, [listening, onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, transcript, startListening, stopListening };
}
