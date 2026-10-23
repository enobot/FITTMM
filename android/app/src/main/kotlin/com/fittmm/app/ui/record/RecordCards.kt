package com.fittmm.app.ui.record

import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import com.fittmm.app.R
import com.fittmm.app.ui.dp
import com.fittmm.app.logic.WeightUnits
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText

fun AppCompatActivity.renderRecordCards(
    container: LinearLayout,
    names: List<String>,
    drafts: MutableMap<String, RecordDraft>
) {
    container.removeAllViews()
    if (names.isEmpty()) {
        val empty = TextView(this)
        empty.text = "Rest day. Pick another day, or add exercises to this plan."
        empty.setTextColor(getColor(R.color.textSecondary))
        container.addView(empty)
        return
    }
    for (name in names) {
        container.addView(recordCard(container, name, drafts.getOrPut(name) { RecordDraft() }))
    }
}

private fun AppCompatActivity.recordCard(
    parent: LinearLayout,
    name: String,
    draft: RecordDraft
): android.view.View {
    val card = layoutInflater.inflate(R.layout.item_record_exercise, parent, false)
    card.findViewById<TextView>(R.id.recordName).text = name
    val sets = card.findViewById<TextInputEditText>(R.id.setsInput)
    val reps = card.findViewById<TextInputEditText>(R.id.repsInput)
    val weight = card.findViewById<TextInputEditText>(R.id.weightInput)
    val unit = card.findViewById<MaterialButton>(R.id.unitButton)
    sets.setText(draft.sets)
    reps.setText(draft.reps)
    weight.setText(draft.weight)
    unit.text = draft.unit
    sets.doAfterTextChanged { draft.sets = it?.toString().orEmpty() }
    reps.doAfterTextChanged { draft.reps = it?.toString().orEmpty() }
    weight.doAfterTextChanged { draft.weight = it?.toString().orEmpty() }
    unit.setOnClickListener {
        val next = if (draft.unit == "lbs") "kg" else "lbs"
        val current = draft.weight.toDoubleOrNull()
        if (current != null) {
            val converted = if (next == "kg") {
                WeightUnits.poundsToKg(current)
            } else {
                WeightUnits.kgToPounds(current)
            }
            weight.setText(WeightUnits.format(converted))
        }
        draft.unit = next
        unit.text = next
    }
    val stars = card.findViewById<LinearLayout>(R.id.starRow)
    val starViews = mutableListOf<TextView>()
    for (value in 1..5) {
        val star = TextView(this)
        star.text = "★"
        star.textSize = 22f
        star.setPadding(dp(6), 0, dp(6), 0)
        star.setOnClickListener {
            draft.rating = if (draft.rating == value) 0 else value
            paintStars(starViews, draft.rating)
        }
        starViews.add(star)
        stars.addView(star)
    }
    paintStars(starViews, draft.rating)
    return card
}

private fun AppCompatActivity.paintStars(views: List<TextView>, rating: Int) {
    views.forEachIndexed { index, view ->
        view.setTextColor(getColor(if (index < rating) R.color.accent else R.color.textSecondary))
    }
}
