import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import AuthAction from "./pages/AuthAction";
import Welcome from "./pages/Welcome";
import Settings from "./pages/Settings";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import ExerciseDetail from "./pages/ExerciseDetail";
import Volume from "./pages/Volume";
import CreateAPlan from "./components/CreateAPlan";
import ListOfExercises from "./components/ListOfExercises";
import DoubleCheck from "./components/DoubleCheck";
import DoneCreating from "./components/DoneCreating";
import RecordWorkout from "./components/RecordWorkout";
import { AuthProvider, RequireAuth } from "./auth/AuthContext";

const signedIn = (element) => <RequireAuth>{element}</RequireAuth>;

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/verify-email", element: <VerifyEmail /> },
  { path: "/auth/action", element: <AuthAction /> },
  { path: "/welcome", element: signedIn(<Welcome />) },
  { path: "/homepage", element: signedIn(<Homepage />) },
  { path: "/settings", element: signedIn(<Settings />) },
  { path: "/exercises", element: signedIn(<ExerciseLibrary />) },
  { path: "/exercises/:id", element: signedIn(<ExerciseDetail />) },
  { path: "/volume", element: signedIn(<Volume />) },
  { path: "/recordWorkout", element: signedIn(<RecordWorkout />) },
  { path: "/plan/new", element: signedIn(<CreateAPlan />) },
  { path: "/listOfExercises", element: signedIn(<ListOfExercises />) },
  { path: "/doublecheck", element: signedIn(<DoubleCheck />) },
  { path: "/doneCreating", element: signedIn(<DoneCreating />) },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
