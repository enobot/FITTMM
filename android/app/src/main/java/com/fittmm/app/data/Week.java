package com.fittmm.app.data;

import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.text.SimpleDateFormat;

public final class Week {
    public static final String[] DAYS = {
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
    };

    private Week() {}

    public static String today() {
        Calendar calendar = Calendar.getInstance();
        int index = calendar.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY;
        if (index < 0 || index >= DAYS.length) {
            return DAYS[0];
        }
        return DAYS[index];
    }

    public static String longDate() {
        return new SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.US).format(new Date());
    }

    public static int indexOf(String day) {
        for (int i = 0; i < DAYS.length; i++) {
            if (DAYS[i].equals(day)) {
                return i;
            }
        }
        return 0;
    }
}
