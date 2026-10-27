/**
 * Firebase Auth, loaded on first use so pages that never sign in (and the
 * Jest tests) don't pull the SDK in.
 *
 * Configure with REACT_APP_FIREBASE_* variables (see frontend/.env.example).
 * Set REACT_APP_FIREBASE_AUTH_EMULATOR_HOST (e.g. 127.0.0.1:9099) to use the
 * local Auth emulator instead of a real project.
 */
const env = process.env;

export const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: env.REACT_APP_FIREBASE_APP_ID,
};

export const emulatorHost = (env.REACT_APP_FIREBASE_AUTH_EMULATOR_HOST || "").trim();

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let firebasePromise = null;

/** Resolves to { auth, fb } where fb is the firebase/auth module. */
export function getFirebase() {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      if (!isFirebaseConfigured()) {
        throw new Error(
          "Sign-in isn't set up for this site yet. Add the Firebase settings to the frontend .env file."
        );
      }
      const [{ initializeApp }, fb] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
      ]);
      const app = initializeApp(firebaseConfig);
      const auth = fb.getAuth(app);
      if (emulatorHost) {
        fb.connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
        // The emulator accepts phone codes without reCAPTCHA
        auth.settings.appVerificationDisabledForTesting = true;
      }
      auth.useDeviceLanguage();
      // Restore the saved sign-in before anyone reads auth.currentUser
      await auth.authStateReady();
      return { auth, fb };
    })();
    firebasePromise.catch(() => {
      firebasePromise = null;
    });
  }
  return firebasePromise;
}
