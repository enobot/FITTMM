import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./MonthlyCalendar.css";

function MonthlyCalendar({ isDark = false }) {
  const [value, setValue] = useState(new Date());

  return (
    <div className={`monthly-calendar ${isDark ? "monthly-calendar--dark" : ""}`}>
      <h2 className="monthly-calendar-title">Monthly Calendar</h2>
      <div className="monthly-calendar-body">
        <Calendar
          onChange={setValue}
          value={value}
          className="monthly-calendar-widget"
        />
      </div>
    </div>
  );
}

export default MonthlyCalendar;
