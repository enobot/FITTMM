package com.fittmm.app.data;

import java.util.ArrayList;
import java.util.List;

/** An exercise page: photos, steps, form pointers, muscles and tutorial videos. */
public class ExerciseDetail {
    public Exercise exercise;
    public String force = "";
    public String mechanic = "";
    public List<String> secondaryMuscles = new ArrayList<>();
    public List<String> instructions = new ArrayList<>();
    public List<String> tips = new ArrayList<>();
    public String videoQuery = "";

    public static class Video {
        public String videoId = "";
        public String title = "";
        public String channel = "";
        public String thumbnail = "";
        public int durationSeconds = -1;
        public long viewCount = -1;

        public String watchUrl() {
            return "https://www.youtube.com/watch?v=" + videoId;
        }
    }

    /** Results of a tutorial search. Without a server API key, only searchUrl is set. */
    public static class VideoSearch {
        public boolean configured;
        public String query = "";
        public List<Video> videos = new ArrayList<>();
        public String searchUrl = "";
        public String error = "";
    }
}
