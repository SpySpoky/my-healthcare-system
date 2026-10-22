import { Suspense, useEffect } from "react";
import Loading from "../components/common/Loading";
import DataPage from "../components/common/DataPage";

import { lower, t } from "../i18n";
const APP_NAME = t("Healthcare Management System");

// Sets the browser-tab title for a route and, for pages that
// load data, wraps them in the shared loading/error boundary.
function RoutePage({ title, loadsData = true, children }) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);

  const page = loadsData ? (
    <DataPage loadingText={t("Loading {page}...", { page: lower(title) })}>
      {children}
    </DataPage>
  ) : (
    children
  );

  return <Suspense fallback={<Loading text={t("Loading...")} />}>{page}</Suspense>;
}

export default RoutePage;
