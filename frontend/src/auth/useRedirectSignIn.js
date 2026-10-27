import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authErrorMessage, completeRedirectSignIn } from "./authService";
import { destinationAfterSignIn } from "./afterSignIn";
import { isFirebaseConfigured } from "./firebase";

/**
 * Google/Apple sign-in falls back to a full-page redirect when pop-ups are
 * blocked; this finishes it when the browser comes back to the page.
 * Returns { checking, error }.
 */
export function useRedirectSignIn(from) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(isFirebaseConfigured());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;
    let cancelled = false;
    completeRedirectSignIn()
      .then(async (result) => {
        if (result?.user && !cancelled) {
          navigate(await destinationAfterSignIn(from), { replace: true });
        }
      })
      .catch((err) => !cancelled && setError(authErrorMessage(err) || ""))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [from, navigate]);

  return { checking, error };
}
