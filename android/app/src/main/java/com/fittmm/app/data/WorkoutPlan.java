package com.fittmm.app.data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class WorkoutPlan {
    public String name = "";
    public String description = "";
    public Map<String, List<String>> days = new LinkedHashMap<>();

    public boolean hasSelections() {
        for (List<String> list : days.values()) {
            if (list != null && !list.isEmpty()) {
                return true;
            }
        }
        return false;
    }

    public WorkoutPlan normalized() {
        WorkoutPlan copy = new WorkoutPlan();
        String trimmed = name == null ? "" : name.trim();
        copy.name = trimmed.isEmpty() ? "My plan" : trimmed;
        copy.description = description == null ? "" : description.trim();
        for (String day : Week.DAYS) {
            List<String> existing = days.get(day);
            copy.days.put(day, existing == null ? new ArrayList<String>() : new ArrayList<>(existing));
        }
        return copy;
    }

    public String toJson() {
        return WorkoutPlanCodec.toJson(this);
    }

    public static WorkoutPlan fromJson(String json) {
        return WorkoutPlanCodec.fromJson(json);
    }
}
