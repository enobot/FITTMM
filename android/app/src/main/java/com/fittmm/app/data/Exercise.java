package com.fittmm.app.data;

public class Exercise {
    public String id;
    public String name;
    public String bodyPart;
    public String description;
    public boolean custom;

    public Exercise(String id, String name, String bodyPart, String description, boolean custom) {
        this.id = id;
        this.name = name == null ? "" : name;
        this.bodyPart = bodyPart == null ? "" : bodyPart;
        this.description = description == null ? "" : description;
        this.custom = custom;
    }
}
