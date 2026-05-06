import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./MyProgress.css";

const CHART_COLORS = ["#2f64c8", "#e67e22", "#8e939a", "#22a06b"];
const RANGE_OPTIONS = [
  { id: "10", days: 10 },
  { id: "30", days: 30 },
  { id: "90", days: 90 },
];

const toMidnight = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function getRangeLabel(days) {
  const end = toMidnight(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function normalizeLogs(rawLogs) {
  if (!Array.isArray(rawLogs)) return [];
  const rows = [];

  rawLogs.forEach((entry) => {
    const baseDate = entry?.date ? new Date(entry.date) : new Date();
    if (Number.isNaN(baseDate.getTime())) return;
    const date = toMidnight(baseDate);

    if (Array.isArray(entry?.exercises)) {
      entry.exercises.forEach((exercise) => {
        const category = exercise?.name || exercise?.exercise || "Workout";
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        const volume = sets.reduce((sum, setRow) => {
          const reps = Number(setRow?.reps);
          const weight = Number(setRow?.weight ?? setRow?.weightLbs);
          if (Number.isNaN(reps) || Number.isNaN(weight)) return sum;
          return sum + reps * weight;
        }, 0);
        if (volume > 0) rows.push({ date, category, volume });
      });
      return;
    }

    if (Array.isArray(entry?.sets)) {
      const category = entry?.exercise || entry?.name || "Workout";
      const volume = entry.sets.reduce((sum, setRow) => {
        const reps = Number(setRow?.reps);
        const weight = Number(setRow?.weight ?? setRow?.weightLbs);
        if (Number.isNaN(reps) || Number.isNaN(weight)) return sum;
        return sum + reps * weight;
      }, 0);
      if (volume > 0) rows.push({ date, category, volume });
      return;
    }

    if (entry?.byExercise && typeof entry.byExercise === "object") {
      Object.entries(entry.byExercise).forEach(([category, value]) => {
        const volume = Number(value);
        if (!Number.isNaN(volume) && volume > 0) {
          rows.push({ date, category, volume });
        }
      });
      return;
    }

    const fallbackVolume = Number(entry?.totalVolume);
    if (!Number.isNaN(fallbackVolume) && fallbackVolume > 0) {
      rows.push({
        date,
        category: entry?.exercise || entry?.name || "Workout",
        volume: fallbackVolume,
      });
    }
  });

  return rows;
}

function MyProgress({ sessions = [], sessionsLoading = false }) {
  const [selectedRangeId, setSelectedRangeId] = useState(RANGE_OPTIONS[0].id);

  const normalizedRows = useMemo(() => {
    if (!sessions?.length) return [];
    const entries = sessions.map((s) => {
      const p = s.payload && typeof s.payload === "object" ? s.payload : {};
      return {
        ...p,
        date: p.date || s.logged_at,
      };
    });
    return normalizeLogs(entries);
  }, [sessions]);

  const selectedRange = RANGE_OPTIONS.find((item) => item.id === selectedRangeId) || RANGE_OPTIONS[0];

  const chartModel = useMemo(() => {
    const end = toMidnight(new Date());
    const start = new Date(end);
    start.setDate(end.getDate() - (selectedRange.days - 1));

    const filtered = normalizedRows.filter((row) => row.date >= start && row.date <= end);
    if (filtered.length === 0) {
      return { hasData: false, datasets: [], chartRows: [], maxVolume: 0 };
    }

    const totalsByCategory = filtered.reduce((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + row.volume;
      return acc;
    }, {});

    const activeCategories = Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    const dateLabels = [];
    const dateKeyToLabel = {};
    for (let i = 0; i < selectedRange.days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateLabels.push(key);
      dateKeyToLabel[key] = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
    }

    const byCategoryDate = {};
    filtered.forEach((row) => {
      if (!activeCategories.includes(row.category)) return;
      const key = row.date.toISOString().slice(0, 10);
      byCategoryDate[row.category] = byCategoryDate[row.category] || {};
      byCategoryDate[row.category][key] = (byCategoryDate[row.category][key] || 0) + row.volume;
    });

    const datasets = activeCategories.map((category, idx) => ({
      name: category,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      values: dateLabels.map((key) => byCategoryDate[category]?.[key] || 0),
    }));

    const maxVolume = Math.max(
      1,
      ...datasets.flatMap((dataset) => dataset.values),
      ...Object.values(totalsByCategory)
    );
    const roundedMax = Math.ceil(maxVolume / 200) * 200;
    const chartRows = dateLabels.map((key) => {
      const row = { label: dateKeyToLabel[key] };
      datasets.forEach((dataset) => {
        row[dataset.name] = byCategoryDate[dataset.name]?.[key] || 0;
      });
      return row;
    });

    return {
      hasData: true,
      datasets,
      chartRows,
      maxVolume: roundedMax,
    };
  }, [normalizedRows, selectedRange.days]);

  const formatVolume = (value) => new Intl.NumberFormat("en-US").format(value);

  return (
    <div className="my-progress-card">
      <header className="my-progress-header">
        <h2 className="homepage-section-title">My Progress</h2>
        <select
          className="my-progress-range"
          value={selectedRangeId}
          onChange={(e) => setSelectedRangeId(e.target.value)}
          aria-label="Select date range for progress chart"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {getRangeLabel(option.days)}
            </option>
          ))}
        </select>
      </header>

      <div className="my-progress-chart-wrap">
        {sessionsLoading ? (
          <p className="my-progress-empty">Loading progress…</p>
        ) : !chartModel.hasData ? (
          <p className="my-progress-empty">No progress data available.</p>
        ) : (
          <div className="my-progress-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartModel.chartRows} margin={{ top: 8, right: 16, bottom: 8, left: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4dde7" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 11 }}
                  domain={[0, chartModel.maxVolume]}
                  tickFormatter={formatVolume}
                />
                <Tooltip
                  formatter={(value, name) => [formatVolume(Number(value)), name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "8px" }} />
                {chartModel.datasets.map((dataset) => (
                  <Line
                    key={dataset.name}
                    type="monotone"
                    dataKey={dataset.name}
                    stroke={dataset.color}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyProgress;
