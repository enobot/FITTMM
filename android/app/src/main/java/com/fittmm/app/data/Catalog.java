package com.fittmm.app.data;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class Catalog {
    /** Body-part groups the exercise library uses (same as the website). */
    public static final String[] BODY_PARTS = {
            "chest", "back", "shoulders", "bicep", "triceps", "forearms", "abs", "glutes", "legs", "neck"
    };

    /** The quick picks use everyday names; these borrow the matching library entry's photo. */
    public static final Map<String, String> PHOTO_ALIASES = new HashMap<>();

    static {
        PHOTO_ALIASES.put("squats", "barbell squat");
        PHOTO_ALIASES.put("deadlifts", "barbell deadlift");
        PHOTO_ALIASES.put("hip thrusts", "barbell hip thrust");
        PHOTO_ALIASES.put("front squat", "front barbell squat");
        PHOTO_ALIASES.put("glute bridges", "barbell glute bridge");
        PHOTO_ALIASES.put("split squats", "split squat with dumbbells");
        PHOTO_ALIASES.put("bulgarians", "split squat with dumbbells");
    }

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
        if ("bicep".equals(trimmed)) {
            return "Biceps";
        }
        return trimmed.substring(0, 1).toUpperCase(Locale.US) + trimmed.substring(1);
    }

    private static void add(List<Exercise> list, String name, String bodyPart) {
        String id = "preset-" + name.toLowerCase(Locale.US).replace(" ", "-");
        list.add(new Exercise(id, name, bodyPart, "", false));
    }
}
