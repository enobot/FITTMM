package com.fittmm.app.data;

import android.app.Activity;

import androidx.annotation.Nullable;

import com.google.android.gms.tasks.Task;
import com.google.firebase.FirebaseNetworkException;
import com.google.firebase.FirebaseTooManyRequestsException;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.EmailAuthProvider;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.auth.OAuthProvider;
import com.google.firebase.auth.PhoneAuthCredential;
import com.google.firebase.auth.PhoneAuthOptions;
import com.google.firebase.auth.PhoneAuthProvider;
import com.google.firebase.auth.UserInfo;
import com.google.firebase.auth.UserProfileChangeRequest;
import com.google.firebase.FirebaseException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/** Sign-in with email, Google or Apple; verification, resets and sign-in methods. */
public final class AuthRepository {
    public static final String GOOGLE = "google.com";
    public static final String APPLE = "apple.com";
    public static final String PASSWORD = "password";
    public static final String PHONE = "phone";

    private final FirebaseAccess access;

    public AuthRepository(FirebaseAccess access) {
        this.access = access;
    }

    @Nullable
    private FirebaseUser user() {
        return access.auth == null ? null : access.auth.getCurrentUser();
    }

    public boolean isSignedIn() {
        return user() != null;
    }

    public String currentEmail() {
        FirebaseUser user = user();
        return user == null || user.getEmail() == null ? "" : user.getEmail();
    }

    public String displayName() {
        FirebaseUser user = user();
        return user == null || user.getDisplayName() == null ? "" : user.getDisplayName();
    }

    public List<String> providers() {
        List<String> ids = new ArrayList<>();
        FirebaseUser user = user();
        if (user != null) {
            for (UserInfo info : user.getProviderData()) {
                if (!"firebase".equals(info.getProviderId())) {
                    ids.add(info.getProviderId());
                }
            }
        }
        return ids;
    }

    public String phoneNumber() {
        FirebaseUser user = user();
        return user == null || user.getPhoneNumber() == null ? "" : user.getPhoneNumber();
    }

    public boolean isEmailVerified() {
        FirebaseUser user = user();
        return user != null && user.isEmailVerified();
    }

    /** Email/password accounts must confirm their address before using the app. */
    public boolean needsEmailVerification() {
        FirebaseUser user = user();
        return user != null && user.getEmail() != null && !user.isEmailVerified()
                && providers().contains(PASSWORD);
    }

    public void signOut() {
        if (access.auth != null) {
            access.auth.signOut();
        }
    }

    // ---------- Email and password ----------

    public void signIn(String email, String password, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        done(access.auth.signInWithEmailAndPassword(email, password), callback);
    }

    /** Creates the account, sets the display name, and sends the verification email. */
    public void signUp(UserProfile profile, String password, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        access.auth.createUserWithEmailAndPassword(profile.email, password)
                .addOnSuccessListener(result -> {
                    FirebaseUser user = result.getUser();
                    if (user == null) {
                        callback.onError("Could not create the account.");
                        return;
                    }
                    String name = (profile.fname + " " + profile.lname).trim();
                    user.updateProfile(new UserProfileChangeRequest.Builder().setDisplayName(name).build())
                            .continueWithTask(task -> user.sendEmailVerification())
                            .addOnSuccessListener(unused -> callback.onSuccess())
                            .addOnFailureListener(error -> callback.onSuccess()); // they can resend from the next screen
                })
                .addOnFailureListener(error -> callback.onError(messageOrCancel(error)));
    }

