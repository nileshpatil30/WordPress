/**
 * The icon set.
 *
 * Hand-drawn as inline SVG rather than pulled from a library: there are only a
 * dozen, they ship as markup with no extra request and no runtime, they inherit
 * currentColor so they follow the palette everywhere, and there is no licence
 * to track. All are 24x24 on a 1.6 stroke so they sit at the same visual weight
 * next to text.
 */
type IconProps = { className?: string; size?: number };

function Svg({ className = "", size = 24, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden focusable="false"
    >
      {children}
    </svg>
  );
}

/** 01 Calculate. */
export const IconCalculator = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="2.75" width="16" height="18.5" rx="2.5" />
    <rect x="7.5" y="6" width="9" height="3.5" rx="1" />
    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
  </Svg>
);

/** 02 Check a quote. An upload into a document. */
export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 2.75H7A2.25 2.25 0 0 0 4.75 5v14A2.25 2.25 0 0 0 7 21.25h10A2.25 2.25 0 0 0 19.25 19V8z" />
    <path d="M14 2.75V8h5.25" />
    <path d="M12 17.5v-6M9.5 13.75 12 11.25l2.5 2.5" />
  </Svg>
);

/** 03 Understand what is driving the price. */
export const IconMagnifier = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.75" cy="10.75" r="6.5" />
    <path d="m15.6 15.6 4.65 4.65" />
    <path d="M8.5 12.25v-1.5M10.75 12.25v-3.5M13 12.25v-2.5" />
  </Svg>
);

/** 04 Compare. */
export const IconScales = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v17M7 20.5h10" />
    <path d="M4.5 7.5h15" />
    <path d="M4.5 7.5 2 13.5h5zM19.5 7.5 17 13.5h5z" />
    <path d="M2 13.5a2.5 2.5 0 0 0 5 0M17 13.5a2.5 2.5 0 0 0 5 0" />
  </Svg>
);

/** 05 Hire. */
export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
    <path d="M16 5.2a3.25 3.25 0 0 1 0 5.6M17.5 14.4A6.25 6.25 0 0 1 21.25 20" />
  </Svg>
);

/** Independent and unbiased. */
export const IconShieldCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.75 4.75 5.6v5.65c0 4.4 2.95 8.25 7.25 9.5 4.3-1.25 7.25-5.1 7.25-9.5V5.6z" />
    <path d="m9 12.1 2.1 2.15L15.25 10" />
  </Svg>
);

/** No phone required. */
export const IconPhoneOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.4 3.9c.7-.6 1.7-.5 2.2.3l1.5 2.3c.4.6.3 1.4-.3 1.9l-1.3 1a12 12 0 0 0 1 1.5" />
    <path d="M12.9 15.4a12 12 0 0 0 1.5 1l1-1.3c.5-.6 1.3-.7 1.9-.3l2.3 1.5c.8.5.9 1.5.3 2.2l-1 1.1c-1 1.1-2.6 1.4-3.9.8a19 19 0 0 1-7.4-6" />
    <path d="M3 3 21 21" />
  </Svg>
);

/** Transparent and detailed. */
export const IconClipboard = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4.25H7A2.25 2.25 0 0 0 4.75 6.5V19A2.25 2.25 0 0 0 7 21.25h10A2.25 2.25 0 0 0 19.25 19V6.5A2.25 2.25 0 0 0 17 4.25h-2" />
    <rect x="9" y="2.75" width="6" height="3.5" rx="1.25" />
    <path d="M8.75 11.5h6.5M8.75 15.25h4" />
  </Svg>
);

/** Your data is yours. */
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.25" y="10" width="15.5" height="11.25" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2.5" />
  </Svg>
);

/** Always improving. */
export const IconTrendUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20.25h17" />
    <path d="M6.5 17V12M11 17V8.5M15.5 17v-3M20 17V5.5" />
  </Svg>
);

/** Local pages. */
export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.25s6.75-5.6 6.75-11a6.75 6.75 0 1 0-13.5 0c0 5.4 6.75 11 6.75 11" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

/** No spam. */
export const IconMailOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.75 12.5V7A2.25 2.25 0 0 0 18.5 4.75h-11" />
    <path d="M3.25 8.5V17A2.25 2.25 0 0 0 5.5 19.25h13" />
    <path d="m4.5 6.2 7.5 5.3 3.2-2.25" />
    <path d="M3 3 21 21" />
  </Svg>
);

/** You're in control. */
export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 20.25V14M5 10V3.75M12 20.25V12M12 8V3.75M19 20.25v-6.5M19 9.5V3.75" />
    <path d="M2.75 14h4.5M9.75 8h4.5M16.75 13.75h4.5" />
  </Svg>
);

// -- Service roadmap ---------------------------------------------------------
// One glyph per vertical. Roofing is live; the rest are planned, and showing
// them as real icons rather than text badges is the quiet claim that this is a
// home-project cost platform that happens to start with roofs.

export const IconRoofing = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.75 11.5 12 4l9.25 7.5" />
    <path d="M5.5 10.2V20.25h13V10.2" />
    <path d="M9.5 20.25v-5.5h5v5.5" />
  </Svg>
);

export const IconSolar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.75" y="6.5" width="18.5" height="11" rx="1.5" />
    <path d="M2.75 12h18.5M8.9 6.5 7.4 17.5M15.1 6.5l1.5 11" />
    <path d="M12 3.75V2.5M12 21.5v-1.25" />
  </Svg>
);

export const IconHvac = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.75" y="4.75" width="18.5" height="10" rx="2" />
    <path d="M6.25 8.25h11.5M6.25 11.25h11.5" />
    <path d="M8 17.5v1.4M12 17.5v2.6M16 17.5v1.4" />
  </Svg>
);

export const IconWindows = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.75" y="3.25" width="16.5" height="17.5" rx="1.5" />
    <path d="M12 3.25v17.5M3.75 12h16.5" />
  </Svg>
);

export const IconSiding = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.75" y="4.5" width="18.5" height="15" rx="1.5" />
    <path d="M2.75 9.5h18.5M2.75 14.5h18.5" />
  </Svg>
);

export const IconKitchen = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="3.75" width="17.5" height="16.5" rx="2" />
    <path d="M3.25 10.5h17.5" />
    <path d="M8 6.5h.01M8 14.5v2.5M14 14.5v2.5" />
  </Svg>
);

export const IconBathroom = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.25 12.5h17.5v1.75a5 5 0 0 1-5 5H8.25a5 5 0 0 1-5-5z" />
    <path d="M6.5 12.5V5.75a2 2 0 0 1 4 0v.75" />
    <path d="M7 19.25 6 21.5M17 19.25l1 2.25" />
  </Svg>
);
