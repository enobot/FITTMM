package com.fittmm.app.data;

import android.net.Uri;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** The exercise library (876 exercises with photos) plus the user's own exercises. */
public final class ExerciseRepository {
    private final ApiClient api;

    public ExerciseRepository(ApiClient api) {
        this.api = api;
    }

    /** Library and custom exercises together. */
    public void loadExercises(FittmmRepository.ValueCallback<List<Exercise>> callback) {
        api.get("/workout/exercises", new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(ApiJson.exercisesFromApi(value instanceof JSONArray ? (JSONArray) value : null));
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }

    public void loadCustomExercises(FittmmRepository.ValueCallback<List<Exercise>> callback) {
        loadExercises(new FittmmRepository.ValueCallback<List<Exercise>>() {
            @Override
            public void onSuccess(@Nullable List<Exercise> value) {
                List<Exercise> custom = new ArrayList<>();
                if (value != null) {
                    for (Exercise exercise : value) {
                        if (exercise.custom) {
                            custom.add(exercise);
                        }
                    }
                }
                callback.onSuccess(custom);
            }

            @Override
            public void onError(String message) {
                callback.onError(message);
            }
        });
    }

    public void addCustomExercise(String name, String bodyPart, FittmmRepository.ValueCallback<Exercise> callback) {
        JSONObject body;
        try {
            body = new JSONObject()
                    .put("name", name)
                    .put("description", "")
                    .put("image", "")
                    .put("body_part", bodyPart);
        } catch (JSONException error) {
            callback.onError("Couldn't add that exercise.");
            return;
        }
        api.send("POST", "/workout/exercises", body, new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(value instanceof JSONObject ? ApiJson.exerciseFromApi((JSONObject) value) : null);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }

    public void loadDetail(long id, FittmmRepository.ValueCallback<ExerciseDetail> callback) {
        api.get("/workout/exercises/" + id, new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(value instanceof JSONObject ? ApiJson.detailFromApi((JSONObject) value) : null);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(status == 404 ? "That exercise doesn't exist." : message);
            }
        });
    }

    public void loadVideos(long id, FittmmRepository.ValueCallback<ExerciseDetail.VideoSearch> callback) {
        api.get("/workout/exercises/" + id + "/videos", videoCallback(callback));
    }

    public void searchVideos(String query, FittmmRepository.ValueCallback<ExerciseDetail.VideoSearch> callback) {
        api.get("/workout/videos?q=" + Uri.encode(query), videoCallback(callback));
    }

    private static ApiClient.Callback videoCallback(FittmmRepository.ValueCallback<ExerciseDetail.VideoSearch> callback) {
        return new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(value instanceof JSONObject ? ApiJson.videosFromApi((JSONObject) value) : null);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        };
    }
}
