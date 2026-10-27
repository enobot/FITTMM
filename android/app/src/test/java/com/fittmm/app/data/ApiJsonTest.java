package com.fittmm.app.data;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * FITTMM Android – API conversions
 * TC-A01  A plan from the API lands on the right weekdays
 * TC-A02  A plan is sent with exercise IDs and day numbers
 * TC-A03  A workout is sent the website's way (one row per set) with its volume
 * TC-A04  A website workout reads back as grouped entries
 * TC-A05  Library exercises, profile, weight history and volume parse
 * TC-A06  Video results parse, including the no-key fallback
 * TC-A07  API error details become readable messages
 */
public class ApiJsonTest {

    @Test
    public void planFromApi_mapsDaysAndSkipsBadRows() throws Exception {
        JSONObject json = new JSONObject("{\"name\":\"Legs\",\"description\":\"\",\"workouts\":[{\"workout_exercises\":["
                + "{\"day_of_week\":2,\"name\":\"Squats\"},"
                + "{\"day_of_week\":2,\"name\":\"Hip Thrusts\"},"
                + "{\"day_of_week\":2,\"name\":\"Squats\"},"
                + "{\"day_of_week\":9,\"name\":\"Nope\"},"
                + "{\"day_of_week\":4,\"name\":null}]}]}");
        WorkoutPlan plan = ApiJson.planFromApi(json);
        assertEquals("Legs", plan.name);
        assertEquals(Arrays.asList("Squats", "Hip Thrusts"), plan.days.get("Tuesday"));
        assertTrue(plan.days.get("Thursday").isEmpty());
        assertEquals(7, plan.days.size());
    }

    @Test
    public void planToApi_usesIdsAndDayNumbers() throws Exception {
        WorkoutPlan plan = new WorkoutPlan();
        plan.name = "  ";
        plan.days.put("Monday", Arrays.asList("Squats", "Mystery"));
        plan.days.put("Friday", Arrays.asList("hip thrusts"));
        Map<String, Long> ids = new HashMap<>();
        ids.put("squats", 11L);
        ids.put("hip thrusts", 12L);
        JSONObject body = ApiJson.planToApi(plan, ids);
        assertEquals("My plan", body.getString("name"));
        JSONArray rows = body.getJSONArray("workouts").getJSONObject(0).getJSONArray("workout_exercises");
        assertEquals(2, rows.length()); // "Mystery" has no ID and is left out
        assertEquals(11L, rows.getJSONObject(0).getLong("exerciseid"));
        assertEquals(1, rows.getJSONObject(0).getInt("day_of_week"));
        assertEquals(5, rows.getJSONObject(1).getInt("day_of_week"));
    }

    @Test
    public void sessionToPayload_expandsSetsAndAddsVolume() throws Exception {
        WorkoutSession session = new WorkoutSession();
        session.day = "Tuesday";
        session.entries.add(entry("Squats", 2, 5, 185, 4));
        session.entries.add(entry("Squats", 1, 3, 205, 4));
        session.entries.add(entry("Pushups", 1, 20, 0, 0));
        JSONObject payload = ApiJson.sessionToPayload(session, "2026-10-27", "2026-10-28T03:00:00.000Z");
        assertEquals("2026-10-27", payload.getString("local_date"));
        JSONArray exercises = payload.getJSONArray("exercises");
        assertEquals(2, exercises.length());
        JSONArray squatSets = exercises.getJSONObject(0).getJSONArray("sets");
        assertEquals(3, squatSets.length());
        assertEquals(3, squatSets.getJSONObject(2).getInt("set"));
        assertEquals(205.0, squatSets.getJSONObject(2).getDouble("weightLbs"), 0.001);
        assertEquals(2465.0, payload.getDouble("totalVolume"), 0.001); // 925 * 2 + 615
    }

    @Test
    public void sessionFromApi_groupsMatchingSets() throws Exception {
        JSONObject row = new JSONObject("{\"id\":7,\"logged_at\":\"2026-10-27T18:00:00\",\"payload\":{"
                + "\"day\":\"Tuesday\",\"date\":\"2026-10-28T03:30:00.000Z\",\"exercises\":[{\"name\":\"Squats\",\"rating\":4,\"sets\":["
                + "{\"set\":1,\"reps\":5,\"weightLbs\":185},{\"set\":2,\"reps\":5,\"weightLbs\":185},{\"set\":3,\"reps\":3,\"weight\":205}]}]}}");
        WorkoutSession session = ApiJson.sessionFromApi(row);
        assertEquals("7", session.id);
        assertEquals("Tuesday", session.day);
        assertEquals(2, session.entries.size());
        assertEquals(2, session.entries.get(0).sets);
        assertEquals(205.0, session.entries.get(1).weightLbs, 0.001);
        assertEquals(4, session.entries.get(1).rating);
        assertEquals(1793158200000L, session.loggedAt); // 2026-10-28T03:30:00Z
    }

