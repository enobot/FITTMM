package com.fittmm.app.data;

import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException;
import com.google.firebase.auth.FirebaseAuthInvalidUserException;
import com.google.firebase.auth.FirebaseAuthUserCollisionException;
import com.google.firebase.auth.FirebaseAuthWeakPasswordException;

import java.util.Locale;

/** Email and password accounts. */
public final class AuthRepository {
    private final FirebaseAccess access;

    public AuthRepository(FirebaseAccess access) {
        this.access = access;
    }

    public boolean isSignedIn() {
        return access.auth != null && access.auth.getCurrentUser() != null;
    }

    public String currentEmail() {
        if (access.auth == null || access.auth.getCurrentUser() == null || access.auth.getCurrentUser().getEmail() == null) {
            return "";
        }
        return access.auth.getCurrentUser().getEmail();
    }

    public void signOut() {
        if (access.auth != null) {
            access.auth.signOut();
        }
    }

    public void signIn(String email, String password, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        access.auth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener(result -> callback.onSuccess())
                .addOnFailureListener(error -> callback.onError(authMessage(error)));
    }

    public void signUp(UserProfile profile, String password, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        access.auth.createUserWithEmailAndPassword(profile.email, password)
                .addOnSuccessListener(result -> {
                    if (result.getUser() == null) {
                        callback.onError("Could not create the account.");
                        return;
                    }
                    access.db.collection("users").document(result.getUser().getUid())
                            .set(profile.toMap())
                            .addOnSuccessListener(unused -> callback.onSuccess())
                            .addOnFailureListener(error -> {
                                access.auth.signOut();
                                callback.onError("Account created, but the profile did not save. Log in to continue.");
                            });
                })
                .addOnFailureListener(error -> callback.onError(authMessage(error)));
    }

    private static String authMessage(Exception error) {
        if (error instanceof FirebaseAuthWeakPasswordException) {
            return "Password should be at least 6 characters.";
        }
        if (error instanceof FirebaseAuthUserCollisionException) {
            return "Email already registered.";
        }
        if (error instanceof FirebaseAuthInvalidUserException) {
            return "No account found for that email.";
        }
        if (error instanceof FirebaseAuthInvalidCredentialsException) {
            return "Incorrect email or password.";
        }
        String raw = error.getMessage() == null ? "" : error.getMessage().toLowerCase(Locale.US);
        if (raw.contains("password") || raw.contains("credential")) {
            return "Incorrect email or password.";
        }
        if (raw.contains("no user record")) {
            return "No account found for that email.";
        }
        return FirebaseAccess.message(error);
    }
}
