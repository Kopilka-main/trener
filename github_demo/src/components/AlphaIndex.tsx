const LETTERS = ['#','А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Э','Ю','Я'];

type Props = {
  available: Set<string>;
  onPick: (letter: string) => void;
};

export function AlphaIndex({ available, onPick }: Props) {
  return (
    <div
      className="flex shrink-0 select-none flex-col items-center justify-center self-stretch pr-1"
      style={{ width: 16 }}
    >
      {LETTERS.map((l) => {
        const enabled = available.has(l);
        return (
          <span
            key={l}
            onClick={() => enabled && onPick(l)}
            style={{
              fontSize: 9,
              lineHeight: '10px',
              fontWeight: 600,
              color: enabled ? '#1a1a1a' : '#bfb8a8',
              cursor: enabled ? 'pointer' : 'default',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
            }}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
}
