// Outline icons used inside authentication form fields.

function IconBase({ children }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function UserIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5" />
    </IconBase>
  );
}

export function MailIcon() {
  return (
    <IconBase>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </IconBase>
  );
}

export function PhoneIcon() {
  return (
    <IconBase>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 3.5h3l1.5 4-2.2 1.8a15 15 0 0 0 5.9 5.9l1.8-2.2 4 1.5v3c0 1.1-.9 2-2 2C11.6 19.5 4.5 12.4 4.5 3.5c0-1.1.9-2 2-2Z"
      />
    </IconBase>
  );
}

export function LockIcon() {
  return (
    <IconBase>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
    </IconBase>
  );
}

export function EyeIcon() {
  return (
    <IconBase>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function EyeOffIcon() {
  return (
    <IconBase>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-2.6 3.4M6.5 7.1C3.9 8.8 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.6 4.6-1.4" />
      <path strokeLinecap="round" d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </IconBase>
  );
}
