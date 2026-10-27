package com.fittmm.app.ui.auth

import android.content.Context
import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.UserProfile
import com.fittmm.app.ui.home.HomeActivity
import com.fittmm.app.ui.settings.SettingsActivity
import org.json.JSONObject

/**
 * Sign-up details wait here until the email is verified, because the API
 * only accepts verified accounts. Same idea as the website's pending profile.
 */
object PendingProfile {
    private const val PREFS = "fittmm_pending_profile"

    fun save(context: Context, email: String, changes: JSONObject) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("email", email.lowercase())
            .putString("changes", changes.toString())
            .apply()
    }

    fun take(context: Context, email: String): JSONObject? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getString("email", "").equals(email, ignoreCase = true)) return null
        return prefs.getString("changes", null)?.let { runCatching { JSONObject(it) }.getOrNull() }
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }
}

/**
 * Where to go after any successful sign-in: verify the email first, then
 * finish the profile if it's incomplete, otherwise home.
 */
fun AppCompatActivity.routeAfterSignIn(repo: FittmmRepository, onError: (String) -> Unit = {}) {
    if (repo.needsEmailVerification()) {
        openClearingTask(VerifyEmailActivity::class.java)
        return
    }
    val pending = PendingProfile.take(this, repo.currentEmail())
    val callback = object : FittmmRepository.ValueCallback<UserProfile> {
        override fun onSuccess(value: UserProfile?) {
            if (isDestroyed) return
            if (pending != null) PendingProfile.clear(this@routeAfterSignIn)
            if (value != null && !value.profileComplete) {
                startActivity(Intent(this@routeAfterSignIn, HomeActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
                startActivity(Intent(this@routeAfterSignIn, SettingsActivity::class.java)
                    .putExtra(SettingsActivity.WELCOME, true))
                finish()
            } else {
                openClearingTask(HomeActivity::class.java)
            }
        }

        override fun onError(message: String) {
            if (isDestroyed) return
            // The profile can be finished later; don't block sign-in on it
            onError(message)
            openClearingTask(HomeActivity::class.java)
        }
    }
    if (pending != null) repo.updateProfile(pending, callback) else repo.loadProfile(callback)
}

fun AppCompatActivity.openClearingTask(target: Class<*>) {
    startActivity(Intent(this, target).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    })
    finish()
}
