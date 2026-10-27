import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import TopNav from "../components/TopNav";
import { getProfile, getVolume } from "../api/accountApi";
import { formatVolume, formatWeight, weightUnit } from "../utils/units";
import { useTheme } from "../theme";
import { bodyPartLabel } from "./ExerciseLibrary";
import "./Volume.css";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

function readVars(names) {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
}

function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, unit, labelFor }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="vol-tip">
      <strong>{labelFor(row)}</strong>
      <span>
        {formatVolume(row.volume, row.unitSystem)} {unit}
        {row.workouts != null ? `, ${row.workouts} ${row.workouts === 1 ? "workout" : "workouts"}` : ""}
      </span>
    </div>
  );
}

function VolumeBars({ data, xKey, xFormat, unit, labelFor, colors, unitSystem, height = 240 }) {
  const rows = data.map((d) => ({ ...d, unitSystem }));
  return (
    <div className="vol-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke={colors.rule} strokeDasharray="0" />
          <XAxis
            dataKey={xKey}
            tickFormatter={xFormat}
            tick={{ fill: colors["ink-soft"], fontSize: 12 }}
            axisLine={{ stroke: colors.rule }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(v) => formatVolume(v, unitSystem)}
            tick={{ fill: colors["ink-soft"], fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: colors.concrete }}
            content={<ChartTooltip unit={unit} labelFor={labelFor} />}
          />
          <Bar dataKey="volume" fill={colors.action} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Volume() {
  const { theme } = useTheme();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [unitSystem, setUnitSystem] = useState("imperial");
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    getProfile().then((p) => setUnitSystem(p.unit_system || "imperial")).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError("");
    getVolume(days)
      .then((v) => !cancelled && setData(v))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [days]);

  // Recharts draws SVG attributes, so resolve the theme's colors here
  const colors = useMemo(
    () => readVars(["action", "rule", "ink-soft", "concrete"]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme]
  );

  const unit = weightUnit(unitSystem);
  const weekly = data?.weekly || [];
  const maxPart = Math.max(1, ...(data?.by_body_part || []).map((p) => p.volume));
  const thisWeek = data?.this_week || 0;
  const lastWeek = data?.last_week || 0;
  const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  return (
    <div className="page">
      <TopNav />
      <main className="vol">
        <header className="vol-head">
          <div>
            <h1 className="f-display vol-title">Volume</h1>
            <p className="vol-sub">
              Volume is reps × weight, added up across every set. Bodyweight sets count toward sets and
              reps but add no weight.
            </p>
          </div>
          <div className="vol-range" role="radiogroup" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                role="radio"
                aria-checked={days === r.days}
                className="vol-range-btn"
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <p className="f-alert" role="alert">
            {error}
          </p>
        ) : null}

        {!data && !error ? <p role="status">Adding up your sets…</p> : null}

        {data ? (
          <>
            <section className="vol-stats" aria-label="Totals">
              <div className="vol-stat vol-stat--hero">
                <span className="vol-stat-label">Total volume, last {RANGES.find((r) => r.days === days)?.label}</span>
                <span className="vol-stat-num f-num">
                  {formatVolume(data.total_volume, unitSystem)}
                  <span className="vol-stat-unit">{unit}</span>
                </span>
              </div>
              <div className="vol-stat">
                <span className="vol-stat-label">This week</span>
                <span className="vol-stat-num f-num">{formatVolume(thisWeek, unitSystem)}</span>
                <span className="vol-stat-note">
                  {change == null
                    ? lastWeek === 0 && thisWeek > 0
                      ? "Nothing logged last week"
                      : " "
                    : `${change >= 0 ? "Up" : "Down"} ${Math.abs(change)}% from ${formatVolume(lastWeek, unitSystem)}`}
                </span>
              </div>
              <div className="vol-stat">
                <span className="vol-stat-label">Workouts</span>
                <span className="vol-stat-num f-num">{data.workouts}</span>
              </div>
              <div className="vol-stat">
                <span className="vol-stat-label">Sets</span>
                <span className="vol-stat-num f-num">{data.sets.toLocaleString("en-US")}</span>
              </div>
              <div className="vol-stat">
                <span className="vol-stat-label">Reps</span>
                <span className="vol-stat-num f-num">{data.reps.toLocaleString("en-US")}</span>
              </div>
            </section>

            {data.workouts === 0 ? (
              <section className="vol-empty">
                <p>No sets logged in this range yet.</p>
                <Link to="/recordWorkout" className="f-btn f-btn--primary">
                  Record a workout
                </Link>
              </section>
            ) : (
              <>
                <div className="vol-grid">
                  <section className="vol-panel" aria-labelledby="vol-weekly">
                    <h2 id="vol-weekly" className="vol-h2">
                      Volume per week ({unit})
                    </h2>
                    <VolumeBars
                      data={weekly}
                      xKey="week_start"
                      xFormat={shortDate}
                      unit={unit}
                      unitSystem={unitSystem}
                      colors={colors}
                      labelFor={(row) => `Week of ${shortDate(row.week_start)}`}
                    />
                  </section>
                  <section className="vol-panel" aria-labelledby="vol-daily">
                    <h2 id="vol-daily" className="vol-h2">
                      Volume per day ({unit})
                    </h2>
                    <VolumeBars
                      data={data.daily}
                      xKey="date"
                      xFormat={shortDate}
                      unit={unit}
                      unitSystem={unitSystem}
                      colors={colors}
                      labelFor={(row) => shortDate(row.date)}
                    />
                  </section>
                </div>

                <button type="button" className="f-link vol-table-toggle" onClick={() => setShowTable((s) => !s)}>
                  {showTable ? "Hide weekly numbers" : "Show weekly numbers as a table"}
                </button>
                {showTable ? (
                  <table className="vol-table vol-table--weeks">
                    <caption className="f-visually-hidden">Volume per week</caption>
                    <thead>
                      <tr>
                        <th scope="col">Week of</th>
                        <th scope="col">Workouts</th>
                        <th scope="col">Volume ({unit})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekly.map((w) => (
                        <tr key={w.week_start}>
                          <td>{shortDate(w.week_start)}</td>
                          <td>{w.workouts}</td>
                          <td>{formatVolume(w.volume, unitSystem)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                <div className="vol-grid vol-grid--lower">
                  <section className="vol-panel" aria-labelledby="vol-parts">
                    <h2 id="vol-parts" className="vol-h2">
                      By body part
                    </h2>
                    <ul className="vol-parts">
                      {data.by_body_part.map((p) => (
                        <li key={p.body_part}>
                          <span className="vol-part-name">
                            {p.body_part === "other" ? "Other / custom" : bodyPartLabel(p.body_part)}
                          </span>
                          <span className="vol-part-track" aria-hidden="true">
                            <span className="vol-part-fill" style={{ width: `${(p.volume / maxPart) * 100}%` }} />
                          </span>
                          <span className="vol-part-value">
                            {formatVolume(p.volume, unitSystem)} {unit}
                            <span className="vol-part-sets">
                              , {p.sets} {p.sets === 1 ? "set" : "sets"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="vol-panel vol-panel--table" aria-labelledby="vol-ex">
                    <h2 id="vol-ex" className="vol-h2">
                      By exercise
                    </h2>
                    <div className="vol-table-wrap">
                      <table className="vol-table">
                        <thead>
                          <tr>
                            <th scope="col">Exercise</th>
                            <th scope="col">Sets</th>
                            <th scope="col">Volume</th>
                            <th scope="col">Best set</th>
                            <th scope="col">
                              <abbr title="Estimated one-rep max (Epley formula)">Est. 1RM</abbr>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.by_exercise.map((e) => (
                            <tr key={e.name}>
                              <th scope="row">{e.name}</th>
                              <td>{e.sets}</td>
                              <td>{formatVolume(e.volume, unitSystem)}</td>
                              <td>
                                {e.best_weight > 0
                                  ? `${formatWeight(e.best_weight, unitSystem)} × ${e.best_set_reps}`
                                  : `${e.best_set_reps} reps`}
                              </td>
                              <td>{e.estimated_1rm > 0 ? formatWeight(e.estimated_1rm, unitSystem) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default Volume;
