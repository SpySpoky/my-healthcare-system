import { useCallback, useState } from "react";
import { saveStored } from "../data/adminData";

// useState that also writes every change to localStorage.
// `load` reads the initial value (falling back to defaults).
export function useStoredState(key, load) {
  const [value, setValue] = useState(load);

  const setStoredValue = useCallback(
    (update) => {
      setValue((previous) => {
        const next =
          typeof update === "function" ? update(previous) : update;

        saveStored(key, next);

        return next;
      });
    },
    [key]
  );

  return [value, setStoredValue];
}
