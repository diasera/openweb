/** Baris statistik (angka + label, dipisah garis). Dipakai Profil & Tentang. */
export function StatsRow({
  items,
}: {
  items: { value: number | string; label: string }[];
}) {
  return (
    <div className="divide-border flex divide-x">
      {items.map((it, i) => (
        <div key={i} className="flex-1 px-2 text-center">
          <p className="font-display text-xl font-bold tabular-nums">{it.value}</p>
          <p className="text-muted text-xs">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
