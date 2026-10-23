package com.fittmm.app.ui.home

import android.widget.GridLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.R
import com.fittmm.app.data.Week
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.ui.dp

fun AppCompatActivity.fillWeekGrid(
    grid: GridLayout,
    plan: WorkoutPlan?,
    selectedDay: String,
    onDay: (String) -> Unit,
    onEdit: () -> Unit
) {
    grid.removeAllViews()
    val hasAny = plan?.hasSelections() == true
    for (day in Week.DAYS) {
        val names = plan?.days?.get(day) ?: emptyList()
        val body = when {
            !hasAny -> ""
            names.isEmpty() -> "REST"
            else -> names.take(4).joinToString("\n") + if (names.size > 4) "\n+${names.size - 4}" else ""
        }
        val title = day.take(3) + if (day == Week.today()) " •" else ""
        addDayCard(grid, title, body, day == selectedDay) { onDay(day) }
    }
    addDayCard(grid, "Edit", "Workouts", false, onEdit)
}

private fun AppCompatActivity.addDayCard(
    grid: GridLayout,
    title: String,
    body: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val card = layoutInflater.inflate(R.layout.item_day, grid, false)
    card.findViewById<TextView>(R.id.dayTitle).text = title
    card.findViewById<TextView>(R.id.dayBody).text = body
    card.setBackgroundResource(if (selected) R.drawable.bg_card_selected else R.drawable.bg_card)
    card.setOnClickListener { onClick() }
    val column = GridLayout.spec(GridLayout.UNDEFINED, 1, 1f)
    val row = GridLayout.spec(GridLayout.UNDEFINED)
    val params = GridLayout.LayoutParams(row, column)
    params.width = 0
    params.height = GridLayout.LayoutParams.WRAP_CONTENT
    params.setMargins(dp(4), dp(4), dp(4), dp(4))
    grid.addView(card, params)
}
