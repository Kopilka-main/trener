export function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-6 pt-2.5 pb-1 text-[14px] font-semibold text-ink">
      <span className="tabular-nums">9:41</span>
      <div className="absolute left-1/2 top-2 h-7 w-[110px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <span className="text-[12px] tracking-wide opacity-90">●●●● ◌</span>
    </div>
  );
}
