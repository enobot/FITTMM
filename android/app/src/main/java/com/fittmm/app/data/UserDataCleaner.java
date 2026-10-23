package com.fittmm.app.data;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.firestore.WriteBatch;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Clears workouts, custom exercises, and the plan. Name and login stay. */
public final class UserDataCleaner {
    private final FirebaseAccess access;

    public UserDataCleaner(FirebaseAccess access) {
        this.access = access;
    }

    public void wipeUserData(FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        DocumentReference user = access.userRef(uid);
        deleteAll(access.sessionsRef(uid), callback, () ->
                deleteAll(access.exercisesRef(uid), callback, () ->
                        access.planRef(uid).delete()
                                .addOnSuccessListener(unused -> clearProfile(user, callback))
                                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)))));
    }

    private void clearProfile(DocumentReference user, FittmmRepository.Done callback) {
        Map<String, Object> clear = new HashMap<>();
        clear.put("gender", "");
        clear.put("weight", 0);
        clear.put("height", 0);
        clear.put("dateOfBirth", "1900-01-01");
        user.set(clear, SetOptions.merge())
                .addOnSuccessListener(done -> callback.onSuccess())
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }

    private void deleteAll(CollectionReference ref, FittmmRepository.Done callback, Runnable next) {
        ref.get()
                .addOnSuccessListener(snap ->
                        deleteDocs(new ArrayList<>(snap.getDocuments()), 0, callback, next))
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }

    private void deleteDocs(List<DocumentSnapshot> docs, int index, FittmmRepository.Done callback, Runnable next) {
        if (access.db == null) {
            callback.onError(FirebaseAccess.NOT_CONFIGURED);
            return;
        }
        if (index >= docs.size()) {
            next.run();
            return;
        }
        WriteBatch batch = access.db.batch();
        int end = Math.min(index + 400, docs.size());
        for (int i = index; i < end; i++) {
            batch.delete(docs.get(i).getReference());
        }
        batch.commit()
                .addOnSuccessListener(unused -> deleteDocs(docs, end, callback, next))
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }
}
