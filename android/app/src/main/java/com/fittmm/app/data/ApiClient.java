package com.fittmm.app.data;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;

import com.fittmm.app.BuildConfig;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Calls the FITTMM API (the same one the website uses) with the signed-in
 * user's Firebase ID token. Network work runs off the main thread; callbacks
 * come back on it.
 */
public final class ApiClient {
    private static final ExecutorService IO = Executors.newFixedThreadPool(4);
    private static final int TIMEOUT_MS = 20000;

    private final FirebaseAccess access;

    /** Created on first use, so the static helpers below also work off-device in unit tests. */
    private static final class Main {
        static final Handler HANDLER = new Handler(Looper.getMainLooper());
    }

    public ApiClient(FirebaseAccess access) {
        this.access = access;
    }

    /** value is a JSONObject, a JSONArray, or null for an empty body. */
    public interface Callback {
        void onSuccess(@Nullable Object value);

        void onError(String message, int status);
    }

    public void get(String path, Callback callback) {
        request("GET", path, null, callback);
    }

    public void send(String method, String path, @Nullable JSONObject body, Callback callback) {
        request(method, path, body, callback);
    }

    private void request(String method, String path, @Nullable JSONObject body, Callback callback) {
        if (!access.isConfigured()) {
            callback.onError(FirebaseAccess.NOT_CONFIGURED, 0);
            return;
        }
        FirebaseUser user = access.auth.getCurrentUser();
        if (user == null) {
            callback.onError("You are not signed in.", 401);
            return;
        }
        // Cached until it nears expiry; Firebase refreshes it as needed
        user.getIdToken(false)
                .addOnSuccessListener(result -> IO.execute(() -> run(method, path, body, result.getToken(), callback)))
                .addOnFailureListener(error -> callback.onError(FirebaseAccess.message(error), 401));
    }

    private void run(String method, String path, @Nullable JSONObject body, String token, Callback callback) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(BuildConfig.API_BASE_URL + path).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Accept", "application/json");
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(bytes);
                }
            }
            int status = connection.getResponseCode();
            String text = readAll(status >= 400 ? connection.getErrorStream() : connection.getInputStream());
            Object parsed = parse(text);
            if (status >= 200 && status < 300) {
                Main.HANDLER.post(() -> callback.onSuccess(parsed));
            } else {
                String message = errorMessage(parsed, status);
                Main.HANDLER.post(() -> callback.onError(message, status));
            }
        } catch (IOException error) {
            Main.HANDLER.post(() -> callback.onError(
                    "Can't reach the FITTMM server. Check your connection and try again.", 0));
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private static String readAll(@Nullable InputStream in) throws IOException {
        if (in == null) {
            return "";
        }
        try (InputStream stream = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = stream.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toString("UTF-8");
        }
    }

    @Nullable
    static Object parse(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        try {
            return new JSONTokener(text).nextValue();
        } catch (JSONException error) {
            return null;
        }
    }

    /** FastAPI errors look like {"detail": "..."} or {"detail": [{"msg": "..."}]}. */
    static String errorMessage(@Nullable Object parsed, int status) {
        if (parsed instanceof JSONObject) {
            Object detail = ((JSONObject) parsed).opt("detail");
            if (detail instanceof String) {
                return (String) detail;
            }
            if (detail instanceof JSONArray) {
                StringBuilder text = new StringBuilder();
                JSONArray items = (JSONArray) detail;
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.optJSONObject(i);
                    String msg = item == null ? "" : item.optString("msg", "").replace("Value error, ", "");
                    if (!msg.isEmpty()) {
                        if (text.length() > 0) {
                            text.append(" ");
                        }
                        text.append(msg);
                    }
                }
                if (text.length() > 0) {
                    return text.toString();
                }
            }
        }
        return "Something went wrong (" + status + "). Try again.";
    }
}
