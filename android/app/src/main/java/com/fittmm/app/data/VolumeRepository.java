package com.fittmm.app.data;

import androidx.annotation.Nullable;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Training volume totals from /workout/volume, computed on the server. */
public final class VolumeRepository {
    private final ApiClient api;

    public VolumeRepository(ApiClient api) {
        this.api = api;
    }

    public void loadVolume(int days, FittmmRepository.ValueCallback<VolumeSummary> callback) {
        Date now = new Date();
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now);
        // Same sign convention as JavaScript's getTimezoneOffset (minutes behind UTC)
        int offset = -TimeZone.getDefault().getOffset(now.getTime()) / 60000;
        api.get("/workout/volume?days=" + days + "&today=" + today + "&tz_offset=" + offset, new ApiClient.Callback() {
            @Override
            public void onSuccess(@Nullable Object value) {
                callback.onSuccess(value instanceof JSONObject ? ApiJson.volumeFromApi((JSONObject) value) : null);
            }

            @Override
            public void onError(String message, int status) {
                callback.onError(message);
            }
        });
    }
}
