package com.fittmm.app.data;

import java.util.ArrayList;
import java.util.List;

/** Training volume (reps x weight, in pounds) over a range of days, from /workout/volume. */
public class VolumeSummary {
    public int days;
    public double totalVolume;
    public int workouts;
    public int sets;
    public int reps;
    public double thisWeek;
    public double lastWeek;
    public List<Point> daily = new ArrayList<>();
    public List<Point> weekly = new ArrayList<>();
    public List<ExerciseStats> byExercise = new ArrayList<>();
    public List<PartStats> byBodyPart = new ArrayList<>();

    /** A day (daily) or the Sunday a week starts on (weekly). */
    public static class Point {
        public String date = "";
        public double volume;
        public int workouts;
    }

    public static class ExerciseStats {
        public String name = "";
        public String bodyPart = "";
        public double volume;
        public int sets;
        public int reps;
        public double bestWeight;
        public int bestSetReps;
        public double estimatedOneRepMax;
    }

    public static class PartStats {
        public String bodyPart = "";
        public double volume;
        public int sets;
    }
}
