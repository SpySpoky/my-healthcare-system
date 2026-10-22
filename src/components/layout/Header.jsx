import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useAuth } from "../../context/useAuth";

import { t } from "../../i18n";
const roleLabels = {
  patient: t("Patient"),
  doctor: t("Doctor"),
  medical_staff: t("Medical Staff"),
  admin: t("Administrator"),
};

function Header({ onMenuClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const displayName = user?.name || "User";
  const initial = displayName.replace(/^Dr\.\s*/, "").charAt(0).toUpperCase();

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left side */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={t("Open navigation menu")}
            className="
              flex h-10 w-10 shrink-0 items-center justify-center lg:hidden
              rounded-xl border border-slate-200 bg-white
              text-lg text-slate-600 shadow-sm
              transition-all duration-200
              hover:-translate-y-0.5
              hover:border-blue-200
              hover:bg-blue-50
              hover:text-blue-600
              active:translate-y-0
            "
          >
            ☰
          </button>

          <Link
            to={user ? getDashboardPath(user.role) : "/"}
            className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
          >
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 sm:flex">
              <BrandLogo className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">{t("Healthcare Management System")}</p>

              <p className="hidden text-[11px] font-medium text-slate-400 sm:block">{t("Centralized Healthcare Platform")}</p>
            </div>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="
                flex items-center gap-2 rounded-xl
                border border-slate-200 bg-white
                px-2.5 py-2
                shadow-sm
                transition-all duration-200
                hover:border-blue-200
                hover:bg-slate-50
                sm:px-3
              "
            >
              {/* Avatar */}
              <span
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-xl
                  bg-gradient-to-br from-accent-500 to-accent2-500
                  text-sm font-extrabold text-white
                  shadow-md shadow-accent-500/20
                "
              >
                {initial}
              </span>

              {/* User name */}
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-bold leading-tight text-slate-700">
                  {displayName}
                </span>
                <span className="block text-[11px] font-medium leading-tight text-slate-400">
                  {roleLabels[user?.role] || t("Signed in")}
                </span>
              </span>

              {/* Arrow */}
              <span
                className={`
                  text-[10px] text-slate-400
                  transition-transform duration-200
                  ${isMenuOpen ? "rotate-180" : ""}
                `}
              >
                ▼
              </span>
            </button>

            {/* Dropdown */}
            {isMenuOpen && (
              <div
                className="
                  absolute right-0 top-[calc(100%+10px)]
                  z-50 w-52
                  overflow-hidden
                  rounded-2xl
                  border border-slate-200
                  bg-white
                  p-2
                  shadow-xl shadow-slate-900/10
                "
              >
                {/* Dropdown header */}
                <div className="mb-1 border-b border-slate-100 px-3 py-2.5">
                  <p className="text-xs font-extrabold text-slate-800">{t("Account")}</p>

                  <p className="mt-0.5 truncate text-[11px] text-slate-400">
                    {user?.email || t("Manage your account")}
                  </p>
                </div>

                {/* Profile (patients have a profile page) */}
                {user?.role === "patient" && (
                <Link
                  to="/patient/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="
                    flex items-center gap-3
                    rounded-xl px-3 py-2.5
                    text-sm font-semibold text-slate-600
                    transition-colors duration-150
                    hover:bg-blue-50
                    hover:text-blue-600
                  "
                >
                  <span
                    className="
                      flex h-8 w-8 items-center justify-center
                      rounded-lg bg-blue-50
                      text-blue-600
                    "
                  >
                    👤
                  </span>

                  <span>{t("Profile")}</span>
                </Link>
                )}

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex w-full items-center gap-3
                    rounded-xl px-3 py-2.5
                    text-left text-sm font-semibold text-slate-600
                    transition-colors duration-150
                    hover:bg-red-50
                    hover:text-red-600
                  "
                >
                  <span
                    className="
                      flex h-8 w-8 items-center justify-center
                      rounded-lg bg-red-50
                      text-red-500
                    "
                  >
                    ↪
                  </span>

                  <span>{t("Logout")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;