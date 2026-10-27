package com.fittmm.app.data;

import androidx.annotation.Nullable;

/** The signed-in user's profile. Weight is in pounds and height in inches, as the API stores them. */
public class UserProfile {
    public String fname = "";
    public String lname = "";
    public String email = "";
    public String dateOfBirth = "";
    public String gender = "";
    public double weight;
    public double height;

    @Nullable public Integer age;
    @Nullable public Double previousWeight;
    @Nullable public Double goalWeight;
    public String unitSystem = "imperial";
    @Nullable public Double bmi;
    public String bmiCategory = "";
    public boolean profileComplete;

    public boolean metric() {
        return "metric".equals(unitSystem);
    }
}
