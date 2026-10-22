import { useContext } from "react";
import ToastContext from "./toastContextValue";

// Returns showToast(message, variant?) where variant is
// "success" | "error" | "warning" | "info".
export function useToast() {
  return useContext(ToastContext);
}
