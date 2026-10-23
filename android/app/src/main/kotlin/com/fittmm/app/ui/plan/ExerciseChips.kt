package com.fittmm.app.ui.plan

import android.content.res.ColorStateList
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.R
import com.fittmm.app.ui.dp
import com.google.android.material.button.MaterialButton

fun AppCompatActivity.choiceChip(label: String, selected: Boolean, onClick: () -> Unit): MaterialButton {
    val button = MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle)
    button.text = label
    button.isAllCaps = false
    val params = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    )
    params.marginEnd = dp(8)
    button.layoutParams = params
    if (selected) {
        button.backgroundTintList = ColorStateList.valueOf(getColor(R.color.primary))
        button.setTextColor(getColor(R.color.onPrimary))
    }
    button.setOnClickListener { onClick() }
    return button
}
