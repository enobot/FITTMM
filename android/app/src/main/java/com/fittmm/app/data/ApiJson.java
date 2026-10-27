package com.fittmm.app.data;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Converts between the API's JSON and the app's models. Workouts are stored
 * the website's way (one row per set), so both apps read each other's logs.
 */
public final class ApiJson {
    private ApiJson() {}

    // ---------- Plans ----------

    public static WorkoutPlan planFromApi(@Nullable JSONObject json) {
        WorkoutPlan plan = new WorkoutPlan();
        for (String day : Week.DAYS) {
            plan.days.put(day, new ArrayList<>());
        }
        if (json == null) {
            return plan;
        }
        plan.name = json.optString("name", "");
        plan.description = json.optString("description", "");
        JSONArray workouts = json.optJSONArray("workouts");
        for (int w = 0; workouts != null && w < workouts.length(); w++) {
            JSONArray rows = workouts.optJSONObject(w) == null
                    ? null : workouts.optJSONObject(w).optJSONArray("workout_exercises");
            for (int i = 0; rows != null && i < rows.length(); i++) {
                JSONObject row = rows.optJSONObject(i);
                if (row == null) {
                    continue;
                }
                int dayIndex = row.optInt("day_of_week", -1);
                String name = row.optString("name", "").trim();
                if (dayIndex < 0 || dayIndex >= Week.DAYS.length || name.isEmpty() || "null".equals(name)) {
                    continue;
                }
                List<String> names = plan.days.get(Week.DAYS[dayIndex]);
                if (!names.contains(name)) {
                    names.add(name);
                }
            }
        }
        return plan;
    }

    /** idsByLowerName maps each exercise name (lowercased) to its API ID. */
    public static JSONObject planToApi(WorkoutPlan plan, Map<String, Long> idsByLowerName) throws JSONException {
        WorkoutPlan clean = plan.normalized();
        JSONArray rows = new JSONArray();
        for (int dayIndex = 0; dayIndex < Week.DAYS.length; dayIndex++) {
            for (String name : clean.days.get(Week.DAYS[dayIndex])) {
                Long id = idsByLowerName.get(name.trim().toLowerCase(Locale.US));
                if (id != null) {
                    rows.put(new JSONObject().put("exerciseid", id).put("day_of_week", dayIndex));
                }
            }
        }
        JSONObject weekly = new JSONObject()
                .put("name", "Weekly")
                .put("description", "")
                .put("workout_exercises", rows);
        return new JSONObject()
                .put("name", truncate(clean.name, 50))
                .put("description", truncate(clean.description, 250))
                .put("workouts", new JSONArray().put(weekly));
    }

    // ---------- Workout sessions ----------

    /** The website's payload: each exercise lists every set. */
    public static JSONObject sessionToPayload(WorkoutSession session, String localDate, String isoDate)
            throws JSONException {
        JSONArray exercises = new JSONArray();
        double total = 0;
        Map<String, JSONObject> byName = new LinkedHashMap<>();
        for (SessionEntry entry : session.entries) {
            String key = entry.name.trim().toLowerCase(Locale.US);
            JSONObject exercise = byName.get(key);
            if (exercise == null) {
                exercise = new JSONObject()
                        .put("name", entry.name.trim())
                        .put("rating", entry.rating)
                        .put("sets", new JSONArray())
                        .put("totalVolume", 0.0);
                byName.put(key, exercise);
                exercises.put(exercise);
            }
            JSONArray sets = exercise.getJSONArray("sets");
            for (int i = 0; i < entry.sets; i++) {
                sets.put(new JSONObject()
                        .put("set", sets.length() + 1)
                        .put("reps", entry.reps)
                        .put("weight", entry.weightLbs)
                        .put("weightLbs", entry.weightLbs));
                double volume = entry.reps * entry.weightLbs;
                exercise.put("totalVolume", exercise.getDouble("totalVolume") + volume);
                total += volume;
            }
        }
        return new JSONObject()
                .put("day", session.day == null ? "" : session.day)
                .put("date", isoDate)
                .put("local_date", localDate)
                .put("exercises", exercises)
                .put("totalVolume", total);
    }

