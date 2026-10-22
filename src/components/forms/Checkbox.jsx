import { t } from "../../i18n";
function Checkbox({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
}) {
  return (
    <label
      htmlFor={name}
      className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
    >
      <input
        id={name}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 accent-accent-600"
      />

      <span>{t(label)}</span>
    </label>
  );
}

export default Checkbox;
