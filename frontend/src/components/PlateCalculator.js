import React, { useState } from "react";
import "./PlateCalculator.css";

// plate options and how they look on the bar (lb)
const PLATE_OPTIONS_LB = [2.5, 5, 10, 25, 35, 45];
const PLATE_STYLES_LB = {
  2.5: { color: "#888", width: 9, height: 26 },
  5: { color: "#6a1b9a", width: 11, height: 32 },
  10: { color: "#fff", width: 14, height: 40, border: "1px solid #ccc" },
  25: { color: "#2e7d32", width: 17, height: 48 },
  35: { color: "#f9a825", width: 20, height: 56 },
  45: { color: "#1565c0", width: 23, height: 66 },
};

// kg
const PLATE_OPTIONS_KG = [2.5, 5, 10, 15, 20, 25];
const PLATE_STYLES_KG = {
  2.5: { color: "#e0e0e0", width: 9, height: 26, border: "1px solid #bbb" },
  5: { color: "#fff", width: 11, height: 32, border: "1px solid #ccc" },
  10: { color: "#2e7d32", width: 14, height: 40 },
  15: { color: "#f9a825", width: 16, height: 44 },
  20: { color: "#1565c0", width: 18, height: 50 },
  25: { color: "#c62828", width: 20, height: 58 },
};

const BAR_LB = 45;
const BAR_KG = 20;
const BAR_WIDTH_PX = 160;
const MAX_BARBELL_WIDTH_PX = 440;

function PlateCalculator({ isDark = false }) {
  const [unit, setUnit] = useState("lb"); // lb or kg
  // what plates we have. total counts all, bar only shows what fits
  const [platesPerSide, setPlatesPerSide] = useState([]);

  const plateOptions = unit === "lb" ? PLATE_OPTIONS_LB : PLATE_OPTIONS_KG;
  const plateStyles = unit === "lb" ? PLATE_STYLES_LB : PLATE_STYLES_KG;
  const barWeight = unit === "lb" ? BAR_LB : BAR_KG;
  const unitLabel = unit === "lb" ? "lb" : "kg";

  // big plates first
  const sortedPlates = [...platesPerSide].sort((a, b) => b - a);

  // only the plates that fit on the bar (rest still count in total)
  const maxPlatesWidthPerSide = (MAX_BARBELL_WIDTH_PX - BAR_WIDTH_PX) / 2;
  const displayedPlatesPerSide = (() => {
    let w = 0; // width we've used so far
    const out = [];
    for (const weight of sortedPlates) {
      if (w + plateStyles[weight].width <= maxPlatesWidthPerSide) {
        out.push(weight);
        w += plateStyles[weight].width;
      } else break; // doesn't fit, stop
    }
    return out;
  })();

  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
    setPlatesPerSide([]); // clear when switching unit
  };

  const addPlate = (weight) => {
    setPlatesPerSide((prev) => [...prev, weight].sort((a, b) => b - a));
  };

  const removePlate = (weight) => {
    setPlatesPerSide((prev) => {
      const i = prev.indexOf(weight);
      if (i === -1) return prev; // nothing to remove
      const next = [...prev];
      next.splice(i, 1); // take one out
      return next;
    });
  };

  // count of this weight (for the number between - and +)
  const countForWeight = (weight) =>
    platesPerSide.filter((w) => w === weight).length;

  // sum per side. total = bar + 2*this
  const totalPerSide = platesPerSide.reduce((s, w) => s + w, 0);

  // light colored plates need dark text (lb: 10,35; kg: 2.5,5)
  const isLightPlate = (weight) => {
    if (unit === "lb") return weight === 10 || weight === 35;
    return weight === 2.5 || weight === 5;
  };

  return (
    <div className={`plate-calculator ${isDark ? "plate-calculator--dark" : ""}`}>
      <h2 className="plate-calculator-title">Plate Calculator</h2>
      <div className="plate-calculator-body">
        <div className="plate-calculator-unit-toggle">
          <button
            type="button"
            className={`plate-calculator-unit-btn ${unit === "lb" ? "plate-calculator-unit-btn--active" : ""}`}
            onClick={() => handleUnitChange("lb")}
          >
            lb
          </button>
          <button
            type="button"
            className={`plate-calculator-unit-btn ${unit === "kg" ? "plate-calculator-unit-btn--active" : ""}`}
            onClick={() => handleUnitChange("kg")}
          >
            kg
          </button>
        </div>

        <div className="plate-calculator-barbell">
          <div className="plate-calculator-side plate-calculator-side--left">
            {displayedPlatesPerSide.map((weight, i) => (
              <div
                key={`left-${i}-${weight}`}
                className="plate-calculator-plate-segment"
                style={{
                  width: plateStyles[weight].width + "px",
                  height: plateStyles[weight].height + "px",
                  backgroundColor: plateStyles[weight].color,
                  border: plateStyles[weight].border || "none",
                }}
              />
            ))}
          </div>
          <div className="plate-calculator-bar" />
          <div className="plate-calculator-side plate-calculator-side--right">
            {displayedPlatesPerSide.map((weight, i) => (
              <div
                key={`right-${i}-${weight}`}
                className="plate-calculator-plate-segment"
                style={{
                  width: plateStyles[weight].width + "px",
                  height: plateStyles[weight].height + "px",
                  backgroundColor: plateStyles[weight].color,
                  border: plateStyles[weight].border || "none",
                }}
              />
            ))}
          </div>
        </div>

        <div className="plate-calculator-rows">
          {plateOptions.map((weight) => {
            const style = plateStyles[weight];
            const count = countForWeight(weight);
            const isLight = isLightPlate(weight);
            return (
              <div
                key={weight}
                className="plate-calculator-row"
                style={{
                  backgroundColor: style.color,
                  border: style.border || "none",
                  color: isLight ? "#333" : "#fff",
                }}
              >
                <span className="plate-calculator-row-label">{weight} {unitLabel}</span>
                <button
                  type="button"
                  className="plate-calculator-row-btn"
                  onClick={() => removePlate(weight)}
                  disabled={count === 0}
                  aria-label={`Remove ${weight} ${unitLabel}`}
                >
                  −
                </button>
                {count > 0 && (
                  <span className="plate-calculator-row-count">{count}</span>
                )}
                <button
                  type="button"
                  className="plate-calculator-row-btn"
                  onClick={() => addPlate(weight)}
                  aria-label={`Add ${weight} ${unitLabel}`}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>

        {/* when bar is full but they added more */}
        {displayedPlatesPerSide.length < sortedPlates.length && (
          <p className="plate-calculator-too-strong" role="status">
            Wow our barbell cannot keep up with your plates...you're so strong!
          </p>
        )}

        <button
          type="button"
          className="plate-calculator-remove-all"
          onClick={() => setPlatesPerSide([])}
          disabled={platesPerSide.length === 0}
          aria-label="Remove all plates"
        >
          Remove all
        </button>

        {/* total = bar weight + both sides */}
        <p className="plate-calculator-total">
          Per side: <strong>{totalPerSide} {unitLabel}</strong>
          {totalPerSide > 0 && (
            <span className="plate-calculator-total-bar"> · Total: {barWeight + totalPerSide * 2} {unitLabel}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default PlateCalculator;
