package com.fittmm.app.logic;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Plate math from the web plate calculator. Width budget matches the on-screen bar. */
public final class PlateMath {
    public static final double[] POUNDS = {45, 35, 25, 10, 5, 2.5};
    public static final double[] KILOS = {25, 20, 15, 10, 5, 2.5};
    public static final String OVERFLOW =
            "Wow our barbell cannot keep up with your plates... you're so strong!";

    private static final int SIDE_BUDGET = 140;

    private PlateMath() {}

    public static boolean same(double left, double right) {
        return Math.abs(left - right) < 0.001;
    }

    public static double bar(boolean pounds) {
        return pounds ? 45 : 20;
    }

    public static double perSide(List<Double> plates) {
        double sum = 0;
        for (double plate : plates) {
            sum += plate;
        }
        return sum;
    }

    public static double total(List<Double> plates, boolean pounds) {
        return bar(pounds) + perSide(plates) * 2;
    }

    public static int count(List<Double> plates, double weight) {
        int count = 0;
        for (double plate : plates) {
            if (same(plate, weight)) {
                count++;
            }
        }
        return count;
    }

    public static List<Double> visible(List<Double> plates, boolean pounds) {
        List<Double> sorted = new ArrayList<>(plates);
        Collections.sort(sorted, (left, right) -> Double.compare(right, left));
        List<Double> shown = new ArrayList<>();
        int used = 0;
        for (double weight : sorted) {
            int width = widthOf(pounds, weight);
            if (used + width <= SIDE_BUDGET) {
                shown.add(weight);
                used += width;
            } else {
                break;
            }
        }
        return shown;
    }

    public static boolean overflow(List<Double> plates, boolean pounds) {
        return visible(plates, pounds).size() < plates.size();
    }

    public static int widthOf(boolean pounds, double weight) {
        return PlateSizes.widthOf(pounds, weight);
    }

    public static int heightOf(boolean pounds, double weight) {
        return PlateSizes.heightOf(pounds, weight);
    }

    public static int colorOf(boolean pounds, double weight) {
        return PlateSizes.colorOf(pounds, weight);
    }

    public static boolean lightPlate(boolean pounds, double weight) {
        return PlateSizes.lightPlate(pounds, weight);
    }
}
