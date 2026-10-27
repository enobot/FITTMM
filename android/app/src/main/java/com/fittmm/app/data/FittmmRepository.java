package com.fittmm.app.data;

import android.app.Activity;

import androidx.annotation.Nullable;

import com.google.firebase.auth.PhoneAuthCredential;

import org.json.JSONObject;

import java.util.List;

/**
 * Entry point the screens use. Each job lives in its own file: auth,
 * profile, plan, exercises, sessions, volume, and wiping data. Sign-in is
 * Firebase; everything else goes through the FITTMM API the website uses.
 */
public class FittmmRepository {
    public static final String NOT_CONFIGURED = FirebaseAccess.NOT_CONFIGURED;

    private final FirebaseAccess access = new FirebaseAccess();
    private final ApiClient api = new ApiClient(access);
    private final AuthRepository auth = new AuthRepository(access);
    private final ProfileRepository profiles = new ProfileRepository(api);
    private final PlanRepository plans = new PlanRepository(api);
    private final ExerciseRepository exercises = new ExerciseRepository(api);
    private final SessionRepository sessions = new SessionRepository(api);
    private final VolumeRepository volume = new VolumeRepository(api);
    private final UserDataCleaner cleaner = new UserDataCleaner(api, access);

    public boolean isConfigured() {
        return access.isConfigured();
    }

    // ---------- Accounts ----------

    public AuthRepository auth() {
        return auth;
    }

    public boolean isSignedIn() {
        return auth.isSignedIn();
    }

    public boolean needsEmailVerification() {
        return auth.needsEmailVerification();
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

    public void signInWithProvider(Activity activity, String providerId, ValueCallback<Boolean> isNewUser) {
        auth.signInWithProvider(activity, providerId, isNewUser);
    }

    public void recoverWithPhone(PhoneAuthCredential credential, ValueCallback<Boolean> hasPassword) {
        auth.recoverWithPhone(credential, hasPassword);
    }

    // ---------- Profile ----------

    public void loadProfile(ValueCallback<UserProfile> callback) {
        profiles.loadProfile(callback);
    }

    public void updateProfile(JSONObject changes, ValueCallback<UserProfile> callback) {
        profiles.updateProfile(changes, callback);
    }

    public void loadWeights(ValueCallback<List<WeightEntry>> callback) {
        profiles.loadWeights(callback);
    }

    public void addWeight(double pounds, @Nullable String recordedOn, Done callback) {
        profiles.addWeight(pounds, recordedOn, callback);
    }

    public void deleteWeight(long id, Done callback) {
        profiles.deleteWeight(id, callback);
    }

    // ---------- Training ----------

    public void loadPlan(ValueCallback<WorkoutPlan> callback) {
        plans.loadPlan(callback);
    }

    public void savePlan(WorkoutPlan plan, Done callback) {
        plans.savePlan(plan, callback);
    }

    public void loadExercises(ValueCallback<List<Exercise>> callback) {
        exercises.loadExercises(callback);
    }

    public void loadCustomExercises(ValueCallback<List<Exercise>> callback) {
        exercises.loadCustomExercises(callback);
    }

    public void addCustomExercise(String name, String bodyPart, ValueCallback<Exercise> callback) {
        exercises.addCustomExercise(name, bodyPart, callback);
    }

    public void loadExerciseDetail(long id, ValueCallback<ExerciseDetail> callback) {
        exercises.loadDetail(id, callback);
    }

    public void loadExerciseVideos(long id, ValueCallback<ExerciseDetail.VideoSearch> callback) {
        exercises.loadVideos(id, callback);
    }

    public void searchVideos(String query, ValueCallback<ExerciseDetail.VideoSearch> callback) {
        exercises.searchVideos(query, callback);
    }

    public void saveSession(WorkoutSession session, Done callback) {
        sessions.saveSession(session, callback);
    }

    public void loadSessions(ValueCallback<List<WorkoutSession>> callback) {
        sessions.loadSessions(callback);
    }

    public void loadVolume(int days, ValueCallback<VolumeSummary> callback) {
        volume.loadVolume(days, callback);
    }

    // ---------- Your data ----------

    public void wipeUserData(Done callback) {
        cleaner.wipeUserData(callback);
    }

    public void deleteAccount(Done callback) {
        cleaner.deleteAccount(callback);
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
