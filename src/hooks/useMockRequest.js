import { useCallback, useEffect, useState } from "react";

const MOCK_DELAY = 400;

// Simulates loading a data source so pages can show their
// loading and error states before a real API exists.
// Add ?mockError=1 to any page URL to preview the error state.
export function useMockRequest(delay = MOCK_DELAY) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const shouldFail = new URLSearchParams(
      window.location.search
    ).has("mockError");

    const timer = setTimeout(() => {
      setStatus(shouldFail ? "error" : "success");
    }, delay);

    return () => clearTimeout(timer);
  }, [attempt, delay]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((previous) => previous + 1);
  }, []);

  return {
    isLoading: status === "loading",
    isError: status === "error",
    retry,
  };
}
