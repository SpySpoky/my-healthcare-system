import { useNavigate } from "react-router-dom";
import SystemMessage from "../components/layout/SystemMessage";
import { useAuth } from "../context/useAuth";

import { t } from "../i18n";
function NotFound() {
  const navigate = useNavigate();
  const { user, isAuthenticated, getDashboardPath } = useAuth();

  return (
    <SystemMessage
      code="404"
      icon="🔍"
      title={t("Page not found")}
      message={t("The page you are looking for may have been removed, renamed, or the address may be incorrect.")}
      actions={[
        isAuthenticated
          ? { label: t("Go to My Dashboard"), to: getDashboardPath(user.role) }
          : { label: t("Go to Sign In"), to: "/login" },
        { label: t("Go Back"), onClick: () => navigate(-1) },
      ]}
    />
  );
}

export default NotFound;
