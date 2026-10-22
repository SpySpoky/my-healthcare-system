import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// "/" sends signed-in users to their dashboard and everyone
// else to the login page.
function RootRedirect() {
  const { user, isAuthenticated, getDashboardPath } = useAuth();

  return (
    <Navigate
      to={isAuthenticated ? getDashboardPath(user.role) : "/login"}
      replace
    />
  );
}

export default RootRedirect;
