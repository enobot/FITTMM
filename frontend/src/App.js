// import BMICalculator from "./components/BMICalculator";
// import "./App.css";

// function App() {
//   return (
//     <div className="App">
//       <h1>FITTMM</h1>

//       <div className="calculator-section">
//         <BMICalculator />
//       </div>

//     </div>
//   );
// }

// export default App;

import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage";
import Signup from "./pages/Signup";
import CreateAPlan from "./components/CreateAPlan";
import ListOfExercises from "./components/ListOfExercises";
import DoubleCheck from "./components/DoubleCheck";
import DoneCreating from "./components/DoneCreating";
import RecordWorkout from "./components/RecordWorkout";

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/homepage", element: <Homepage /> },
  { path: "/recordWorkout", element: <RecordWorkout /> },
  { path: "/signup", element: <Signup /> },
  { path: "/plan/new", element: <CreateAPlan /> },
  { path: "/listOfExercises", element: <ListOfExercises /> },
  { path: "/doublecheck", element: <DoubleCheck /> },
  { path: "/doneCreating", element: <DoneCreating /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;