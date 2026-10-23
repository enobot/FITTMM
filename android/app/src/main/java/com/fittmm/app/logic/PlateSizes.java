package com.fittmm.app.logic;

import android.graphics.Color;

/** How each plate is drawn: width, height, and color. */
public final class PlateSizes {
    private PlateSizes() {}

    public static int widthOf(boolean pounds, double weight) {
        if (pounds) {
            if (PlateMath.same(weight, 45)) return 23;
            if (PlateMath.same(weight, 35)) return 20;
            if (PlateMath.same(weight, 25)) return 17;
            if (PlateMath.same(weight, 10)) return 14;
            if (PlateMath.same(weight, 5)) return 11;
            return 9;
        }
        if (PlateMath.same(weight, 25)) return 20;
        if (PlateMath.same(weight, 20)) return 18;
        if (PlateMath.same(weight, 15)) return 16;
        if (PlateMath.same(weight, 10)) return 14;
        if (PlateMath.same(weight, 5)) return 11;
        return 9;
    }

    public static int heightOf(boolean pounds, double weight) {
        if (pounds) {
            if (PlateMath.same(weight, 45)) return 66;
            if (PlateMath.same(weight, 35)) return 56;
            if (PlateMath.same(weight, 25)) return 48;
            if (PlateMath.same(weight, 10)) return 40;
            if (PlateMath.same(weight, 5)) return 32;
            return 26;
        }
        if (PlateMath.same(weight, 25)) return 58;
        if (PlateMath.same(weight, 20)) return 50;
        if (PlateMath.same(weight, 15)) return 44;
        if (PlateMath.same(weight, 10)) return 40;
        if (PlateMath.same(weight, 5)) return 32;
        return 26;
    }

    public static int colorOf(boolean pounds, double weight) {
        if (pounds) {
            if (PlateMath.same(weight, 45)) return Color.parseColor("#1565C0");
            if (PlateMath.same(weight, 35)) return Color.parseColor("#F9A825");
            if (PlateMath.same(weight, 25)) return Color.parseColor("#2E7D32");
            if (PlateMath.same(weight, 10)) return Color.parseColor("#FFFFFF");
            if (PlateMath.same(weight, 5)) return Color.parseColor("#6A1B9A");
            return Color.parseColor("#888888");
        }
        if (PlateMath.same(weight, 25)) return Color.parseColor("#C62828");
        if (PlateMath.same(weight, 20)) return Color.parseColor("#1565C0");
        if (PlateMath.same(weight, 15)) return Color.parseColor("#F9A825");
        if (PlateMath.same(weight, 10)) return Color.parseColor("#2E7D32");
        if (PlateMath.same(weight, 5)) return Color.parseColor("#FFFFFF");
        return Color.parseColor("#E0E0E0");
    }

    public static boolean lightPlate(boolean pounds, double weight) {
        if (pounds) {
            return PlateMath.same(weight, 10) || PlateMath.same(weight, 35);
        }
        return PlateMath.same(weight, 2.5) || PlateMath.same(weight, 5);
    }
}
