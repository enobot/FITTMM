package com.fittmm.app.data;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/** Logged workouts for the signed-in user, shared with the website. */
public final class SessionRepository {
    private final ApiClient api;

    public SessionRepository(ApiClient api) {
        this.api = api;
    }

    public void saveSession(WorkoutSession session, FittmmRepository.Done callback) {
        Date now = new Date(session.loggedAt > 0 ? session.loggedAt : System.currentTimeMillis());
        SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        iso.setTimeZone(TimeZone.getTimeZone("UTC"));
        // The user's own calendar day, so volume lands on the right day
        String localDate = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now);
        JSONObject body;
        try {
            body = new JSONObject().put("payload", ApiJson.sessionToPayload(session, localDate, iso.format(now)));
        } catch (JSONException error) {
            callback.onError("Couldn't save the workout.");
            return;
        }
        api.send("POST", "/workout/sessions", body, new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess();
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }

    public void loadSessions(FittmmRepository.ValueCallback<List<WorkoutSession>> callback) {
        api.get("/workout/sessions", new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                List<WorkoutSession> sessions = new ArrayList<>();
                JSONArray rows = value instanceof JSONArray ? (JSONArray) value : new JSONArray();
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row != null) {
                        sessions.add(ApiJson.sessionFromApi(row));
                    }
                }
                callback.onSuccess(sessions);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }
}
