package com.fittmm.app.data;

/** The signed-in user's profile document. */
public final class ProfileRepository {
    private final FirebaseAccess access;

    public ProfileRepository(FirebaseAccess access) {
        this.access = access;
    }

    public void loadProfile(FittmmRepository.ValueCallback<UserProfile> callback) {
        if (!access.ready(callback)) {
            return;
        }
        String uid = access.uid();
        if (uid == null) {
            callback.onError("You are not signed in.");
            return;
        }
        access.userRef(uid).get()
                .addOnSuccessListener(snap -> callback.onSuccess(UserProfile.from(snap)))
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error)));
    }
}
