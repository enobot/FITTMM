package com.fittmm.app.data;

/** Clears training data, or deletes the account entirely. */
public final class UserDataCleaner {
    private final ApiClient api;
    private final FirebaseAccess access;

    public UserDataCleaner(ApiClient api, FirebaseAccess access) {
        this.api = api;
        this.access = access;
    }

    /** Removes the plan, logged workouts, custom exercises and weight history. Name and login stay. */
    public void wipeUserData(FittmmRepository.Done callback) {
        api.send("DELETE", "/auth/me/data", null, ProfileRepository.done(callback));
    }

    /** Deletes the API data first, then the Firebase account. Call after reauthenticating. */
    public void deleteAccount(FittmmRepository.Done callback) {
        api.send("DELETE", "/auth/me", null, ProfileRepository.done(new FittmmRepository.Done() {
            @Override
            public void onSuccess() {
                if (access.auth == null || access.auth.getCurrentUser() == null) {
                    callback.onSuccess();
                    return;
                }
                access.auth.getCurrentUser().delete()
                        .addOnSuccessListener(unused -> callback.onSuccess())
                        .addOnFailureListener(error -> {
                            // The data is gone either way; make sure they end up signed out
                            access.auth.signOut();
                            callback.onSuccess();
                        });
            }

            @Override
            public void onError(String message) {
                callback.onError(message);
            }
        }));
    }
}
