/** Shared stroke-style SVG icons (24px grid). Size via the `size` prop; color via CSS `color`. */

type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconHome({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
    </svg>
  );
}

export function IconDumbbell({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
    </svg>
  );
}

export function IconUtensils({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M7 3v7a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V3M5 12v9" />
      <path d="M20 3c-2.8 0-5 2.2-5 6v4h3v8" />
    </svg>
  );
}

export function IconClipboard({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4a3 3 0 0 1 6 0" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

export function IconGear({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}

export function IconDroplet({ size = 16, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 3.5c3 3.6 5.5 6.5 5.5 9.4A5.5 5.5 0 0 1 12 18.4a5.5 5.5 0 0 1-5.5-5.5c0-2.9 2.5-5.8 5.5-9.4z" />
    </svg>
  );
}

export function IconFootprint({ size = 16, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M7 13.5c-1.6 0-2.5-1.4-2.5-3.6C4.5 6.4 5.8 3.5 8 3.5c1.6 0 2.3 1.5 2.3 3.6 0 2.6-1.3 6.4-3.3 6.4z" />
      <path d="M6 16.5h3.2c.6 0 1 .5 1 1.1l-.2 1.8c0 .6-.5 1.1-1.1 1.1H7c-.6 0-1.1-.5-1.1-1.1z" />
      <path d="M17.5 11c1.3 0 2 1.1 2 2.9 0 2.8-1.1 5.1-2.8 5.1-1.3 0-1.9-1.2-1.9-2.9 0-2.1 1-5.1 2.7-5.1z" />
    </svg>
  );
}

export function IconCalendar({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18" />
    </svg>
  );
}

export function IconClock({ size = 16, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconChevronRight({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronDown({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconPencil({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function IconHistory({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4v4.5h4.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function IconCheck({ size = 18, strokeWidth = 3, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function IconX({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconSwap({ size = 17, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
    </svg>
  );
}

export function IconPlayCircle({ size = 17, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMore({ size = 17, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function IconPlay({ size = 15, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function IconEye({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconStar({
  size = 16,
  strokeWidth = 2,
  className,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z" />
    </svg>
  );
}

export function IconPlus({ size = 16, strokeWidth = 2.4, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
