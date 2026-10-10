/**
 * Kerangka pemuatan child view admin: bentuknya meniru AdminPage + daftar
 * sehingga tata letak tidak melompat saat data tiba. Pita terang bergeser
 * (.motion-skeleton) dan berhenti untuk reduced motion.
 */
export function AdminSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Memuat halaman admin" className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3.5">
        <span className="motion-skeleton size-12 rounded-2xl" />
        <div className="space-y-2">
          <span className="motion-skeleton block h-7 w-40 rounded-lg" />
          <span className="motion-skeleton block h-4 w-64 max-w-[60vw] rounded-md" />
        </div>
      </div>
      <span className="motion-skeleton mb-5 block h-10 w-72 max-w-full rounded-full" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="border-border bg-surface flex items-center gap-3 rounded-card border p-3.5"
            style={{ opacity: 1 - index * 0.12 }}
          >
            <span className="motion-skeleton size-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <span className="motion-skeleton block h-4 w-1/2 rounded-md" />
              <span className="motion-skeleton block h-3 w-1/3 rounded-md" />
            </div>
            <span className="motion-skeleton size-9 rounded-xl" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
