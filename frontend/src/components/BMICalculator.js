import React, { useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function BMICalculator() {
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [bmi, setBmi] = useState(null);

    const calculateBMI = async () => {
        const response = await fetch(`${API_BASE_URL}/api/calculate-bmi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                weight: parseFloat(weight),
                height: parseFloat(height),
            }),
        });

        const data = await response.json();
        setBmi(data.bmi);
    };

    return (
        <div>
            <h2>BMI Calculator</h2>
            <input
                type="number"
                placeholder="Weight (kg)"
                onChange={(e) => setWeight(e.target.value)}
            />
            <input
                type="number"
                placeholder="Height (meters)"
                onChange={(e) => setHeight(e.target.value)}
            />
            <button onClick={calculateBMI}>Calculate</button>
            {bmi && <p>Your BMI: {bmi}</p>}
        </div>
    );
}

export default BMICalculator;
