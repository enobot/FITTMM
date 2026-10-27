/**
 * FITTMM Frontend – units
 * TC-F20  Weight converts between lb (stored) and kg (shown)
 * TC-F21  Height converts between inches (stored), ft/in and cm
 * TC-F22  Age from a birthday, before and after this year's birthday
 */
import {
  ageFrom,
  formatHeight,
  formatVolume,
  formatWeight,
  heightParts,
  heightToIn,
  weightFromLb,
  weightToLb,
} from "./units";

test("TC-F20: weight", () => {
  expect(weightFromLb(150, "imperial")).toBe(150);
  expect(weightFromLb(150, "metric")).toBe(68);
  expect(weightToLb("68", "metric")).toBe(149.9);
  expect(weightToLb("", "metric")).toBeNull();
  expect(formatWeight(150, "metric")).toBe("68 kg");
  expect(formatWeight(null, "imperial")).toBe("—");
  expect(formatVolume(2204.62, "metric")).toBe("1,000");
});

test("TC-F21: height", () => {
  expect(heightParts(66)).toEqual({ feet: 5, inches: 6 });
  expect(heightToIn({ feet: "5", inches: "6" }, "imperial")).toBe(66);
  expect(heightToIn({ cm: "168" }, "metric")).toBe(66.1);
  expect(heightToIn({ feet: "", inches: "" }, "imperial")).toBeNull();
  expect(formatHeight(66, "imperial")).toBe("5 ft 6 in");
  expect(formatHeight(66, "metric")).toBe("168 cm");
});

test("TC-F22: age", () => {
  const today = new Date(2026, 9, 27); // Oct 27, 2026
  expect(ageFrom("1999-04-12", today)).toBe(27);
  expect(ageFrom("1999-12-01", today)).toBe(26);
  expect(ageFrom("2000-10-27", today)).toBe(26);
  expect(ageFrom("", today)).toBeNull();
});
