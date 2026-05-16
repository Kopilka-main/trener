import { useEffect, useRef, useState } from 'react';
import { Crosshair, Copy, X } from 'lucide-react';

type FiberLike = {
  type?: unknown;
  elementType?: unknown;
  return?: FiberLike;
  _debugSource?: { fileName: string; lineNumber: number; columnNumber?: number };
};

function getFiber(el: Element | null): FiberLike | null {
  if (!el) return null;
  for (const key of Object.keys(el)) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
      return (el as unknown as Record<string, FiberLike>)[key] ?? null;
    }
  }
  return null;
}

function compName(t: unknown): string | null {
  if (typeof t === 'string') return t;
  if (typeof t === 'function') {
    const f = t as { displayName?: string; name?: string };
    return f.displayName ?? f.name ?? null;
  }
  if (t && typeof t === 'object') {
    const o = t as { displayName?: string; render?: { displayName?: string; name?: string } };
    if (o.displayName) return o.displayName;
    if (o.render) return o.render.displayName ?? o.render.name ?? null;
  }
  return null;
}

function ownerChain(fiber: FiberLike | null, max = 6): string[] {
  const chain: string[] = [];
  let f: FiberLike | undefined = fiber ?? undefined;
  while (f && chain.length < max) {
    const n = compName(f.elementType ?? f.type);
    if (n && /^[A-Z]/.test(n)) chain.push(n);
    f = f.return;
  }
  return chain;
}

function debugSource(fiber: FiberLike | null): { fileName: string; lineNumber: number } | null {
  let f: FiberLike | undefined = fiber ?? undefined;
  while (f) {
    if (f._debugSource) return f._debugSource;
    f = f.return;
  }
  return null;
}

function shortPath(absPath: string): string {
  const idx = absPath.lastIndexOf('/src/');
  return idx === -1 ? absPath : absPath.slice(idx + 1);
}

type Picked = {
  rect: DOMRect;
  tag: string;
  text: string;
  chain: string[];
  source: { fileName: string; lineNumber: number } | null;
};

export function DevInspector() {
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    document.body.style.cursor = 'crosshair';

    const isOurUI = (el: Element | null) => !!el?.closest('[data-dev-inspector]');

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOurUI(el)) { setHover(null); return; }
      setHover(el.getBoundingClientRect());
    };
    const onClick = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOurUI(el)) return;
      e.preventDefault();
      e.stopPropagation();
      const fiber = getFiber(el);
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
      setPicked({
        rect: el.getBoundingClientRect(),
        tag: el.tagName.toLowerCase(),
        text,
        chain: ownerChain(fiber),
        source: debugSource(fiber),
      });
      setActive(false);
      setCopied(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActive(false); setHover(null); }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [active]);

  const description = picked
    ? [
        `Компонент: ${picked.chain[0] ?? '(unknown)'}`,
        picked.chain.length > 1 ? `Цепочка: ${picked.chain.join(' ← ')}` : null,
        picked.source ? `Файл: ${shortPath(picked.source.fileName)}:${picked.source.lineNumber}` : null,
        `Тег: <${picked.tag}>`,
        picked.text ? `Текст: «${picked.text}»` : null,
        `Размер: ${Math.round(picked.rect.width)}×${Math.round(picked.rect.height)}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const copy = async () => {
    if (!description) return;
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div data-dev-inspector>
      <button
        onClick={() => { setActive((a) => !a); setPicked(null); }}
        title={active ? 'Отменить (Esc)' : 'Инспектор'}
        style={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 10000,
          width: 40,
          height: 40,
          borderRadius: 999,
          background: active ? '#c8392c' : '#1a1a1a',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {active ? <X size={18} /> : <Crosshair size={18} />}
      </button>

      {active && hover && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            left: hover.left,
            top: hover.top,
            width: hover.width,
            height: hover.height,
            border: '2px solid #1e88ff',
            background: 'rgba(30,136,255,0.12)',
            pointerEvents: 'none',
            zIndex: 9999,
            borderRadius: 4,
          }}
        />
      )}

      {picked && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 64,
            zIndex: 10000,
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: 12,
            padding: 12,
            fontSize: 12,
            lineHeight: 1.45,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxHeight: '40vh',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              position: 'absolute',
              border: '2px solid #18a558',
              left: picked.rect.left - 12,
              top: picked.rect.top - 64 + 12 - picked.rect.height,
              width: picked.rect.width,
              height: picked.rect.height,
              pointerEvents: 'none',
              borderRadius: 4,
              display: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{picked.chain[0] ?? '(unknown)'}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={copy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: copied ? '#18a558' : '#ffffff22',
                  color: '#fff', border: 'none', borderRadius: 6,
                  padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                }}
              >
                <Copy size={12} /> {copied ? 'Скопировано' : 'Копировать'}
              </button>
              <button
                onClick={() => setPicked(null)}
                style={{
                  background: '#ffffff22', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
          {picked.chain.length > 1 && (
            <div style={{ opacity: 0.7, marginBottom: 4 }}>
              {picked.chain.slice(1).join(' ← ')}
            </div>
          )}
          {picked.source && (
            <div style={{ opacity: 0.85, marginBottom: 4 }}>
              <code style={{ background: '#ffffff14', padding: '1px 4px', borderRadius: 3 }}>
                {shortPath(picked.source.fileName)}:{picked.source.lineNumber}
              </code>
            </div>
          )}
          <div style={{ opacity: 0.7 }}>
            &lt;{picked.tag}&gt; · {Math.round(picked.rect.width)}×{Math.round(picked.rect.height)}
          </div>
          {picked.text && (
            <div style={{ marginTop: 6, opacity: 0.9, fontStyle: 'italic' }}>«{picked.text}»</div>
          )}
        </div>
      )}
    </div>
  );
}
