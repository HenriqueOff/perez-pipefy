const PATHS: Record<string, string> = {
  x: 'M18 6 6 18M6 6l12 12',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a7.97 7.97 0 0 0-.16-1.6l1.68-1.31-2-3.46-1.98.8a8.1 8.1 0 0 0-2.77-1.6L14.8 2h-4l-.37 2.83a8.1 8.1 0 0 0-2.77 1.6l-1.98-.8-2 3.46 1.68 1.31A7.97 7.97 0 0 0 5.2 12c0 .55.06 1.08.16 1.6l-1.68 1.31 2 3.46 1.98-.8c.8.7 1.75 1.24 2.77 1.6L10.8 22h4l.37-2.83a8.1 8.1 0 0 0 2.77-1.6l1.98.8 2-3.46-1.68-1.31c.1-.52.16-1.05.16-1.6Z',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0',
  paperclip: 'M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19L9.66 17.65a1.83 1.83 0 0 1-2.6-2.6l8.49-8.49',
};

export default function Icon({ name, size = 16 }: { name: keyof typeof PATHS; size?: number }) {
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
      <path d={PATHS[name]} />
    </svg>
  );
}
