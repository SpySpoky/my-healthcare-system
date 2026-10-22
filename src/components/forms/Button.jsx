function Button({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
}) {
  const variantStyles = {
    primary:
      "bg-gradient-to-r from-accent-500 to-accent2-500 text-white shadow-md shadow-accent-500/20 hover:-translate-y-0.5 hover:from-accent-600 hover:to-accent2-600 hover:shadow-lg hover:shadow-accent-500/25",

    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 hover:shadow-md",

    danger:
      "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-500/20 hover:-translate-y-0.5 hover:from-red-600 hover:to-rose-600 hover:shadow-lg hover:shadow-red-500/25",

    success:
      "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-600 hover:shadow-lg",

    warning:
      "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20 hover:-translate-y-0.5 hover:from-amber-500 hover:to-orange-600 hover:shadow-lg",

    outline:
      "border-2 border-accent-500 bg-transparent text-accent-600 hover:bg-accent-50",

    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  };

  return (
    <button
      type={type}
      className={`
        inline-flex
        min-h-10
        items-center
        justify-center
        rounded-xl
        px-5
        py-2.5
        text-sm
        font-bold
        transition-all
        duration-200
        focus:outline-none
        focus:ring-4
        focus:ring-accent-500/20
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:hover:translate-y-0
        disabled:hover:shadow-none
        ${variantStyles[variant] || variantStyles.primary}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;