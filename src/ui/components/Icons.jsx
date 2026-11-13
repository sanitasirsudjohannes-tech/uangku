/**
 * Ikon SVG inline. Ukuran mengikuti font-size (1em) agar mudah
 * dipakai bersama utilitas Tailwind.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

function Svg({ size = 22, children, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...base} {...rest}>
      {children}
    </svg>
  );
}

export const WalletIcon = (props) => (
  <Svg {...props}>
    <path d="M3.5 8.5V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1.5" />
    <path d="M3.5 8.5A2.5 2.5 0 0 0 6 11h13.5a1 1 0 0 1 1 1v6a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
    <circle cx="16.5" cy="15" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const ListIcon = (props) => (
  <Svg {...props}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const SettingsIcon = (props) => (
  <Svg {...props}>
    <path d="M4 7h6.5M15.5 7H20M4 17h4.5M13.5 17H20" />
    <circle cx="13" cy="7" r="2.2" />
    <circle cx="11" cy="17" r="2.2" />
  </Svg>
);

export const PlusIcon = (props) => (
  <Svg strokeWidth={2.4} {...props}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ArrowUpIcon = (props) => (
  <Svg {...props}>
    <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
  </Svg>
);

export const ArrowDownIcon = (props) => (
  <Svg {...props}>
    <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />
  </Svg>
);

export const ChevronLeftIcon = (props) => (
  <Svg {...props}>
    <path d="M14.5 6 8.5 12l6 6" />
  </Svg>
);

export const ChevronRightIcon = (props) => (
  <Svg {...props}>
    <path d="M9.5 6l6 6-6 6" />
  </Svg>
);

export const CloseIcon = (props) => (
  <Svg strokeWidth={2.2} {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const DownloadIcon = (props) => (
  <Svg {...props}>
    <path d="M12 4v10M8 10.5 12 15l4-4.5" />
    <path d="M5 17.5v1.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
  </Svg>
);

export const UploadIcon = (props) => (
  <Svg {...props}>
    <path d="M12 16V5M8 8.5 12 4.5l4 4" />
    <path d="M5 17.5v1.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
  </Svg>
);

export const TrashIcon = (props) => (
  <Svg {...props}>
    <path d="M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
    <path d="M6.5 7l.7 11.2a2 2 0 0 0 2 1.8h5.6a2 2 0 0 0 2-1.8L17.5 7" />
    <path d="M10.5 11v5M13.5 11v5" />
  </Svg>
);

export const ShieldIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6z" />
    <path d="M9 12.2l2.1 2.1L15.2 10" />
  </Svg>
);

export const AlertIcon = (props) => (
  <Svg {...props}>
    <path d="M12 4.5 3.5 19h17z" />
    <path d="M12 9.5v4" />
    <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const CheckIcon = (props) => (
  <Svg strokeWidth={2.4} {...props}>
    <path d="M5 12.5 9.5 17 19 7.5" />
  </Svg>
);

export const CalendarIcon = (props) => (
  <Svg {...props}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" />
  </Svg>
);