    /** Reads a stored session; consecutive identical sets are grouped back into one entry. */
    public static WorkoutSession sessionFromApi(JSONObject row) {
        WorkoutSession session = new WorkoutSession();
        session.id = String.valueOf(row.optLong("id"));
        JSONObject payload = row.optJSONObject("payload");
        if (payload == null) {
            payload = new JSONObject();
        }
        session.day = payload.optString("day", "");
        long when = parseInstant(payload.optString("date", ""));
        session.loggedAt = when > 0 ? when : parseInstant(row.optString("logged_at", ""));
        JSONArray exercises = payload.optJSONArray("exercises");
        for (int e = 0; exercises != null && e < exercises.length(); e++) {
            JSONObject exercise = exercises.optJSONObject(e);
            if (exercise == null) {
                continue;
            }
            String name = exercise.optString("name", "Workout");
            int rating = exercise.optInt("rating", 0);
            JSONArray sets = exercise.optJSONArray("sets");
            SessionEntry current = null;
            for (int s = 0; sets != null && s < sets.length(); s++) {
                JSONObject set = sets.optJSONObject(s);
                if (set == null) {
                    continue;
                }
                int reps = set.optInt("reps", 0);
                double weight = set.has("weightLbs") ? set.optDouble("weightLbs", 0) : set.optDouble("weight", 0);
                if (Double.isNaN(weight)) {
                    weight = 0;
                }
                if (current != null && current.reps == reps && current.weightLbs == weight) {
                    current.sets += 1;
                    continue;
                }
                current = new SessionEntry();
                current.name = name;
                current.sets = 1;
                current.reps = reps;
                current.weightLbs = weight;
                current.rating = rating;
                session.entries.add(current);
            }
        }
        return session;
    }

    // ---------- Exercises ----------

    public static Exercise exerciseFromApi(JSONObject json) {
        Exercise exercise = new Exercise(
                String.valueOf(json.optLong("id")),
                json.optString("name", ""),
                optText(json, "body_part"),
                optText(json, "description"),
                !json.isNull("userid") && json.has("userid")
        );
        exercise.image = optText(json, "image");
        exercise.images = strings(json.optJSONArray("images"));
        exercise.equipment = optText(json, "equipment");
        exercise.level = optText(json, "level");
        exercise.category = optText(json, "category");
        exercise.primaryMuscles = strings(json.optJSONArray("primary_muscles"));
        return exercise;
    }

    public static List<Exercise> exercisesFromApi(@Nullable JSONArray array) {
        List<Exercise> list = new ArrayList<>();
        for (int i = 0; array != null && i < array.length(); i++) {
            JSONObject json = array.optJSONObject(i);
            if (json != null) {
                list.add(exerciseFromApi(json));
            }
        }
        return list;
    }

    public static ExerciseDetail detailFromApi(JSONObject json) {
        ExerciseDetail detail = new ExerciseDetail();
        detail.exercise = exerciseFromApi(json);
        detail.force = optText(json, "force");
        detail.mechanic = optText(json, "mechanic");
        detail.secondaryMuscles = strings(json.optJSONArray("secondary_muscles"));
        detail.instructions = strings(json.optJSONArray("instructions"));
        detail.tips = strings(json.optJSONArray("tips"));
        detail.videoQuery = optText(json, "video_query");
        return detail;
    }

    public static ExerciseDetail.VideoSearch videosFromApi(JSONObject json) {
        ExerciseDetail.VideoSearch search = new ExerciseDetail.VideoSearch();
        search.configured = json.optBoolean("configured", false);
        search.query = optText(json, "query");
        search.searchUrl = optText(json, "search_url");
        search.error = optText(json, "error");
        JSONArray videos = json.optJSONArray("videos");
        for (int i = 0; videos != null && i < videos.length(); i++) {
            JSONObject v = videos.optJSONObject(i);
            if (v == null) {
                continue;
            }
            ExerciseDetail.Video video = new ExerciseDetail.Video();
            video.videoId = optText(v, "video_id");
            video.title = optText(v, "title");
            video.channel = optText(v, "channel");
            video.thumbnail = optText(v, "thumbnail");
            video.durationSeconds = v.isNull("duration_seconds") ? -1 : v.optInt("duration_seconds", -1);
            video.viewCount = v.isNull("view_count") ? -1 : v.optLong("view_count", -1);
            search.videos.add(video);
        }
        return search;
    }

    // ---------- Profile and weight ----------

    public static UserProfile profileFromApi(JSONObject json) {
        UserProfile profile = new UserProfile();
        profile.fname = optText(json, "fname");
        profile.lname = optText(json, "lname");
        profile.email = optText(json, "email");
        profile.dateOfBirth = optText(json, "date_of_birth");
        profile.gender = optText(json, "gender");
        profile.weight = json.isNull("weight") ? 0 : json.optDouble("weight", 0);
        profile.height = json.isNull("height") ? 0 : json.optDouble("height", 0);
        profile.age = json.isNull("age") || !json.has("age") ? null : json.optInt("age");
        profile.previousWeight = optDouble(json, "previous_weight");
        profile.goalWeight = optDouble(json, "goal_weight");
        profile.unitSystem = json.optString("unit_system", "imperial");
        profile.bmi = optDouble(json, "bmi");
        profile.bmiCategory = optText(json, "bmi_category");
        profile.profileComplete = json.optBoolean("profile_complete", false);
        return profile;
    }

