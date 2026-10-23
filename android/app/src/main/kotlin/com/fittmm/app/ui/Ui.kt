package com.fittmm.app.ui

import android.content.Intent
import android.graphics.Rect
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.doOnLayout
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.ui.auth.LoginActivity

fun TextView.showError(message: String?) {
    if (message.isNullOrBlank()) {
        text = ""
        visibility = View.GONE
    } else {
        text = message
        visibility = View.VISIBLE
    }
}

fun AppCompatActivity.dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
}

fun AppCompatActivity.requireSignedIn(repo: FittmmRepository): Boolean {
    if (repo.isSignedIn()) {
        return true
    }
    startActivity(Intent(this, LoginActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    })
    finish()
    return false
}

/** The on-screen Back label and the system back gesture share one path. */
fun AppCompatActivity.wireBack(button: View) {
    button.setOnClickListener { onBackPressedDispatcher.onBackPressed() }
    button.doOnLayout {
        ViewCompat.setSystemGestureExclusionRects(
            button,
            listOf(Rect(0, 0, button.width, button.height))
        )
    }
}
