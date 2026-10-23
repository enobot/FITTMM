package com.fittmm.app.data;

/** Reads numbers stored by Cloud Firestore, which may come back as Long or Double. */
public final class Numbers {
    private Numbers() {}

    public static double asDouble(Object value, double fallback) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return fallback;
    }

    public static int asInt(Object value, int fallback) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return fallback;
    }
}
