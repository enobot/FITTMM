/**
 * FITTMM Frontend – Signup Page Test Cases
 * ==========================================
 * TC-09  Submit with mismatched passwords --> inline error shown
 *
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "./Signup";

// Mock useNavigate so the component doesn't try to navigate during tests
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

// ---------------------------------------------------------------------------
// TC-09: Password mismatch validation
// ---------------------------------------------------------------------------
test("TC-09: shows an error message when the two password fields do not match", () => {
  /**
   * TC-09 | Signup: password mismatch
   * ───────────────────────────────────
   * Input:   Fill every required field with valid data, but set
   *          Password     = "password123"
   *          Re-enter     = "differentpassword"
   *          Then submit the form.
   * Expected: The error message "Passwords do not match." appears on screen.
   *           No network request is made (validation is client-side).
   */
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );

  // Fill in the required fields
  fireEvent.change(screen.getByPlaceholderText("First Name"), {
    target: { value: "John" },
  });
  fireEvent.change(screen.getByPlaceholderText("Last Name"), {
    target: { value: "Doe" },
  });
  fireEvent.change(screen.getByPlaceholderText("Birthday"), {
    target: { value: "2000-01-01" },
  });
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "john.doe@example.com" },
  });

  // Intentionally mismatched passwords
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
    target: { value: "differentpassword" },
  });

  fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

  // Error message
  expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
});
