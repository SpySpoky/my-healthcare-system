// App logo: a shield with a medical cross and a heartbeat line.
// Inherits the text colour, so it works on light and dark backgrounds.
function BrandLogo({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10v-6L12 2.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6.5h3v2.5H16v3h-2.5v2.5h-3V12H8V9h2.5V6.5Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 17h2.5l1-1.5 1.5 2.5 1-1h5"
      />
    </svg>
  );
}

export default BrandLogo;
