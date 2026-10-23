package com.fittmm.app.logic;

public final class WeightUnits {
    private static final double LBS_PER_KG = 2.2046226218;

    private WeightUnits() {}

    public static double poundsToKg(double pounds) {
        return pounds / LBS_PER_KG;
    }

    public static double kgToPounds(double kilograms) {
        return kilograms * LBS_PER_KG;
    }

    public static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    public static String format(double value) {
        double rounded = round1(value);
        if (Math.abs(rounded - Math.rint(rounded)) < 0.001) {
            return String.valueOf((long) Math.rint(rounded));
        }
        return String.valueOf(rounded);
    }
}
