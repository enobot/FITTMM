package com.fittmm.app.data;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** The user's current weekly plan, shared with the website through the API. */
public final class PlanRepository {
    private final ApiClient api;

    public PlanRepository(ApiClient api) {
        this.api = api;
    }

    public void loadPlan(FittmmRepository.ValueCallback<WorkoutPlan> callback) {
        api.get("/workout/plan", new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(value instanceof JSONObject ? ApiJson.planFromApi((JSONObject) value) : null);
            }

            @Override
            public void onError(String message, int status) {
                if (status == 404) {
                    callback.onSuccess(null);   // no plan yet
                } else {
                    callback.onError(message);
                }
            }
        });
    }

    /** Looks up (or creates) each exercise's API ID, then saves the whole week. */
    public void savePlan(WorkoutPlan plan, FittmmRepository.Done callback) {
        api.get("/workout/exercises", new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                Map<String, Long> ids = new HashMap<>();
                for (Exercise exercise : ApiJson.exercisesFromApi((JSONArray) value)) {
                    String key = exercise.name.trim().toLowerCase(Locale.US);
                    // The user's own exercise wins over a library one with the same name
                    if (!ids.containsKey(key) || exercise.custom) {
                        ids.put(key, exercise.apiId());
                    }
                }
                Set<String> missing = new LinkedHashSet<>();
                for (List<String> names : plan.normalized().days.values()) {
                    for (String name : names) {
                        if (!ids.containsKey(name.trim().toLowerCase(Locale.US))) {
                            missing.add(name.trim());
                        }
                    }
                }
                createMissing(new ArrayList<>(missing), 0, ids, plan, callback);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }

    private void createMissing(List<String> names, int index, Map<String, Long> ids,
                               WorkoutPlan plan, FittmmRepository.Done callback) {
        if (index >= names.size()) {
            put(plan, ids, callback);
            return;
        }
        String name = names.get(index);
        JSONObject body;
        try {
            body = new JSONObject().put("name", name).put("description", "").put("image", "");
        } catch (JSONException error) {
            callback.onError("Couldn't save the plan.");
            return;
        }
        api.send("POST", "/workout/exercises", body, new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                if (value instanceof JSONObject) {
                    ids.put(name.toLowerCase(Locale.US), ((JSONObject) value).optLong("id"));
                }
                createMissing(names, index + 1, ids, plan, callback);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }

    private void put(WorkoutPlan plan, Map<String, Long> ids, FittmmRepository.Done callback) {
        JSONObject body;
        try {
            body = ApiJson.planToApi(plan, ids);
        } catch (JSONException error) {
            callback.onError("Couldn't save the plan.");
            return;
        }
        api.send("PUT", "/workout/plan", body, new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess();
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }
}
