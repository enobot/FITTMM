package com.fittmm.app.data;

import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Custom exercises saved under the signed-in user. */
public final class ExerciseRepository {
    private final FirebaseAccess access;

    public ExerciseRepository(FirebaseAccess access) {
        this.access = access;
    }

    public void loadCustomExercises(FittmmRepository.ValueCallback<List<Exercise>> callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        access.exercisesRef(uid).get()
                .addOnSuccessListener(snap -> {
                    List<Exercise> exercises = new ArrayList<>();
                    for (DocumentSnapshot doc : snap.getDocuments()) {
                        String name = doc.getString("name");
                        String bodyPart = doc.getString("bodyPart");
                        String description = doc.getString("description");
                        if (name != null && !name.trim().isEmpty()) {
                            exercises.add(new Exercise(
                                    doc.getId(),
                                    name.trim(),
                                    bodyPart == null ? "" : bodyPart,
                                    description == null ? "" : description,
                                    true
                            ));
                        }
                    }
                    callback.onSuccess(exercises);
                })
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }

    public void addCustomExercise(String name, String bodyPart, FittmmRepository.ValueCallback<Exercise> callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        DocumentReference ref = access.exercisesRef(uid).document();
        Map<String, Object> data = new HashMap<>();
        data.put("name", name);
        data.put("bodyPart", bodyPart);
        data.put("description", "");
        ref.set(data)
                .addOnSuccessListener(unused ->
                        callback.onSuccess(new Exercise(ref.getId(), name, bodyPart, "", true)))
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }
}
