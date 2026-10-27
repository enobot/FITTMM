package com.fittmm.app.logic;

import androidx.annotation.Nullable;

import java.util.Calendar;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Sign-up and profile rules, the same ones the website uses. */
public final class AccountRules {
    private AccountRules() {}

    /** Null when the password is acceptable. */
    @Nullable
    public static String passwordProblem(@Nullable String password) {
        if (password == null || password.length() < 8) {
            return "Use at least 8 characters.";
        }
        boolean letter = false;
        boolean digit = false;
        for (char c : password.toCharArray()) {
            letter |= Character.isLetter(c) && c < 128;
            digit |= Character.isDigit(c);
        }
        return letter && digit ? null : "Include at least one letter and one number.";
    }

    /** E.164 phone number, or null. US numbers may leave off the +1. */
    @Nullable
    public static String normalizePhone(@Nullable String raw) {
        String text = raw == null ? "" : raw.trim();
        String digits = text.replaceAll("\\D", "");
        if (text.startsWith("+")) {
            return digits.length() >= 8 && digits.length() <= 15 ? "+" + digits : null;
        }
        if (digits.length() == 10) {
            return "+1" + digits;
        }
        if (digits.length() == 11 && digits.startsWith("1")) {
            return "+" + digits;
        }
        return null;
    }

    /** "+16505553434" becomes "+1 650-555-3434"; other countries stay as they are. */
    public static String formatPhone(@Nullable String e164) {
        if (e164 == null) {
            return "";
        }
        Matcher m = Pattern.compile("^\\+1(\\d{3})(\\d{3})(\\d{4})$").matcher(e164);
        return m.matches() ? "+1 " + m.group(1) + "-" + m.group(2) + "-" + m.group(3) : e164;
    }

    /** Age in whole years on the given day, from a yyyy-MM-dd birthday; null if unreadable. */
    @Nullable
    public static Integer ageOn(@Nullable String birthday, Calendar today) {
        if (birthday == null) {
            return null;
        }
        String[] parts = birthday.trim().split("-");
        if (parts.length != 3) {
            return null;
        }
        try {
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int day = Integer.parseInt(parts[2]);
            int age = today.get(Calendar.YEAR) - year;
            int thisMonth = today.get(Calendar.MONTH) + 1;
            if (thisMonth < month || (thisMonth == month && today.get(Calendar.DAY_OF_MONTH) < day)) {
                age -= 1;
            }
            return age;
        } catch (NumberFormatException error) {
            return null;
        }
    }

    public static final int MINIMUM_AGE = 13;
}