    public void resendVerification(FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onError("Log in first.");
            return;
        }
        user.sendEmailVerification()
                .addOnSuccessListener(unused -> callback.onSuccess())
                .addOnFailureListener(error -> callback.onError(messageOrCancel(error)));
    }

    /** Reloads the user; when verified, refreshes the token so the API sees it too. */
    public void refreshVerification(FittmmRepository.ValueCallback<Boolean> callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onSuccess(false);
            return;
        }
        user.reload()
                .addOnSuccessListener(unused -> {
                    FirebaseUser fresh = user();
                    if (fresh != null && fresh.isEmailVerified()) {
                        fresh.getIdToken(true)
                                .addOnSuccessListener(token -> callback.onSuccess(true))
                                .addOnFailureListener(error -> callback.onSuccess(true));
                    } else {
                        callback.onSuccess(false);
                    }
                })
                .addOnFailureListener(error -> callback.onError(messageOrCancel(error)));
    }

    public void sendPasswordReset(String email, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        access.auth.sendPasswordResetEmail(email)
                .addOnSuccessListener(unused -> callback.onSuccess())
                .addOnFailureListener(error -> {
                    // Don't reveal whether an account exists
                    if (error instanceof FirebaseAuthException
                            && "ERROR_USER_NOT_FOUND".equals(((FirebaseAuthException) error).getErrorCode())) {
                        callback.onSuccess();
                    } else {
                        callback.onError(messageOrCancel(error));
                    }
                });
    }

    // ---------- Google and Apple ----------

    /** Opens the provider's sign-in page in a browser tab (used for Apple, and Google with the emulator). */
    public void signInWithProvider(Activity activity, String providerId, FittmmRepository.ValueCallback<Boolean> isNewUser) {
        if (!access.ready(isNewUser)) {
            return;
        }
        Task<AuthResult> pending = access.auth.getPendingAuthResult();
        Task<AuthResult> task = pending != null
                ? pending
                : access.auth.startActivityForSignInWithProvider(activity, provider(providerId));
        task.addOnSuccessListener(result -> isNewUser.onSuccess(
                        result.getAdditionalUserInfo() != null && result.getAdditionalUserInfo().isNewUser()))
                .addOnFailureListener(error -> isNewUser.onError(messageOrCancel(error)));
    }

    /** Google sign-in with an ID token from Android's Credential Manager. */
    public void signInWithGoogleIdToken(String idToken, FittmmRepository.ValueCallback<Boolean> isNewUser) {
        if (!access.ready(isNewUser)) {
            return;
        }
        access.auth.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))
                .addOnSuccessListener(result -> isNewUser.onSuccess(
                        result.getAdditionalUserInfo() != null && result.getAdditionalUserInfo().isNewUser()))
                .addOnFailureListener(error -> isNewUser.onError(messageOrCancel(error)));
    }

    public void linkProvider(Activity activity, String providerId, FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onError("Log in first.");
            return;
        }
        done(user.startActivityForLinkWithProvider(activity, provider(providerId)), callback);
    }

    public void unlinkProvider(String providerId, FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onError("Log in first.");
            return;
        }
        if (user.getProviderData().size() <= 2) { // "firebase" plus one real method
            callback.onError("Keep at least one way to sign in.");
            return;
        }
        done(user.unlink(providerId), callback);
    }

    private static OAuthProvider provider(String providerId) {
        OAuthProvider.Builder builder = OAuthProvider.newBuilder(providerId);
        if (APPLE.equals(providerId)) {
            builder.setScopes(Arrays.asList("email", "name"));
        } else {
            builder.addCustomParameter("prompt", "select_account");
        }
        return builder.build();
    }

    // ---------- Phone: recovery and linking ----------

    public interface CodeSent {
        void onCodeSent(String verificationId);

        /** Some devices verify the text automatically. */
        void onVerified(PhoneAuthCredential credential);

        void onError(String message);
    }

    public void sendPhoneCode(Activity activity, String phoneE164, CodeSent callback) {
        if (access.auth == null) {
            callback.onError(FirebaseAccess.NOT_CONFIGURED);
            return;
        }
        PhoneAuthOptions options = PhoneAuthOptions.newBuilder(access.auth)
                .setPhoneNumber(phoneE164)
                .setTimeout(60L, TimeUnit.SECONDS)
                .setActivity(activity)
                .setCallbacks(new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                    @Override
                    public void onVerificationCompleted(PhoneAuthCredential credential) {
                        callback.onVerified(credential);
                    }

                    @Override
                    public void onVerificationFailed(FirebaseException error) {
                        callback.onError(messageOrCancel(error));
                    }

                    @Override
                    public void onCodeSent(String verificationId, PhoneAuthProvider.ForceResendingToken token) {
                        callback.onCodeSent(verificationId);
                    }
                })
                .build();
        PhoneAuthProvider.verifyPhoneNumber(options);
    }

    public static PhoneAuthCredential codeCredential(String verificationId, String code) {
        return PhoneAuthProvider.getCredential(verificationId, code);
    }

    /**
     * Signs in with a recovery phone. Phone sign-in would otherwise create a new
     * account for an unknown number, so that account is deleted right away.
     * Succeeds with whether the account has a password to reset.
     */
    public void recoverWithPhone(PhoneAuthCredential credential, FittmmRepository.ValueCallback<Boolean> hasPassword) {
        if (!access.ready(hasPassword)) {
            return;
        }
        access.auth.signInWithCredential(credential)
                .addOnSuccessListener(result -> {
                    FirebaseUser user = result.getUser();
                    boolean isNew = result.getAdditionalUserInfo() != null && result.getAdditionalUserInfo().isNewUser();
                    if (isNew && user != null) {
                        user.delete().addOnCompleteListener(task -> {
                            signOut();
                            hasPassword.onError("No FITTMM account uses this phone number. Reset your password by email, then add your phone in Settings.");
                        });
                        return;
                    }
                    hasPassword.onSuccess(providers().contains(PASSWORD));
                })
                .addOnFailureListener(error -> hasPassword.onError(messageOrCancel(error)));
    }

    /** Adds the recovery phone, or replaces the old one now that the new code checked out. */
    public void linkPhone(PhoneAuthCredential credential, FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onError("Log in first.");
            return;
        }
        if (providers().contains(PHONE)) {
            done(user.updatePhoneNumber(credential), callback);
        } else {
            done(user.linkWithCredential(credential), callback);
        }
    }

    // ---------- Passwords ----------

    public void setNewPassword(String password, FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onError("Log in first.");
            return;
        }
        done(user.updatePassword(password), callback);
    }

    /** Changes the password, or adds one to a Google or Apple account. */
    public void changePassword(@Nullable String currentPassword, String newPassword, FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null || user.getEmail() == null) {
            callback.onError("Log in first.");
            return;
        }
        if (providers().contains(PASSWORD)) {
            AuthCredential credential = EmailAuthProvider.getCredential(user.getEmail(),
                    currentPassword == null ? "" : currentPassword);
            done(user.reauthenticate(credential).continueWithTask(task -> {
                if (!task.isSuccessful() && task.getException() != null) {
                    throw task.getException();
                }
                return user.updatePassword(newPassword);
            }), callback);
        } else {
            done(user.linkWithCredential(EmailAuthProvider.getCredential(user.getEmail(), newPassword)), callback);
        }
    }

    /** Confirms it's really them before deleting the account. */
    public void reauthenticate(Activity activity, @Nullable String password, FittmmRepository.Done callback) {
        FirebaseUser user = user();
        if (user == null) {
            callback.onError("Log in first.");
            return;
        }
        List<String> providers = providers();
        if (providers.contains(PASSWORD) && password != null && user.getEmail() != null) {
            done(user.reauthenticate(EmailAuthProvider.getCredential(user.getEmail(), password)), callback);
        } else if (providers.contains(GOOGLE) || providers.contains(APPLE)) {
            String id = providers.contains(GOOGLE) ? GOOGLE : APPLE;
            done(user.startActivityForReauthenticateWithProvider(activity, provider(id)), callback);
        } else {
            callback.onError("Enter your password.");
        }
    }

    private static <T> void done(Task<T> task, FittmmRepository.Done callback) {
        task.addOnSuccessListener(unused -> callback.onSuccess())
                .addOnFailureListener(error -> callback.onError(messageOrCancel(error)));
    }

    /** A message that's safe to show, or "" when the user just backed out. */
    public static String messageOrCancel(Exception error) {
        if (error instanceof FirebaseTooManyRequestsException) {
            return "Too many attempts. Wait a few minutes, then try again.";
        }
        if (error instanceof FirebaseNetworkException) {
            return "Can't reach the sign-in service. Check your connection and try again.";
        }
        if (error instanceof FirebaseAuthException) {
            switch (((FirebaseAuthException) error).getErrorCode()) {
                case "ERROR_INVALID_EMAIL":
                    return "That email address doesn't look right.";
                case "ERROR_WRONG_PASSWORD":
                case "ERROR_USER_NOT_FOUND":
                case "ERROR_INVALID_CREDENTIAL":
                    return "Incorrect email or password.";
                case "ERROR_USER_DISABLED":
                    return "This account has been turned off.";
                case "ERROR_EMAIL_ALREADY_IN_USE":
                    return "An account already uses this email. Log in instead, or reset your password.";
                case "ERROR_WEAK_PASSWORD":
                    return "Use at least 8 characters, including a letter and a number.";
                case "ERROR_ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL":
                    return "You already have an account with this email. Log in the way you did before, then connect this method in Settings.";
                case "ERROR_CREDENTIAL_ALREADY_IN_USE":
                    return "That sign-in is already connected to a different FITTMM account.";
                case "ERROR_PROVIDER_ALREADY_LINKED":
                    return "That sign-in method is already connected.";
                case "ERROR_REQUIRES_RECENT_LOGIN":
                    return "For your security, confirm it's you before making this change.";
                case "ERROR_INVALID_PHONE_NUMBER":
                    return "Enter a full phone number, like +1 555 123 4567.";
                case "ERROR_INVALID_VERIFICATION_CODE":
                    return "That code isn't right. Check the text message and try again.";
                case "ERROR_SESSION_EXPIRED":
                    return "That code expired. Send a new one.";
                case "ERROR_OPERATION_NOT_ALLOWED":
                    return "This sign-in method isn't turned on for FITTMM yet.";
                case "ERROR_WEB_CONTEXT_CANCELED":
                    return "";
                default:
                    break;
            }
        }
        String raw = error == null || error.getMessage() == null ? "" : error.getMessage().toLowerCase(Locale.US);
        if (raw.contains("canceled") || raw.contains("cancelled")) {
            return "";
        }
        return FirebaseAccess.message(error);
    }
}
