/** The API stores pounds and inches; these convert for display and input. */
export const LB_PER_KG = 2.20462262;
export const CM_PER_IN = 2.54;

const round1 = (n) => Math.round(n * 10) / 10;

export function weightFromLb(lb, unitSystem) {
  if (lb == null || Number.isNaN(Number(lb))) return null;
  return unitSystem === "metric" ? round1(lb / LB_PER_KG) : round1(Number(lb));
}

export function weightToLb(value, unitSystem) {
  const n = Number(value);
  if (value === "" || value == null || Number.isNaN(n)) return null;
  return unitSystem === "metric" ? round1(n * LB_PER_KG) : round1(n);
}

export function weightUnit(unitSystem) {
  return unitSystem === "metric" ? "kg" : "lb";
}

export function formatWeight(lb, unitSystem) {
  const v = weightFromLb(lb, unitSystem);
  return v == null ? "—" : `${v.toLocaleString("en-US")} ${weightUnit(unitSystem)}`;
}

/** Inches -> { feet, inches } (imperial) or centimeters (metric). */
export function heightParts(inches) {
  if (!inches) return { feet: "", inches: "" };
  const total = Math.round(Number(inches));
  return { feet: Math.floor(total / 12), inches: total % 12 };
}

export function heightToIn({ feet, inches, cm }, unitSystem) {
  if (unitSystem === "metric") {
    const n = Number(cm);
    return cm === "" || cm == null || Number.isNaN(n) ? null : round1(n / CM_PER_IN);
  }
  const f = Number(feet || 0);
  const i = Number(inches || 0);
  if ((feet === "" || feet == null) && (inches === "" || inches == null)) return null;
  if (Number.isNaN(f) || Number.isNaN(i)) return null;
  return f * 12 + i;
}

export function formatHeight(inches, unitSystem) {
  if (!inches) return "—";
  if (unitSystem === "metric") return `${Math.round(inches * CM_PER_IN)} cm`;
  const { feet, inches: rest } = heightParts(inches);
  return `${feet} ft ${rest} in`;
}

export function formatVolume(lb, unitSystem = "imperial") {
  const v = unitSystem === "metric" ? lb / LB_PER_KG : lb;
  return Math.round(v || 0).toLocaleString("en-US");
}

export function ageFrom(birthday, today = new Date()) {
  if (!birthday) return null;
  const [y, m, d] = String(birthday).split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}