    @Test
    public void exerciseProfileWeightsAndVolumeParse() throws Exception {
        Exercise ex = ApiJson.exerciseFromApi(new JSONObject("{\"id\":54,\"name\":\"Barbell Hip Thrust\",\"description\":\"\","
                + "\"image\":\"https://cdn/x/0.jpg\",\"body_part\":\"glutes\",\"userid\":null,\"equipment\":\"barbell\","
                + "\"images\":[\"https://cdn/x/0.jpg\",\"https://cdn/x/1.jpg\"],\"primary_muscles\":[\"glutes\"]}"));
        assertEquals(54L, ex.apiId());
        assertFalse(ex.custom);
        assertEquals(2, ex.images.size());
        assertTrue(ApiJson.exerciseFromApi(new JSONObject("{\"id\":9,\"name\":\"Mine\",\"userid\":3}")).custom);

        UserProfile p = ApiJson.profileFromApi(new JSONObject("{\"email\":\"a@b.co\",\"fname\":\"Ana\",\"lname\":\"\","
                + "\"date_of_birth\":null,\"age\":null,\"weight\":150,\"height\":66,\"previous_weight\":153.5,"
                + "\"goal_weight\":null,\"unit_system\":\"metric\",\"bmi\":24.2,\"bmi_category\":\"Healthy weight\","
                + "\"profile_complete\":false}"));
        assertNull(p.age);
        assertEquals(153.5, p.previousWeight, 0.001);
        assertNull(p.goalWeight);
        assertTrue(p.metric());
        assertEquals("", p.dateOfBirth);

        assertEquals("2026-10-13", ApiJson.weightsFromApi(
                new JSONArray("[{\"id\":2,\"weight\":153.5,\"recorded_on\":\"2026-10-13\"}]")).get(0).recordedOn);

        VolumeSummary v = ApiJson.volumeFromApi(new JSONObject("{\"days\":7,\"total_volume\":5180,\"workouts\":1,"
                + "\"sets\":4,\"reps\":28,\"this_week\":5180,\"last_week\":0,"
                + "\"daily\":[{\"date\":\"2026-10-27\",\"volume\":5180}],"
                + "\"weekly\":[{\"week_start\":\"2026-10-25\",\"volume\":5180,\"workouts\":1}],"
                + "\"by_exercise\":[{\"name\":\"Squats\",\"body_part\":\"legs\",\"volume\":1850,\"sets\":2,\"reps\":10,"
                + "\"best_weight\":185,\"best_set_reps\":5,\"estimated_1rm\":215.8}],"
                + "\"by_body_part\":[{\"body_part\":\"legs\",\"volume\":2930,\"sets\":3}]}"));
        assertEquals(5180.0, v.totalVolume, 0.001);
        assertEquals(1, v.weekly.get(0).workouts);
        assertEquals(215.8, v.byExercise.get(0).estimatedOneRepMax, 0.001);
        assertEquals("legs", v.byBodyPart.get(0).bodyPart);
    }

    @Test
    public void videoResultsParse() throws Exception {
        ExerciseDetail.VideoSearch none = ApiJson.videosFromApi(new JSONObject(
                "{\"configured\":false,\"query\":\"q\",\"videos\":[],\"search_url\":\"https://www.youtube.com/results?search_query=q\",\"error\":null}"));
        assertFalse(none.configured);
        assertEquals("", none.error);
        assertTrue(none.searchUrl.startsWith("https://www.youtube.com/"));

        ExerciseDetail.VideoSearch some = ApiJson.videosFromApi(new JSONObject("{\"configured\":true,\"query\":\"q\","
                + "\"videos\":[{\"video_id\":\"abc\",\"title\":\"T\",\"channel\":\"C\",\"thumbnail\":\"u\","
                + "\"duration_seconds\":495,\"view_count\":null}],\"search_url\":\"s\"}"));
        assertEquals(495, some.videos.get(0).durationSeconds);
        assertEquals(-1, some.videos.get(0).viewCount);
        assertEquals("https://www.youtube.com/watch?v=abc", some.videos.get(0).watchUrl());
    }

    @Test
    public void errorDetailsBecomeMessages() throws Exception {
        assertEquals("Please verify your email address before continuing.", ApiClient.errorMessage(
                new JSONObject("{\"detail\":\"Please verify your email address before continuing.\"}"), 403));
        assertEquals("Birthday can't be in the future", ApiClient.errorMessage(
                new JSONObject("{\"detail\":[{\"msg\":\"Value error, Birthday can't be in the future\"}]}"), 422));
        assertEquals("Something went wrong (500). Try again.", ApiClient.errorMessage(null, 500));
    }

    private static SessionEntry entry(String name, int sets, int reps, double weight, int rating) {
        SessionEntry e = new SessionEntry();
        e.name = name;
        e.sets = sets;
        e.reps = reps;
        e.weightLbs = weight;
        e.rating = rating;
        return e;
    }
}
