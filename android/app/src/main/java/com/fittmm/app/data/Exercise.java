package com.fittmm.app.data;

import java.util.ArrayList;
import java.util.List;

public class Exercise {
    public String id;
    public String name;
    public String bodyPart;
    public String description;
    public boolean custom;

    // Library details from the API (empty for presets and custom exercises)
    public String image = "";
    public List<String> images = new ArrayList<>();
    public String equipment = "";
    public String level = "";
    public String category = "";
    public List<String> primaryMuscles = new ArrayList<>();

    public Exercise(String id, String name, String bodyPart, String description, boolean custom) {
        this.id = id;
        this.name = name == null ? "" : name;
        this.bodyPart = bodyPart == null ? "" : bodyPart;
        this.description = description == null ? "" : description;
        this.custom = custom;
    }

    /** The API's numeric ID, or -1 for presets that only exist in the app. */
    public long apiId() {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException error) {
            return -1;
        }
    }
}
