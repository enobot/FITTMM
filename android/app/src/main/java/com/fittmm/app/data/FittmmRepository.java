package com.fittmm.app.data;

import androidx.annotation.Nullable;

import java.util.List;

/**
 * Entry point the screens use. Each job lives in its own file:
 * auth, profile, plan, exercises, sessions, and wiping data.
 */
public class FittmmRepository {
    public static final String NOT_CONFIGURED = FirebaseAccess.NOT_CONFIGURED;

    private final FirebaseAccess access = new FirebaseAccess();
    private final AuthRepository auth = new AuthRepository(access);
    private final ProfileRepository profiles = new ProfileRepository(access);
    private final PlanRepository plans = new PlanRepository(access);
    private final ExerciseRepository exercises = new ExerciseRepository(access);
    private final SessionRepository sessions = new SessionRepository(access);
    private final UserDataCleaner cleaner = new UserDataCleaner(access);

    public boolean isConfigured() {
        return access.isConfigured();
    }

    public boolean isSignedIn() {
        return auth.isSignedIn();
    }

    public String currentEmail() {
        return auth.currentEmail();
    }

    public void signOut() {
        auth.signOut();
    }

    public void signIn(String email, String password, Done callback) {
        auth.signIn(email, password, callback);
    }

    public void signUp(UserProfile profile, String password, Done callback) {
        auth.signUp(profile, password, callback);
    }

    public void loadProfile(ValueCallback<UserProfile> callback) {
        profiles.loadProfile(callback);
    }

    public void loadPlan(ValueCallback<WorkoutPlan> callback) {
        plans.loadPlan(callback);
    }

    public void savePlan(WorkoutPlan plan, Done callback) {
        plans.savePlan(plan, callback);
    }

    public void loadCustomExercises(ValueCallback<List<Exercise>> callback) {
        exercises.loadCustomExercises(callback);
    }

    public void addCustomExercise(String name, String bodyPart, ValueCallback<Exercise> callback) {
        exercises.addCustomExercise(name, bodyPart, callback);
    }

    public void saveSession(WorkoutSession session, Done callback) {
        sessions.saveSession(session, callback);
    }

    public void loadSessions(ValueCallback<List<WorkoutSession>> callback) {
        sessions.loadSessions(callback);
    }

    public void wipeUserData(Done callback) {
        cleaner.wipeUserData(callback);
    }

    public interface Done {
        void onSuccess();

        void onError(String message);
    }

    public interface ValueCallback<T> {
        void onSuccess(@Nullable T value);

        void onError(String message);
    }
}
