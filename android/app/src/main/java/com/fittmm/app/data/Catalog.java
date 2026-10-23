package com.fittmm.app.data;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public final class Catalog {
    public static final String[] BODY_PARTS = {"legs", "glutes", "abs", "bicep", "back"};

    private Catalog() {}

    public static List<Exercise> presets() {
        List<Exercise> list = new ArrayList<>();
        add(list, "Squats", "legs");
        add(list, "Deadlifts", "back");
        add(list, "Romanian Deadlift", "legs");
        add(list, "Hip Thrusts", "glutes");
        add(list, "Leg Extensions", "legs");
        add(list, "Goblet Squat", "legs");
        add(list, "Front Squat", "legs");
        add(list, "Split Squats", "legs");
        add(list, "Glute Bridges", "glutes");
        add(list, "Box Squat", "legs");
        return Collections.unmodifiableList(list);
    }

    public static String label(String slug) {
        if (slug == null || slug.trim().isEmpty()) {
            return "";
        }
        String trimmed = slug.trim();
        return trimmed.substring(0, 1).toUpperCase(Locale.US) + trimmed.substring(1);
    }

    private static void add(List<Exercise> list, String name, String bodyPart) {
        String id = "preset-" + name.toLowerCase(Locale.US).replace(" ", "-");
        list.add(new Exercise(id, name, bodyPart, "", false));
    }
}
