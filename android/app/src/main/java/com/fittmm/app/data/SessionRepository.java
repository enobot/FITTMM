package com.fittmm.app.data;

import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;

import java.util.ArrayList;
import java.util.List;

/** Logged workouts for the signed-in user. */
public final class SessionRepository {
    private final FirebaseAccess access;

    public SessionRepository(FirebaseAccess access) {
        this.access = access;
    }

    public void saveSession(WorkoutSession session, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        access.sessionsRef(uid).add(session.toMap())
                .addOnSuccessListener(ref -> callback.onSuccess())
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }

    public void loadSessions(FittmmRepository.ValueCallback<List<WorkoutSession>> callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        access.sessionsRef(uid).orderBy("loggedAt", Query.Direction.DESCENDING).get()
                .addOnSuccessListener(snap -> {
                    List<WorkoutSession> sessions = new ArrayList<>();
                    for (DocumentSnapshot doc : snap.getDocuments()) {
                        sessions.add(WorkoutSession.from(doc));
                    }
                    callback.onSuccess(sessions);
                })
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }
}
