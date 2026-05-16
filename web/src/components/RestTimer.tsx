import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { tripleBeep } from '../lib/audio';
import { formatDuration } from '../lib/format';

type Props = {
  totalSec: number;
  onClose: () => void;
};

export function RestTimer({ totalSec, onClose }: Props) {
  const [remaining, setRemaining] = useState(totalSec);
  const [running, setRunning] = useState(true);
  const firedRef = useRef(false);

  useEffect(() => {
    setRemaining(totalSec);
    setRunning(true);
    firedRef.current = false;
  }, [totalSec]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      tripleBeep();
      setRunning(false);
    }
  }, [remaining]);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-3 rounded-2xl bg-[#2e7d4f] px-4 py-3 text-white shadow-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Timer size={18} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Таймер отдыха</div>
          <div className="text-2xl font-bold tabular-nums leading-tight">{formatDuration(remaining)}</div>
        </div>
        <button onClick={() => setRunning((r) => !r)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15" aria-label={running ? 'Пауза' : 'Старт'}>
          {running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <button onClick={() => { setRemaining(totalSec); setRunning(true); firedRef.current = false; }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15" aria-label="Сброс">
          <RotateCcw size={14} />
        </button>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15" aria-label="Закрыть">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
