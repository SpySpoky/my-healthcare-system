import { useEffect, useState } from "react";
import { MESSAGES_CHANGED_EVENT, getUnreadCount } from "../data/messagesData";

const REFRESH_MS = 60 * 1000;

// Number of unread messages for the signed-in user. Refreshes every
// minute and whenever the Messages page reads, sends or deletes one.
export function useUnreadMessages(user) {
  const [count, setCount] = useState(0);
  const canMessage = ["patient", "doctor", "medical_staff"].includes(user?.role);
  const identity = user?.email;

  useEffect(() => {
    if (!canMessage) {
      return undefined;
    }

    let cancelled = false;

    const refresh = () =>
      getUnreadCount(user)
        .then((value) => !cancelled && setCount(value))
        .catch(() => {
          // A failed count just keeps the last number.
        });

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener(MESSAGES_CHANGED_EVENT, refresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener(MESSAGES_CHANGED_EVENT, refresh);
    };
    // The user object changes identity on updates; its e-mail and role are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canMessage, identity]);

  return canMessage ? count : 0;
}
