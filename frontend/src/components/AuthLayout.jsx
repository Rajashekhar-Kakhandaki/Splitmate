export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full flex bg-paper dark:bg-dark-bg">
      {/* Left: the "cover" of the ledger */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-cover to-cover-light text-paper flex-col justify-between p-12">
        <div className="absolute inset-0 bg-ledger-lines opacity-30 pointer-events-none" />

        <div className="relative">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-gold/80">
            Shared Living, Settled
          </p>
          <h1 className="font-display italic text-5xl lg:text-6xl mt-6 leading-[1.05]">
            Split
            <br />
            Mate
          </h1>
          <p className="mt-6 max-w-sm text-paper/70 leading-relaxed">
            Rent, WiFi, groceries, that one chicken bill — every rupee your
            room splits, tracked to the last one. No spreadsheets, no
            arguments about who paid last time.
          </p>
        </div>

        {/* Signature element: a rubber-stamp badge showing an example room code */}
        <div className="relative flex items-end justify-between">
          <div className="stamp inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-gold/70 text-gold/90">
            <span className="font-mono text-[10px] tracking-widest uppercase">
              Room Code
            </span>
            <span className="font-mono text-xl tracking-[0.15em] mt-1">
              A72KD9
            </span>
          </div>
          <p className="font-mono text-xs text-paper/40 max-w-[10rem] text-right leading-relaxed">
            Every room gets a code like this. Share it, and everyone's balances
            stay in sync.
          </p>
        </div>
      </div>

      {/* Right: the "page" — the actual form */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-cover/70 dark:text-dark-ink-muted">
              SplitMate
            </p>
          </div>

          <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/50 dark:text-dark-ink-muted">
            {eyebrow}
          </p>
          <h2 className="font-display text-4xl mt-3 text-ink dark:text-white tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-ink/60 dark:text-white/60 mt-3 text-sm leading-relaxed">{subtitle}</p>
          )}

          <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-xl mt-8 transition-all hover:shadow-2xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
