import { useEffect, useState } from "react";

// Chrome/Edge/Android fire "beforeinstallprompt" when the app meets PWA
// installability criteria (manifest + service worker + HTTPS). We stash
// the event and surface our own "Install" button instead of relying on
// the browser's default UI, which most people never notice.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!deferredPrompt || dismissed || installed) return null;

  async function handleInstall() {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="stitched rounded-2xl bg-white shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cover flex items-center justify-center shrink-0">
          <span className="font-mono text-[10px] text-paper font-bold">SM</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install SplitMate</p>
          <p className="text-xs text-ink/50">Add it to your home screen for quick access.</p>
        </div>
        <button
          onClick={handleInstall}
          className="text-xs font-mono uppercase tracking-wide bg-cover text-paper rounded-md px-3 py-1.5 hover:bg-cover-light transition-colors shrink-0"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-ink/30 hover:text-ink/60 text-lg leading-none shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
