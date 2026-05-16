import { useCallback, useRef } from 'react';

export function useLongPress(handler: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      triggeredRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      cancel();
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        handler();
      }, ms);
    },
    [handler, ms, cancel]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPosRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    if (Math.hypot(dx, dy) > 8) cancel();
  }, [cancel]);

  const onPointerUp = useCallback(() => cancel(), [cancel]);
  const onPointerCancel = useCallback(() => cancel(), [cancel]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (triggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      triggeredRef.current = false;
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu: (e: React.MouseEvent) => e.preventDefault(), onClickCapture };
}
