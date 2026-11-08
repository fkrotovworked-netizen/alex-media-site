// Line icons in one weight, drawn for the page — no icon set to keep in step with.
const paths = {
  stack: 'M4 8l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  calendar: 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4',
  cap: 'M3 9l9-4 9 4-9 4-9-4zM7 11v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4M21 9v5',
  team: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M16 5.5a3 3 0 010 5.5M17.5 14c1.6.6 2.7 2.4 3 5',
  orbit: 'M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v3.7h-3.7',
  play: 'M9 7l9 5-9 5z',
  letter: 'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 15h8M8 18h5'
} as const;

export type IconName = keyof typeof paths;

export const Icon = ({ name, className = '' }: { name: IconName; className?: string }) => (
  <svg className={`icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
);
