package com.fittmm.app.data;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

/** Profile, body weight history and BMI, from /profile. */
public final class ProfileRepository {
    private final ApiClient api;

    public ProfileRepository(ApiClient api) {
        this.api = api;
    }

    public void loadProfile(FittmmRepository.ValueCallback<UserProfile> callback) {
        api.get("/profile", profileCallback(callback));
    }

    /** changes uses the API's field names (fname, date_of_birth, height in inches, weight in lb, ...). */
    public void updateProfile(JSONObject changes, FittmmRepository.ValueCallback<UserProfile> callback) {
        api.send("PATCH", "/profile", changes, profileCallback(callback));
    }

    public void loadWeights(FittmmRepository.ValueCallback<List<WeightEntry>> callback) {
        api.get("/profile/weights", new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(ApiJson.weightsFromApi(value instanceof JSONArray ? (JSONArray) value : null));
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }

    public void addWeight(double pounds, @Nullable String recordedOn, FittmmRepository.Done callback) {
        JSONObject body;
        try {
            body = new JSONObject().put("weight", pounds);
            if (recordedOn != null && !recordedOn.isEmpty()) {
                body.put("recorded_on", recordedOn);
            }
        } catch (JSONException error) {
            callback.onError("Couldn't log that weight.");
            return;
        }
        api.send("POST", "/profile/weights", body, done(callback));
    }

    public void deleteWeight(long id, FittmmRepository.Done callback) {
        api.send("DELETE", "/profile/weights/" + id, null, done(callback));
    }

    private static ApiClient.Callback profileCallback(FittmmRepository.ValueCallback<UserProfile> callback) {
        return new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(value instanceof JSONObject ? ApiJson.profileFromApi((JSONObject) value) : null);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        };
    }

    static ApiClient.Callback done(FittmmRepository.Done callback) {
        return new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess();
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        };
    }
}
