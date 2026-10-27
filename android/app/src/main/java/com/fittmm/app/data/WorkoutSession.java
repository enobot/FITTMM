package com.fittmm.app.data;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class WorkoutSession {
    public String id = "";
    public long loggedAt;
    public String day = "";
    public List<SessionEntry> entries = new ArrayList<>();

    public String title() {
        String when = loggedAt <= 0
                ? ""
                : new SimpleDateFormat("MMM d, h:mm a", Locale.US).format(new Date(loggedAt));
        if (day == null || day.isEmpty()) {
            return when.isEmpty() ? "Workout" : when;
        }
        if (when.isEmpty()) {
            return day;
        }
        return day + " · " + when;
    }

    public String details() {
        if (entries.isEmpty()) {
            return "No exercises logged";
        }
        StringBuilder text = new StringBuilder();
        for (SessionEntry entry : entries) {
            if (text.length() > 0) {
                text.append("\n");
            }
            text.append(entry.line());
        }
        return text.toString();
    }
}
