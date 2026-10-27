import React from "react";
import "./PlateStack.css";

// Competition bumper plates, heaviest first. Full-size plates share one
// diameter and differ in thickness; change plates are smaller.
export const PLATE_ORDER = [
  { kg: 25, color: "var(--plate-red)" },
  { kg: 20, color: "var(--plate-blue)" },
  { kg: 15, color: "var(--plate-yellow)" },
  { kg: 10, color: "var(--plate-green)" },
  { kg: 5, color: "var(--plate-white)" },
];

const BRAND_PLATES = [
  { key: "25", color: "var(--plate-red)", thickness: 30, height: 190 },
  { key: "15", color: "var(--plate-yellow)", thickness: 24, height: 190 },
  { key: "10", color: "var(--plate-green)", thickness: 18, height: 190 },
  { key: "5", color: "var(--plate-white)", thickness: 14, height: 120 },
  { key: "2.5", color: "var(--plate-black)", thickness: 10, height: 96 },
];

/**
 * plates: [{ key, color, thickness, height, label, title }]
 * Drawn from the collar outward along a barbell sleeve.
 */
function PlateStack({ plates = BRAND_PLATES, decorative = false, className = "", title, minWidth = 220 }) {
  const H = 220;
  const mid = H / 2;
  const gap = 3;
  const collarX = 34;
  const totalWidth = plates.reduce((sum, p) => sum + p.thickness + gap, 0);
  const W = Math.max(collarX + totalWidth + 60, minWidth);
  let x = collarX + 14;

  return (
    <svg
      className={`plate-stack ${className}`}
      viewBox={`0 0 ${W} ${H + (plates.some((p) => p.label) ? 26 : 0)}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      preserveAspectRatio="xMinYMid meet"
    >
      {/* sleeve and collar */}
      <rect className="plate-stack-sleeve" x="0" y={mid - 9} width={W - 8} height="18" rx="3" />
      <rect className="plate-stack-collar" x={collarX} y={mid - 22} width="10" height="44" rx="2" />
      {plates.map((p) => {
        const px = x;
        x += p.thickness + gap;
        return (
          <g key={p.key}>
            {p.title ? <title>{p.title}</title> : null}
            <rect
              className="plate-stack-plate"
              x={px}
              y={mid - p.height / 2}
              width={p.thickness}
              height={p.height}
              rx={Math.min(6, p.thickness / 3)}
              style={{ fill: p.color }}
            />
            <rect
              className="plate-stack-hub"
              x={px + p.thickness * 0.2}
              y={mid - 14}
              width={p.thickness * 0.6}
              height="28"
              rx="2"
            />
            {p.label ? (
              <text className="plate-stack-label" x={px + p.thickness / 2} y={H + 18} textAnchor="middle">
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export default PlateStack;
