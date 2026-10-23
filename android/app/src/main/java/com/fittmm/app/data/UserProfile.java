package com.fittmm.app.data;

import com.google.firebase.firestore.DocumentSnapshot;

import java.util.HashMap;
import java.util.Map;

public class UserProfile {
    public String fname = "";
    public String lname = "";
    public String email = "";
    public String dateOfBirth = "";
    public String gender = "";
    public double weight;
    public double height;

    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("fname", fname);
        map.put("lname", lname);
        map.put("email", email);
        map.put("dateOfBirth", dateOfBirth);
        map.put("gender", gender == null ? "" : gender);
        map.put("weight", weight);
        map.put("height", height);
        return map;
    }

    public static UserProfile from(DocumentSnapshot snap) {
        if (snap == null || !snap.exists()) {
            return null;
        }
        UserProfile profile = new UserProfile();
        profile.fname = text(snap.getString("fname"));
        profile.lname = text(snap.getString("lname"));
        profile.email = text(snap.getString("email"));
        profile.dateOfBirth = text(snap.getString("dateOfBirth"));
        profile.gender = text(snap.getString("gender"));
        profile.weight = Numbers.asDouble(snap.get("weight"), 0);
        profile.height = Numbers.asDouble(snap.get("height"), 0);
        return profile;
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }
}
