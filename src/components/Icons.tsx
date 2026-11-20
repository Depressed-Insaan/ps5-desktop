/**
 * Minimal inline icon set. Keeping icons as local SVG components avoids an
 * extra dependency and lets the stroke weight match the interface.
 */

interface IconProps {
  size?: number
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
}

export function HomeIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3.5 10.6 12 3.6l8.5 7" />
      <path d="M5.6 9.4V20h12.8V9.4" />
      <path d="M10 20v-5.4h4V20" />
    </svg>
  )
}

export function LibraryIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </svg>
  )
}

export function TrophyIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 4h8v4.2a4 4 0 0 1-8 0Z" />
      <path d="M8 5.2H5.4v1.6A3.6 3.6 0 0 0 9 10.4" />
      <path d="M16 5.2h2.6v1.6A3.6 3.6 0 0 1 15 10.4" />
      <path d="M12 12.4V17" />
      <path d="M8.4 20.4h7.2" />
      <path d="M10 20.4V17.4h4v3" />
    </svg>
  )
}

export function SettingsIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4M5.9 5.9l1.7 1.7M16.4 16.4l1.7 1.7M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  )
}

export function PlayIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.4v13.2L19.2 12 8 5.4Z" />
    </svg>
  )
}

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

export function ClockIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.6V12l3 1.9" />
    </svg>
  )
}

export function PlusIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  )
}

export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4.6 19.4h3.7L19 8.7a2 2 0 0 0-2.8-2.8L5.5 16.7l-.9 2.7Z" />
      <path d="m14.9 7.2 2.8 2.8" />
    </svg>
  )
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4.8 7h14.4" />
      <path d="M9.4 7V5.2h5.2V7" />
      <path d="M6.6 7l.9 11.4a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5L17.4 7" />
      <path d="M10.4 10.8v6M13.6 10.8v6" />
    </svg>
  )
}

export function FolderIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3.6 7.4a2 2 0 0 1 2-2h3.1l1.8 2.2h6.9a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </svg>
  )
}

export function StorageIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3.2" y="4.6" width="17.6" height="6.4" rx="2" />
      <rect x="3.2" y="13" width="17.6" height="6.4" rx="2" />
      <path d="M7 7.8h.01M7 16.2h.01" />
    </svg>
  )
}
