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
import CreateWorkout from "./components/CreateWorkout";
import CreateAPlan from "./components/CreateAPlan";

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/homepage", element: <Homepage /> },
  { path: "/signup", element: <Signup /> },
  { path: "/workout/new", element: <CreateWorkout /> },
  { path: "/plan/new", element: <CreateAPlan /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;