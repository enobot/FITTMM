package com.fittmm.app.data;

import com.fittmm.app.logic.WeightUnits;

public class SessionEntry {
    public String name = "";
    public int sets;
    public int reps;
    public double weightLbs;
    public int rating;

    public String line() {
        StringBuilder text = new StringBuilder();
        text.append(name)
                .append(" · ")
                .append(sets)
                .append(" x ")
                .append(reps)
                .append(" · ")
                .append(WeightUnits.format(weightLbs))
                .append(" lb");
        if (rating > 0) {
            text.append(" · ").append(rating).append("/5");
        }
        return text.toString();
    }
}
