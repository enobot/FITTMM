import { getFirebase } from "./firebase";

/** Error with a message that's safe to show as-is. */
export class AuthMessageError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const PROVIDER_NAMES = { "google.com": "Google", "apple.com": "Apple", password: "email and password" };

const MESSAGES = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/missing-email": "Enter your email address.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/user-disabled": "This account has been turned off. Contact support to turn it back on.",
  "auth/email-already-in-use": "An account already uses this email. Log in instead, or reset your password.",
  "auth/weak-password": "Use at least 8 characters, including a letter and a number.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
  "auth/operation-not-allowed": "This sign-in method isn't turned on for FITTMM yet.",
  "auth/unauthorized-domain": "This web address isn't allowed to sign in yet. Add it under Authorized domains in Firebase.",
  "auth/network-request-failed": "Can't reach the sign-in service. Check your connection and try again.",
  "auth/invalid-phone-number": "Enter a full phone number, like +1 555 123 4567.",
  "auth/missing-phone-number": "Enter your phone number.",
  "auth/invalid-verification-code": "That code isn't right. Check the text message and try again.",
  "auth/missing-verification-code": "Enter the 6-digit code from the text message.",
  "auth/code-expired": "That code expired. Send a new one.",
  "auth/quota-exceeded": "Text messages are unavailable right now. Use email instead.",
  "auth/captcha-check-failed": "The security check failed. Reload the page and try again.",
  "auth/requires-recent-login": "For your security, confirm it's you before making this change.",
  "auth/credential-already-in-use": "That sign-in is already connected to a different FITTMM account.",
  "auth/provider-already-linked": "That sign-in method is already connected.",
  "auth/no-such-provider": "That sign-in method isn't connected.",
  "auth/expired-action-code": "This link has expired. Request a new one.",
  "auth/invalid-action-code": "This link was already used or isn't valid. Request a new one.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
};

/** A friendly message for any auth error, or null if the user just cancelled. */
export function authErrorMessage(err) {
  if (!err) return "Something went wrong. Try again.";
  if (err instanceof AuthMessageError) return err.message;
  const code = err.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ||
      code === "auth/user-cancelled") {
    return null;
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "You already have an account with this email. Log in the way you did before, then connect this method in Settings.";
  }
  return MESSAGES[code] || err.message || "Something went wrong. Try again.";
}

export function providerName(providerId) {
  return PROVIDER_NAMES[providerId] || providerId;
}

