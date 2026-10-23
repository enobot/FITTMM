package com.fittmm.app.ui.home

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.fittmm.app.FittmmApp
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.Nav
import com.fittmm.app.data.UserProfile
import com.fittmm.app.data.Week
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.databinding.ActivityHomeBinding
import com.fittmm.app.ui.auth.LoginActivity
import com.fittmm.app.ui.plan.ExerciseListActivity
import com.fittmm.app.ui.plan.PlanActivity
import com.fittmm.app.ui.progress.ProgressActivity
import com.fittmm.app.ui.record.RecordActivity
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.tools.BmiActivity
import com.fittmm.app.ui.tools.PlateActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class HomeActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHomeBinding
    private val repo = FittmmRepository()
    private var selectedDay = Week.today()
    private var currentPlan: WorkoutPlan? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        selectedDay = savedInstanceState?.getString(Nav.DAY) ?: Week.today()
        binding.dateText.text = Week.longDate()
        binding.createPlanButton.setOnClickListener {
            startActivity(Intent(this, PlanActivity::class.java))
        }
        binding.recordButton.setOnClickListener {
            startActivity(Intent(this, RecordActivity::class.java).putExtra(Nav.DAY, selectedDay))
        }
        binding.progressButton.setOnClickListener {
            startActivity(Intent(this, ProgressActivity::class.java))
        }
        binding.bmiButton.setOnClickListener {
            startActivity(Intent(this, BmiActivity::class.java))
        }
        binding.plateButton.setOnClickListener {
            startActivity(Intent(this, PlateActivity::class.java))
        }
        binding.themeButton.setOnClickListener { toggleTheme() }
        binding.wipeButton.setOnClickListener { confirmWipe() }
        binding.logoutButton.setOnClickListener { logout() }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(Nav.DAY, selectedDay)
    }

    override fun onResume() {
        super.onResume()
        if (!requireSignedIn(repo)) {
            return
        }
        refreshThemeLabel()
        load()
    }

    private fun load() {
        binding.todayBody.text = "Loading..."
        repo.loadProfile(object : FittmmRepository.ValueCallback<UserProfile> {
            override fun onSuccess(value: UserProfile?) {
                if (isDestroyed) return
                val name = value?.fname?.trim().orEmpty().ifEmpty {
                    repo.currentEmail().substringBefore("@").ifEmpty { "there" }
                }
                binding.greetingText.text = "Hi, $name!"
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.greetingText.text = "Hi!"
            }
        })
        repo.loadPlan(object : FittmmRepository.ValueCallback<WorkoutPlan> {
            override fun onSuccess(value: WorkoutPlan?) {
                if (isDestroyed) return
                currentPlan = value
                bindToday()
                bindWeek()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                currentPlan = null
                binding.todayBody.text = message
                bindWeek()
            }
        })
    }

    private fun bindToday() {
        val plan = currentPlan
        binding.todayTitle.text = selectedDay
        if (plan == null || !plan.hasSelections()) {
            binding.todayBody.text = "No plan yet. Create one to get started."
            return
        }
        val names = plan.days[selectedDay] ?: emptyList()
        binding.todayBody.text = if (names.isEmpty()) "Rest day" else names.joinToString("\n")
    }

    private fun bindWeek() {
        fillWeekGrid(
            binding.weekGrid,
            currentPlan,
            selectedDay,
            onDay = { day ->
                selectedDay = day
                bindToday()
                bindWeek()
            },
            onEdit = {
                startActivity(Intent(this, ExerciseListActivity::class.java).putExtra(Nav.EDIT, true))
            }
        )
    }

    private fun refreshThemeLabel() {
        val night = getSharedPreferences(FittmmApp.PREFS, MODE_PRIVATE).getBoolean(FittmmApp.NIGHT, false)
        binding.themeButton.text = if (night) "Light mode" else "Dark mode"
    }

    private fun toggleTheme() {
        val prefs = getSharedPreferences(FittmmApp.PREFS, MODE_PRIVATE)
        val night = prefs.getBoolean(FittmmApp.NIGHT, false)
        prefs.edit().putBoolean(FittmmApp.NIGHT, !night).apply()
        AppCompatDelegate.setDefaultNightMode(
            if (night) AppCompatDelegate.MODE_NIGHT_NO else AppCompatDelegate.MODE_NIGHT_YES
        )
    }

    private fun confirmWipe() {
        MaterialAlertDialogBuilder(this)
            .setTitle("Remove all data?")
            .setMessage("Are you sure you want to remove all data? Your name and login stay.")
            .setNegativeButton("No", null)
            .setPositiveButton("Yes") { _, _ -> wipe() }
            .show()
    }

    private fun wipe() {
        binding.wipeButton.isEnabled = false
        repo.wipeUserData(object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                binding.wipeButton.isEnabled = true
                load()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.wipeButton.isEnabled = true
                MaterialAlertDialogBuilder(this@HomeActivity)
                    .setMessage(message)
                    .setPositiveButton("OK", null)
                    .show()
            }
        })
    }

    private fun logout() {
        repo.signOut()
        startActivity(Intent(this, LoginActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }
}
