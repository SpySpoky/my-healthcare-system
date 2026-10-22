import { useMockRequest } from "../../hooks/useMockRequest";
import ErrorState from "./ErrorState";
import Skeleton from "./Skeleton";
import SkeletonCard from "./SkeletonCard";

import { t } from "../../i18n";
function PageSkeleton({ label }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto w-full max-w-[1600px] space-y-6"
    >
      <span className="sr-only">{t(label)}</span>

      <Skeleton className="h-40 w-full rounded-[2rem]" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-3xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}

// Wraps every data-driven page: shows a loading skeleton while
// the (mock) data source responds, and an error state with
// retry if it fails. Add ?mockError=1 to a URL to preview it.
function DataPage({
  children,
  loadingText = t("Loading page..."),
  errorTitle = t("Could not load this page"),
  errorMessage = t("The information for this page could not be loaded. Please try again."),
}) {
  const { isLoading, isError, retry } = useMockRequest();

  if (isLoading) {
    return <PageSkeleton label={loadingText} />;
  }

  if (isError) {
    return (
      <ErrorState
        title={errorTitle}
        message={errorMessage}
        onRetry={retry}
      />
    );
  }

  return children;
}

export default DataPage;
