package com.fittmm.app.ui.tools

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.R
import com.fittmm.app.logic.PlateMath
import com.fittmm.app.logic.WeightUnits
import com.fittmm.app.ui.dp
import com.google.android.material.button.MaterialButton

fun AppCompatActivity.renderPlateBar(row: LinearLayout, plates: List<Double>, pounds: Boolean) {
    row.removeAllViews()
    val shown = PlateMath.visible(plates, pounds)
    val left = sideRow()
    val right = sideRow()
    for (weight in shown.reversed()) {
        left.addView(plateView(weight, pounds))
    }
    for (weight in shown) {
        right.addView(plateView(weight, pounds))
    }
    val bar = android.view.View(this)
    bar.setBackgroundResource(R.drawable.bg_bar)
    bar.layoutParams = LinearLayout.LayoutParams(dp(72), dp(14))
    row.addView(left)
    row.addView(bar)
    row.addView(right)
}

fun AppCompatActivity.renderPlateRows(
    container: LinearLayout,
    plates: MutableList<Double>,
    pounds: Boolean,
    onChange: () -> Unit
) {
    container.removeAllViews()
    val options = if (pounds) PlateMath.POUNDS else PlateMath.KILOS
    val unit = if (pounds) "lb" else "kg"
    for (weight in options) {
        val row = LinearLayout(this)
        row.orientation = LinearLayout.HORIZONTAL
        row.gravity = Gravity.CENTER_VERTICAL
        row.setPadding(0, dp(4), 0, dp(4))
        val label = TextView(this)
        label.text = "${WeightUnits.format(weight)} $unit"
        label.layoutParams = LinearLayout.LayoutParams(dp(84), LinearLayout.LayoutParams.WRAP_CONTENT)
        label.setTextColor(getColor(R.color.text))
        val minus = countButton("−")
        minus.setOnClickListener {
            val index = plates.indexOfFirst { PlateMath.same(it, weight) }
            if (index >= 0) {
                plates.removeAt(index)
                onChange()
            }
        }
        val count = TextView(this)
        count.text = PlateMath.count(plates, weight).toString()
        count.gravity = Gravity.CENTER
        count.layoutParams = LinearLayout.LayoutParams(dp(32), LinearLayout.LayoutParams.WRAP_CONTENT)
        count.setTextColor(getColor(R.color.text))
        val plus = countButton("+")
        plus.setOnClickListener {
            plates.add(weight)
            plates.sortWith { left, right -> right.compareTo(left) }
            onChange()
        }
        row.addView(label)
        row.addView(minus)
        row.addView(count)
        row.addView(plus)
        container.addView(row)
    }
}

private fun AppCompatActivity.sideRow(): LinearLayout {
    val row = LinearLayout(this)
    row.orientation = LinearLayout.HORIZONTAL
    row.gravity = Gravity.CENTER_VERTICAL
    return row
}

private fun AppCompatActivity.plateView(weight: Double, pounds: Boolean): TextView {
    val view = TextView(this)
    val width = dp(PlateMath.widthOf(pounds, weight).coerceAtLeast(16))
    val height = dp(PlateMath.heightOf(pounds, weight))
    val params = LinearLayout.LayoutParams(width, height)
    params.marginStart = dp(2)
    params.marginEnd = dp(2)
    view.layoutParams = params
    view.gravity = Gravity.CENTER
    view.text = WeightUnits.format(weight)
    view.textSize = 9f
    val light = PlateMath.lightPlate(pounds, weight)
    view.setTextColor(if (light) Color.BLACK else Color.WHITE)
    val shape = GradientDrawable()
    shape.cornerRadius = dp(4).toFloat()
    shape.setColor(PlateMath.colorOf(pounds, weight))
    if (light) {
        shape.setStroke(dp(1), Color.GRAY)
    }
    view.background = shape
    return view
}

private fun AppCompatActivity.countButton(label: String): MaterialButton {
    val button = MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle)
    button.text = label
    button.minWidth = dp(48)
    button.minHeight = dp(48)
    return button
}
