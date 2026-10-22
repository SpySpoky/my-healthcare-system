import { useNavigate } from "react-router-dom";
import SystemMessage from "../components/layout/SystemMessage";
import { useAuth } from "../context/useAuth";

import { t } from "../i18n";
function Unauthorized() {
  const navigate = useNavigate();
  const { user, isAuthenticated, getDashboardPath, logout } = useAuth();

  const signInAsSomeoneElse = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <SystemMessage
      code="403"
      icon="🔒"
      title={t("Access denied")}
      message={t("Your account does not have permission to view this section of the healthcare system.")}
      actions={
        isAuthenticated
          ? [
              {
                label: t("Go to My Dashboard"),
                to: getDashboardPath(user.role),
              },
              {
                label: t("Sign in with a different account"),
                onClick: signInAsSomeoneElse,
              },
            ]
          : [{ label: t("Go to Sign In"), to: "/login" }]
      }
    />
  );
}

export default Unauthorized;
