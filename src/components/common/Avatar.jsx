import { t } from "../../i18n";
const sizeStyles = {
  small: "h-8 w-8 text-xs",
  medium: "h-11 w-11 text-sm",
  large: "h-16 w-16 text-lg",
};

function Avatar({ src, name, size = "medium" }) {
  const initials = name
    ? name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent-500 to-accent2-500 font-bold text-white ${
        sizeStyles[size] || sizeStyles.medium
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={name || t("User")}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default Avatar;
