package com.fittmm.app

import android.app.Activity
import android.app.Application
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class FittmmApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val night = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(NIGHT, false)
        AppCompatDelegate.setDefaultNightMode(
            if (night) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        )
        connectLocalFirebaseIfNeeded()
        keepContentBelowSystemBars()
    }

    /** Target SDK 35 draws behind the status bar. Push each screen below it so Back can be tapped. */
    private fun keepContentBelowSystemBars() {
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityStarted(activity: Activity) {
                val content = activity.findViewById<View>(android.R.id.content) ?: return
                if (content.getTag(R.id.system_bars_applied) == true) {
                    return
                }
                content.setTag(R.id.system_bars_applied, true)
                ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
                    val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                    WindowInsetsCompat.Builder(insets)
                        .setInsets(WindowInsetsCompat.Type.systemBars(), androidx.core.graphics.Insets.NONE)
                        .build()
                }
                ViewCompat.requestApplyInsets(content)
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
            override fun onActivityResumed(activity: Activity) = Unit
            override fun onActivityPaused(activity: Activity) = Unit
            override fun onActivityStopped(activity: Activity) = Unit
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
            override fun onActivityDestroyed(activity: Activity) = Unit
        })
    }

    /**
     * A real google-services.json initializes Firebase on its own.
     * Until that file is added, talk to the local Firebase emulators.
     */
    private fun connectLocalFirebaseIfNeeded() {
        if (FirebaseApp.getApps(this).isNotEmpty()) {
            return
        }
        FirebaseApp.initializeApp(
            this,
            FirebaseOptions.Builder()
                .setProjectId("demo-fittmm")
                .setApplicationId("1:1234567890:android:fittmm")
                .setApiKey("demo-fittmm-key")
                .build()
        )
        val host = if (isEmulatorDevice()) "10.0.2.2" else "127.0.0.1"
        FirebaseAuth.getInstance().useEmulator(host, 9099)
        FirebaseFirestore.getInstance().useEmulator(host, 8080)
    }

    private fun isEmulatorDevice(): Boolean {
        val fingerprint = Build.FINGERPRINT
        val model = Build.MODEL
        val product = Build.PRODUCT
        return fingerprint.startsWith("generic")
            || fingerprint.contains("emulator", true)
            || model.contains("Emulator", true)
            || model.contains("Android SDK", true)
            || product.contains("sdk", true)
    }

    companion object {
        const val PREFS = "fittmm"
        const val NIGHT = "night"
    }
}