/** Password rule shared by sign-up, reset and change-password forms. */
export function passwordProblem(password) {
  if (!password || password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

/** 0-4 score for the strength meter. */
export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

/** Normalize to E.164. US numbers may omit the +1. Returns null if invalid. */
export function normalizePhone(raw) {
  const s = String(raw || "").trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** "+16505553434" -> "+1 650-555-3434"; other countries stay as entered. */
export function formatPhone(e164) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 || "");
  return m ? `+1 ${m[1]}-${m[2]}-${m[3]}` : e164 || "";
}

function continueUrl(path) {
  return { url: `${window.location.origin}${path}` };
}

async function setRemember(remember) {
  const { auth, fb } = await getFirebase();
  await fb.setPersistence(
    auth,
    remember ? fb.browserLocalPersistence : fb.browserSessionPersistence
  );
  return { auth, fb };
}

// ---------- Sign up and sign in ----------
export async function signUpWithEmail({ email, password, firstName, lastName }) {
  const { auth, fb } = await setRemember(true);
  const cred = await fb.createUserWithEmailAndPassword(auth, email.trim(), password);
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (displayName) await fb.updateProfile(cred.user, { displayName });
  await fb.sendEmailVerification(cred.user, continueUrl("/verify-email"));
  return cred.user;
}

export async function signInWithEmail(email, password, remember = true) {
  const { auth, fb } = await setRemember(remember);
  const cred = await fb.signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

function oauthProvider(fb, which) {
  if (which === "google") {
    const p = new fb.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    return p;
  }
  const p = new fb.OAuthProvider("apple.com");
  p.addScope("email");
  p.addScope("name");
  return p;
}

/** "google" or "apple". Falls back to a full-page redirect if pop-ups are blocked. */
export async function signInWithProvider(which, remember = true) {
  const { auth, fb } = await setRemember(remember);
  const provider = oauthProvider(fb, which);
  try {
    const cred = await fb.signInWithPopup(auth, provider);
    return { user: cred.user, isNewUser: Boolean(fb.getAdditionalUserInfo(cred)?.isNewUser) };
  } catch (err) {
    if (err.code === "auth/popup-blocked") {
      await fb.signInWithRedirect(auth, provider);
      return { user: null, isNewUser: false };
    }
    throw err;
  }
}

/** Finishes a Google/Apple sign-in that fell back to a full-page redirect. */
export async function completeRedirectSignIn() {
  const { auth, fb } = await getFirebase();
  const cred = await fb.getRedirectResult(auth);
  return cred ? { user: cred.user, isNewUser: Boolean(fb.getAdditionalUserInfo(cred)?.isNewUser) } : null;
}

export async function signOutEverywhere() {
  const { auth, fb } = await getFirebase();
  await fb.signOut(auth);
}

// ---------- Email verification ----------
export async function resendVerificationEmail() {
  const { auth, fb } = await getFirebase();
  if (!auth.currentUser) throw new AuthMessageError("Log in first.");
  await fb.sendEmailVerification(auth.currentUser, continueUrl("/verify-email"));
}

/** Reloads the user and refreshes the token so the backend sees email_verified. */
export async function refreshVerification() {
  const { auth } = await getFirebase();
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  if (user.emailVerified) await user.getIdToken(true);
  return user.emailVerified;
}

// ---------- Password reset ----------
export async function sendPasswordReset(email) {
  const { auth, fb } = await getFirebase();
  await fb.sendPasswordResetEmail(auth, email.trim(), continueUrl("/"));
}

let recaptcha = null;

async function phoneVerifier(containerId) {
  const { auth, fb } = await getFirebase();
  if (recaptcha) {
    try {
      recaptcha.clear();
    } catch (_) {}
  }
  recaptcha = new fb.RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return recaptcha;
}

/** Texts a sign-in code to a phone number already linked to an account. */
export async function sendRecoveryCode(phone, containerId) {
  const { auth, fb } = await getFirebase();
  const verifier = await phoneVerifier(containerId);
  return fb.signInWithPhoneNumber(auth, phone, verifier);
}

/**
 * Confirms the texted code. Phone sign-in would otherwise create a brand-new
 * account for an unknown number, so that new account is deleted immediately.
 */
export async function confirmRecoveryCode(confirmation, code) {
  const { fb } = await getFirebase();
  const cred = await confirmation.confirm(code.trim());
  if (fb.getAdditionalUserInfo(cred)?.isNewUser) {
    await cred.user.delete();
    throw new AuthMessageError(
      "No FITTMM account uses this phone number. Reset your password by email, then add your phone in Settings.",
      "fittmm/no-account-for-phone"
    );
  }
  return cred.user;
}

export async function setNewPassword(newPassword) {
  const { auth, fb } = await getFirebase();
  if (!auth.currentUser) throw new AuthMessageError("Log in first.");
  await fb.updatePassword(auth.currentUser, newPassword);
}

// ---------- Email action links (/auth/action) ----------
export async function checkActionCode(oobCode) {
  const { auth, fb } = await getFirebase();
  return fb.checkActionCode(auth, oobCode);
}

export async function applyEmailActionCode(oobCode) {
  const { auth, fb } = await getFirebase();
  await fb.applyActionCode(auth, oobCode);
  if (auth.currentUser) {
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
  }
}

export async function resetPasswordWithCode(oobCode, newPassword) {
  const { auth, fb } = await getFirebase();
  const email = await fb.verifyPasswordResetCode(auth, oobCode);
  await fb.confirmPasswordReset(auth, oobCode, newPassword);
  return email;
}

// ---------- Settings: sign-in methods ----------
export async function reauthenticate({ password } = {}) {
  const { auth, fb } = await getFirebase();
  const user = auth.currentUser;
  if (!user) throw new AuthMessageError("Log in first.");
  const providers = user.providerData.map((p) => p.providerId);
  if (password != null && providers.includes("password")) {
    const cred = fb.EmailAuthProvider.credential(user.email, password);
    await fb.reauthenticateWithCredential(user, cred);
    return;
  }
  const which = providers.includes("google.com") ? "google" : providers.includes("apple.com") ? "apple" : null;
  if (!which) throw new AuthMessageError("Enter your current password.");
  await fb.reauthenticateWithPopup(user, oauthProvider(fb, which));
}

/** Change the password, or add one to a Google/Apple account. */
export async function changePassword({ currentPassword, newPassword }) {
  const { auth, fb } = await getFirebase();
  const user = auth.currentUser;
  if (!user) throw new AuthMessageError("Log in first.");
  const hasPassword = user.providerData.some((p) => p.providerId === "password");
  if (hasPassword) {
    await reauthenticate({ password: currentPassword || "" });
    await fb.updatePassword(user, newPassword);
  } else {
    await fb.linkWithCredential(user, fb.EmailAuthProvider.credential(user.email, newPassword));
  }
  await user.reload();
}

export async function linkProvider(which) {
  const { auth, fb } = await getFirebase();
  await fb.linkWithPopup(auth.currentUser, oauthProvider(fb, which));
  await auth.currentUser.reload();
}

export async function unlinkProvider(providerId) {
  const { auth, fb } = await getFirebase();
  const user = auth.currentUser;
  if (user.providerData.length <= 1) {
    throw new AuthMessageError("Keep at least one way to sign in.");
  }
  await fb.unlink(user, providerId);
  await user.reload();
}

/** Texts a code to a new recovery phone. Returns a verification ID. */
export async function sendLinkPhoneCode(phone, containerId) {
  const { auth, fb } = await getFirebase();
  const verifier = await phoneVerifier(containerId);
  return new fb.PhoneAuthProvider(auth).verifyPhoneNumber(phone, verifier);
}

/** Adds the phone, or replaces the old one only once the new code checks out. */
export async function confirmLinkPhoneCode(verificationId, code) {
  const { auth, fb } = await getFirebase();
  const user = auth.currentUser;
  const credential = fb.PhoneAuthProvider.credential(verificationId, code.trim());
  if (user.providerData.some((p) => p.providerId === "phone")) {
    await fb.updatePhoneNumber(user, credential);
  } else {
    await fb.linkWithCredential(user, credential);
  }
  await user.reload();
}

export async function removeRecoveryPhone() {
  return unlinkProvider("phone");
}

export async function deleteFirebaseUser() {
  const { auth } = await getFirebase();
  if (auth.currentUser) await auth.currentUser.delete();
}
