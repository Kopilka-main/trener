import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Анимированный текст в стиле «кубик прокатывается сверху вниз» (odometer).
 * ВСЁ значение анимируется как одно целое: лента с двумя строками сдвигается
 * на одну высоту строки вниз. Без каскада по символам — никаких рассинхронов
 * между соседними буквами и пересчёта ширины.
 */

const ROLL_MS = 420;

export function FlapText({
  value,
  className,
  style,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
  /** Не используется — оставлен для обратной совместимости. */
  staggerMs?: number;
}) {
  const [front, setFront] = useState(value);
  const [next, setNext] = useState(value);
  const [rolling, setRolling] = useState(false);
  // resetKey пересоздаёт track после завершения роллинга — чтобы новое значение
  // оказалось в исходной позиции без обратной анимации.
  const [resetKey, setResetKey] = useState(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (front === value) return;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setNext(value);
    // Стартуем роллинг сразу (микро-задержка в один кадр чтобы React успел
    // отрисовать .cube-track в исходной позиции — иначе transition не сработает).
    const t1 = window.setTimeout(() => setRolling(true), 16);
    const t2 = window.setTimeout(() => {
      setFront(value);
      setNext(value);
      setRolling(false);
      setResetKey((k) => k + 1);
    }, 16 + ROLL_MS);
    timersRef.current.push(t1, t2);
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [value, front]);

  return (
    <span className={`cube-window ${className ?? ''}`} style={style}>
      <span key={resetKey} className={`cube-track${rolling ? ' roll' : ''}`}>
        <span className="cube-slot">{front === '' ? ' ' : front}</span>
        <span className="cube-slot">{next === '' ? ' ' : next}</span>
      </span>
    </span>
  );
}