    public static List<WeightEntry> weightsFromApi(@Nullable JSONArray array) {
        List<WeightEntry> list = new ArrayList<>();
        for (int i = 0; array != null && i < array.length(); i++) {
            JSONObject json = array.optJSONObject(i);
            if (json == null) {
                continue;
            }
            WeightEntry entry = new WeightEntry();
            entry.id = json.optLong("id");
            entry.weight = json.optDouble("weight", 0);
            entry.recordedOn = optText(json, "recorded_on");
            list.add(entry);
        }
        return list;
    }

    // ---------- Volume ----------

    public static VolumeSummary volumeFromApi(JSONObject json) {
        VolumeSummary v = new VolumeSummary();
        v.days = json.optInt("days");
        v.totalVolume = json.optDouble("total_volume", 0);
        v.workouts = json.optInt("workouts");
        v.sets = json.optInt("sets");
        v.reps = json.optInt("reps");
        v.thisWeek = json.optDouble("this_week", 0);
        v.lastWeek = json.optDouble("last_week", 0);
        JSONArray daily = json.optJSONArray("daily");
        for (int i = 0; daily != null && i < daily.length(); i++) {
            JSONObject d = daily.optJSONObject(i);
            VolumeSummary.Point p = new VolumeSummary.Point();
            p.date = optText(d, "date");
            p.volume = d.optDouble("volume", 0);
            v.daily.add(p);
        }
        JSONArray weekly = json.optJSONArray("weekly");
        for (int i = 0; weekly != null && i < weekly.length(); i++) {
            JSONObject w = weekly.optJSONObject(i);
            VolumeSummary.Point p = new VolumeSummary.Point();
            p.date = optText(w, "week_start");
            p.volume = w.optDouble("volume", 0);
            p.workouts = w.optInt("workouts");
            v.weekly.add(p);
        }
        JSONArray exercises = json.optJSONArray("by_exercise");
        for (int i = 0; exercises != null && i < exercises.length(); i++) {
            JSONObject e = exercises.optJSONObject(i);
            VolumeSummary.ExerciseStats s = new VolumeSummary.ExerciseStats();
            s.name = optText(e, "name");
            s.bodyPart = optText(e, "body_part");
            s.volume = e.optDouble("volume", 0);
            s.sets = e.optInt("sets");
            s.reps = e.optInt("reps");
            s.bestWeight = e.optDouble("best_weight", 0);
            s.bestSetReps = e.optInt("best_set_reps");
            s.estimatedOneRepMax = e.optDouble("estimated_1rm", 0);
            v.byExercise.add(s);
        }
        JSONArray parts = json.optJSONArray("by_body_part");
        for (int i = 0; parts != null && i < parts.length(); i++) {
            JSONObject p = parts.optJSONObject(i);
            VolumeSummary.PartStats s = new VolumeSummary.PartStats();
            s.bodyPart = optText(p, "body_part");
            s.volume = p.optDouble("volume", 0);
            s.sets = p.optInt("sets");
            v.byBodyPart.add(s);
        }
        return v;
    }

    // ---------- Helpers ----------

    static String optText(@Nullable JSONObject json, String key) {
        if (json == null || !json.has(key) || json.isNull(key)) {
            return "";
        }
        return json.optString(key, "");
    }

    @Nullable
    static Double optDouble(JSONObject json, String key) {
        if (!json.has(key) || json.isNull(key)) {
            return null;
        }
        double value = json.optDouble(key);
        return Double.isNaN(value) ? null : value;
    }

    static List<String> strings(@Nullable JSONArray array) {
        List<String> list = new ArrayList<>();
        for (int i = 0; array != null && i < array.length(); i++) {
            String value = array.optString(i, "").trim();
            if (!value.isEmpty()) {
                list.add(value);
            }
        }
        return list;
    }

    private static String truncate(String text, int max) {
        String value = text == null ? "" : text;
        return value.length() > max ? value.substring(0, max) : value;
    }

    /** ISO-8601 instants like 2026-10-27T18:30:00.000Z or 2026-10-27T18:30:00 (UTC). */
    static long parseInstant(String text) {
        if (text == null || text.length() < 19) {
            return 0;
        }
        String base = text.substring(0, 19);
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            format.setTimeZone(TimeZone.getTimeZone("UTC"));
            long millis = format.parse(base).getTime();
            int offsetAt = text.indexOf('+', 19) > 0 ? text.indexOf('+', 19) : text.indexOf('-', 19);
            if (offsetAt > 0 && text.length() >= offsetAt + 6) {
                int sign = text.charAt(offsetAt) == '-' ? -1 : 1;
                int hours = Integer.parseInt(text.substring(offsetAt + 1, offsetAt + 3));
                int minutes = Integer.parseInt(text.substring(offsetAt + 4, offsetAt + 6));
                millis -= sign * (hours * 60L + minutes) * 60_000L;
            }
            return millis;
        } catch (ParseException | NumberFormatException error) {
            return 0;
        }
    }
}
