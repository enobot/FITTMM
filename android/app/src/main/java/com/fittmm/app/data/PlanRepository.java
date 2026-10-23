package com.fittmm.app.data;

/** The user's current weekly plan. */
public final class PlanRepository {
    private final FirebaseAccess access;

    public PlanRepository(FirebaseAccess access) {
        this.access = access;
    }

    public void loadPlan(FittmmRepository.ValueCallback<WorkoutPlan> callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        access.planRef(uid).get()
                .addOnSuccessListener(snap -> {
                    if (!snap.exists()) {
                        callback.onSuccess(null);
                    } else {
                        callback.onSuccess(WorkoutPlan.fromSnapshot(snap));
                    }
                })
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }

    public void savePlan(WorkoutPlan plan, FittmmRepository.Done callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        access.planRef(uid).set(plan.normalized().toMap())
                .addOnSuccessListener(unused -> callback.onSuccess())
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }
}
