// Shared classes for text inputs, selects and textareas.
export const controlBaseClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export const controlStateClass = (hasError) =>
  hasError
    ? "border-red-300 hover:border-red-400 focus:border-red-500 focus:ring-red-500/10"
    : "border-slate-200 hover:border-accent-300 focus:border-accent-500 focus:ring-accent-500/10";

// aria-describedby value for a control with an error or hint.
export const describedBy = (name, error, hint) =>
  error || hint ? `${name}-message` : undefined;
