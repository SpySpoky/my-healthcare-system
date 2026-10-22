// Animated, infinitely looping background for the auth pages:
// a scrolling heartbeat line, rising medical crosses and a
// pulsing glow. Keyframes live in index.css.

// One heartbeat segment, 600 units wide. Repeated so the strip
// can scroll by half its width and loop seamlessly.
const BEAT =
  "h120 l15 -10 l15 10 h30 l10 15 l20 -95 l20 120 l15 -40 h40 l25 -18 l25 18 h145";

const ecgPath = (segments, y) =>
  `M0 ${y} ${Array.from({ length: segments }, () => BEAT).join(" ")}`;

const crosses = [
  { left: "6%", size: 22, duration: 26, delay: 0 },
  { left: "18%", size: 14, duration: 32, delay: -8 },
  { left: "31%", size: 28, duration: 38, delay: -20 },
  { left: "47%", size: 16, duration: 28, delay: -4 },
  { left: "62%", size: 24, duration: 34, delay: -15 },
  { left: "74%", size: 12, duration: 24, delay: -11 },
  { left: "86%", size: 20, duration: 30, delay: -2 },
  { left: "94%", size: 15, duration: 36, delay: -26 },
];

function Cross({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MedicalBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Pulsing glow, timed like a heartbeat */}
      <div className="glow-pulse absolute left-1/2 top-1/2 h-[600px] w-[600px] rounded-full bg-cyan-300/20 blur-3xl" />

      {/* Rising crosses */}
      {crosses.map((cross) => (
        <div
          key={cross.left}
          className="cross-rise absolute -bottom-10 text-white"
          style={{
            left: cross.left,
            animationDuration: `${cross.duration}s`,
            animationDelay: `${cross.delay}s`,
          }}
        >
          <Cross size={cross.size} />
        </div>
      ))}

      {/* Heartbeat lines */}
      {[
        { top: "2%", opacity: 0.35, speed: "18s" },
        { top: "78%", opacity: 0.5, speed: "12s" },
      ].map((line) => (
        <div
          key={line.top}
          className="absolute left-0 h-40 w-full"
          style={{ top: line.top, opacity: line.opacity }}
        >
          <svg
            className="ecg-scroll h-full"
            style={{ width: "200%", minWidth: "2400px", animationDuration: line.speed }}
            viewBox="0 0 2400 160"
            preserveAspectRatio="none"
          >
            <path
              d={ecgPath(4, 100)}
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="ecg-trace"
              d={ecgPath(4, 100)}
              fill="none"
              stroke="#a5f3fc"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: "drop-shadow(0 0 6px #67e8f9)" }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

export default MedicalBackdrop;
