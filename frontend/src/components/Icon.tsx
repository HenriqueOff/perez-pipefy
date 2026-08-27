type IconElement =
  | { type: 'path'; d: string }
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number };

const ICONS: Record<string, IconElement[]> = {
  x: [{ type: 'path', d: 'M18 6 6 18M6 6l12 12' }],
  check: [{ type: 'path', d: 'M20 6 9 17l-5-5' }],
  user: [
    { type: 'path', d: 'M20 21a8 8 0 1 0-16 0' },
    { type: 'circle', cx: 12, cy: 7, r: 4 },
  ],
  calendar: [
    { type: 'path', d: 'M8 2v4M16 2v4M3 10h18' },
    { type: 'path', d: 'M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z' },
  ],
  gear: [
    {
      type: 'path',
      d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a7.97 7.97 0 0 0-.16-1.6l1.68-1.31-2-3.46-1.98.8a8.1 8.1 0 0 0-2.77-1.6L14.8 2h-4l-.37 2.83a8.1 8.1 0 0 0-2.77 1.6l-1.98-.8-2 3.46 1.68 1.31A7.97 7.97 0 0 0 5.2 12c0 .55.06 1.08.16 1.6l-1.68 1.31 2 3.46 1.98-.8c.8.7 1.75 1.24 2.77 1.6L10.8 22h4l.37-2.83a8.1 8.1 0 0 0 2.77-1.6l1.98.8 2-3.46-1.68-1.31c.1-.52.16-1.05.16-1.6Z',
    },
  ],
  chevronLeft: [{ type: 'path', d: 'm15 6-6 6 6 6' }],
  chevronRight: [{ type: 'path', d: 'm9 6 6 6-6 6' }],
  plus: [{ type: 'path', d: 'M12 5v14M5 12h14' }],
  search: [{ type: 'path', d: 'm21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' }],
  bell: [
    {
      type: 'path',
      d: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0',
    },
  ],
  paperclip: [
    {
      type: 'path',
      d: 'M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19L9.66 17.65a1.83 1.83 0 0 1-2.6-2.6l8.49-8.49',
    },
  ],
  eye: [
    { type: 'path', d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z' },
    { type: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  menu: [{ type: 'path', d: 'M3 6h18M3 12h18M3 18h18' }],
  eyeOff: [
    {
      type: 'path',
      d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24',
    },
    { type: 'line', x1: 1, y1: 1, x2: 23, y2: 23 },
  ],
};

export default function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].map((el, i) => {
        if (el.type === 'path') return <path key={i} d={el.d} />;
        if (el.type === 'circle') return <circle key={i} cx={el.cx} cy={el.cy} r={el.r} />;
        return <line key={i} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} />;
      })}
    </svg>
  );
}
