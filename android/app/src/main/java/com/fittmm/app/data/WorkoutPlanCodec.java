package com.fittmm.app.data;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/** Turns a plan into JSON for the back stack and reads it back. */
public final class WorkoutPlanCodec {
    private WorkoutPlanCodec() {}

    public static String toJson(WorkoutPlan plan) {
        try {
            JSONObject root = new JSONObject();
            root.put("name", plan.name == null ? "" : plan.name);
            root.put("description", plan.description == null ? "" : plan.description);
            JSONObject daysJson = new JSONObject();
            for (Map.Entry<String, List<String>> entry : plan.days.entrySet()) {
                JSONArray array = new JSONArray();
                List<String> names = entry.getValue();
                if (names != null) {
                    for (String exercise : names) {
                        array.put(exercise);
                    }
                }
                daysJson.put(entry.getKey(), array);
            }
            root.put("days", daysJson);
            return root.toString();
        } catch (JSONException exception) {
            return "{}";
        }
    }

    public static WorkoutPlan fromJson(String json) {
        WorkoutPlan plan = new WorkoutPlan();
        if (json == null || json.trim().isEmpty()) {
            return plan;
        }
        try {
            JSONObject root = new JSONObject(json);
            plan.name = root.optString("name", "");
            plan.description = root.optString("description", "");
            JSONObject daysJson = root.optJSONObject("days");
            if (daysJson != null) {
                Iterator<String> keys = daysJson.keys();
                while (keys.hasNext()) {
                    String day = keys.next();
                    plan.days.put(day, namesFrom(daysJson.optJSONArray(day)));
                }
            }
        } catch (JSONException ignored) {
            return new WorkoutPlan();
        }
        return plan;
    }

    private static List<String> namesFrom(JSONArray array) {
        List<String> names = new ArrayList<>();
        if (array == null) {
            return names;
        }
        for (int i = 0; i < array.length(); i++) {
            String exercise = array.optString(i, "").trim();
            if (!exercise.isEmpty()) {
                names.add(exercise);
            }
        }
        return names;
    }
}
