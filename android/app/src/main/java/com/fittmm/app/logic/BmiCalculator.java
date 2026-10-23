package com.fittmm.app.logic;

public final class BmiCalculator {
    private BmiCalculator() {}

    public static double calculate(double weightKg, double heightMeters) {
        if (weightKg <= 0) {
            throw new IllegalArgumentException("Weight must be greater than 0.");
        }
        if (heightMeters <= 0) {
            throw new IllegalArgumentException("Height must be greater than 0.");
        }
        double bmi = weightKg / (heightMeters * heightMeters);
        return Math.round(bmi * 100.0) / 100.0;
    }

    public static String category(double bmi) {
        if (bmi < 18.5) {
            return "Underweight";
        }
        if (bmi < 25) {
            return "Normal";
        }
        if (bmi < 30) {
            return "Overweight";
        }
        return "Obese";
    }
}
