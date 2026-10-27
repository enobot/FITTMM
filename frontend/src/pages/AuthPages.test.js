/**
 * FITTMM Frontend – sign-up, log-in and reset screens
 * TC-F30  Sign-up offers Google and Apple alongside email
 * TC-F31  Sign-up refuses users under 13
 * TC-F32  Sign-up refuses a password without a number
 * TC-F33  Log-in explains when sign-in isn't configured instead of crashing
 * TC-F34  Reset by text rejects an incomplete phone number
 * TC-F35  Reset by email asks for an email address first
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

function fillSignup({ birthday = "2000-01-01", password = "password123" } = {}) {
  fireEvent.change(screen.getByPlaceholderText("First Name"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByPlaceholderText("Last Name"), { target: { value: "Lopez" } });
  fireEvent.change(screen.getByPlaceholderText("Birthday"), { target: { value: birthday } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: password } });
  fireEvent.change(screen.getByPlaceholderText("Re-enter password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
}

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

test("TC-F30: sign-up offers Google and Apple", () => {
  renderIn(<Signup />);
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue with Apple" })).toBeInTheDocument();
});

test("TC-F31: sign-up refuses users under 13", () => {
  renderIn(<Signup />);
  const year = new Date().getFullYear() - 10;
  fillSignup({ birthday: `${year}-01-01` });
  expect(screen.getByText("You need to be at least 13 to use FITTMM.")).toBeInTheDocument();
});

test("TC-F32: sign-up refuses a password without a number", () => {
  renderIn(<Signup />);
  fillSignup({ password: "onlyletters" });
  expect(screen.getByText("Include at least one letter and one number.")).toBeInTheDocument();
});

test("TC-F33: log-in without Firebase settings shows a clear message", async () => {
  renderIn(<Login />);
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText(/Sign-in isn't set up for this site yet/)).toBeInTheDocument();
});

test("TC-F34: reset by text rejects an incomplete phone number", () => {
  renderIn(<ForgotPassword />);
  fireEvent.click(screen.getByRole("tab", { name: "Text message" }));
  fireEvent.change(screen.getByLabelText("Recovery phone"), { target: { value: "555-3434" } });
  fireEvent.click(screen.getByRole("button", { name: "Text me a code" }));
  expect(screen.getByText("Enter a full phone number, like +1 555 123 4567.")).toBeInTheDocument();
});

test("TC-F35: reset by email asks for an address", () => {
  renderIn(<ForgotPassword />);
  fireEvent.click(screen.getByRole("button", { name: "Email me a reset link" }));
  expect(screen.getByText("Enter the email you signed up with.")).toBeInTheDocument();
});
