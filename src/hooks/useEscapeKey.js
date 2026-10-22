import { useEffect } from "react";

// Calls `onEscape` when Escape is pressed while `isActive` is true
// (used to close dialogs from the keyboard).
export function useEscapeKey(isActive, onEscape) {
  useEffect(() => {
    if (!isActive || !onEscape) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onEscape]);
}
