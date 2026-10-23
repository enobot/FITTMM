package com.fittmm.app.data;

import com.google.firebase.firestore.DocumentSnapshot;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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

    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("loggedAt", loggedAt);
        map.put("day", day == null ? "" : day);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SessionEntry entry : entries) {
            Map<String, Object> row = new HashMap<>();
            row.put("name", entry.name);
            row.put("sets", entry.sets);
            row.put("reps", entry.reps);
            row.put("weightLbs", entry.weightLbs);
            row.put("rating", entry.rating);
            rows.add(row);
        }
        map.put("entries", rows);
        return map;
    }

    public static WorkoutSession from(DocumentSnapshot snap) {
        WorkoutSession session = new WorkoutSession();
        session.id = snap.getId();
        Long logged = snap.getLong("loggedAt");
        session.loggedAt = logged == null ? 0L : logged;
        String storedDay = snap.getString("day");
        session.day = storedDay == null ? "" : storedDay;
        Object raw = snap.get("entries");
        if (raw instanceof List) {
            for (Object item : (List<?>) raw) {
                if (!(item instanceof Map)) {
                    continue;
                }
                Map<?, ?> map = (Map<?, ?>) item;
                SessionEntry entry = new SessionEntry();
                Object name = map.get("name");
                entry.name = name == null ? "" : String.valueOf(name);
                entry.sets = Numbers.asInt(map.get("sets"), 0);
                entry.reps = Numbers.asInt(map.get("reps"), 0);
                entry.weightLbs = Numbers.asDouble(map.get("weightLbs"), 0);
                entry.rating = Numbers.asInt(map.get("rating"), 0);
                session.entries.add(entry);
            }
        }
        return session;
    }
}
