package com.fittmm.app.data;

import androidx.annotation.Nullable;

import com.google.firebase.auth.FirebaseAuth;

/** Shared Firebase Auth handle. Data lives behind the FITTMM API (see ApiClient). */
public final class FirebaseAccess {
    public static final String NOT_CONFIGURED =
            "Firebase is not set up yet. In the Firebase console, add an Android app with package com.fittmm.app, download google-services.json into android/app, then rebuild.";

    final FirebaseAuth auth;

    public FirebaseAccess() {
        FirebaseAuth firebaseAuth;
        try {
            firebaseAuth = FirebaseAuth.getInstance();
        } catch (Exception ignored) {
            firebaseAuth = null;
        }
        this.auth = firebaseAuth;
    }

    public boolean isConfigured() {
        return auth != null;
    }

    @Nullable
    public String uid() {
        if (auth == null || auth.getCurrentUser() == null) {
            return null;
        }
        return auth.getCurrentUser().getUid();
    }

    public boolean ready(FittmmRepository.Done callback) {
        if (!isConfigured()) {
            callback.onError(NOT_CONFIGURED);
            return false;
        }
        return true;
    }

    public boolean ready(FittmmRepository.ValueCallback<?> callback) {
        if (!isConfigured()) {
            callback.onError(NOT_CONFIGURED);
            return false;
        }
        return true;
    }

    public static String message(Exception error) {
        if (error == null || error.getMessage() == null || error.getMessage().trim().isEmpty()) {
            return "Something went wrong. Please try again.";
        }
        return error.getMessage();
    }
}
