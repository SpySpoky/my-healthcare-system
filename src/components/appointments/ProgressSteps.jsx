import { t } from "../../i18n";
// Horizontal step indicator. `current` is the 1-based active step;
// earlier steps are shown as complete.
function ProgressSteps({ steps, current }) {
  return (
    <ol className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-3 sm:p-5">
      {steps.map((step, index) => {
        const number = index + 1;
        const isComplete = number < current;
        const isActive = number === current;

        return (
          <li
            key={step}
            aria-current={isActive ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                isComplete
                  ? "bg-accent2-500 text-white"
                  : isActive
                    ? "bg-accent-600 text-white shadow-md shadow-accent-500/30"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {isComplete ? "✓" : number}
            </span>

            <span
              className={`hidden truncate text-sm font-bold sm:block ${
                isActive || isComplete ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {t(step)}
            </span>

            {number < steps.length && (
              <span
                aria-hidden="true"
                className={`h-0.5 min-w-4 flex-1 rounded-full ${
                  isComplete ? "bg-accent2-500" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default ProgressSteps;
