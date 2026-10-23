package com.fittmm.app.data;

import androidx.annotation.Nullable;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;

/** Shared Firebase Auth and Firestore handles. */
public final class FirebaseAccess {
    public static final String NOT_CONFIGURED =
            "Firebase is not set up yet. In the Firebase console, add an Android app with package com.fittmm.app, download google-services.json into android/app, then rebuild.";

    final FirebaseAuth auth;
    final FirebaseFirestore db;

    public FirebaseAccess() {
        FirebaseAuth firebaseAuth = null;
        FirebaseFirestore firestore = null;
        try {
            firebaseAuth = FirebaseAuth.getInstance();
            firestore = FirebaseFirestore.getInstance();
        } catch (Exception ignored) {
            firebaseAuth = null;
            firestore = null;
        }
        this.auth = firebaseAuth;
        this.db = firestore;
    }

    public boolean isConfigured() {
        return auth != null && db != null;
    }

    @Nullable
    public String uid() {
        if (auth == null || auth.getCurrentUser() == null) {
            return null;
        }
        return auth.getCurrentUser().getUid();
    }

    public DocumentReference userRef(String uid) {
        return db.collection("users").document(uid);
    }

    public DocumentReference planRef(String uid) {
        return userRef(uid).collection("plan").document("current");
    }

    public CollectionReference exercisesRef(String uid) {
        return userRef(uid).collection("exercises");
    }

    public CollectionReference sessionsRef(String uid) {
        return userRef(uid).collection("sessions");
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
