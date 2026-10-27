/**
 * FITTMM Frontend – sign-in helpers
 * TC-F10  Password rule: 8+ characters with a letter and a number
 * TC-F11  Strength meter scores
 * TC-F12  Phone numbers normalize to E.164 and format for display
 * TC-F13  Firebase error codes become plain messages; cancelled pop-ups stay quiet
 */
import {
  AuthMessageError,
  authErrorMessage,
  formatPhone,
  normalizePhone,
  passwordProblem,
  passwordStrength,
} from "./authService";

test("TC-F10: password rule", () => {
  expect(passwordProblem("short1")).toBe("Use at least 8 characters.");
  expect(passwordProblem("onlyletters")).toBe("Include at least one letter and one number.");
  expect(passwordProblem("12345678")).toBe("Include at least one letter and one number.");
  expect(passwordProblem("password123")).toBeNull();
});

test("TC-F11: strength meter", () => {
  expect(passwordStrength("")).toBe(0);
  expect(passwordStrength("abcdefgh")).toBe(1);
  expect(passwordStrength("abcdefghijkl")).toBe(2);
  expect(passwordStrength("Abcdefghijkl")).toBe(3);
  expect(passwordStrength("Abcdefghijk1!")).toBe(4);
});

test("TC-F12: phone numbers", () => {
  expect(normalizePhone("(650) 555-3434")).toBe("+16505553434");
  expect(normalizePhone("1 650 555 3434")).toBe("+16505553434");
  expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  expect(normalizePhone("555-3434")).toBeNull();
  expect(normalizePhone("")).toBeNull();
  expect(formatPhone("+16505553434")).toBe("+1 650-555-3434");
  expect(formatPhone("+442079460958")).toBe("+442079460958");
});

test("TC-F13: error messages", () => {
  expect(authErrorMessage({ code: "auth/invalid-credential" })).toBe("Incorrect email or password.");
  expect(authErrorMessage({ code: "auth/email-already-in-use" })).toMatch(/already uses this email/);
  expect(authErrorMessage({ code: "auth/popup-closed-by-user" })).toBeNull();
  expect(authErrorMessage({ code: "auth/account-exists-with-different-credential" })).toMatch(/connect this method in Settings/);
  expect(authErrorMessage(new AuthMessageError("Custom words."))).toBe("Custom words.");
  expect(authErrorMessage({ code: "auth/something-new", message: "Raw" })).toBe("Raw");
});
