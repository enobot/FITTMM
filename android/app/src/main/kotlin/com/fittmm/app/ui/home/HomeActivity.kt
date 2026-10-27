package com.fittmm.app.ui.home

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.Nav
import com.fittmm.app.data.UserProfile
import com.fittmm.app.data.VolumeSummary
import com.fittmm.app.data.Week
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.databinding.ActivityHomeBinding
import com.fittmm.app.ui.Units
import com.fittmm.app.ui.auth.VerifyEmailActivity
import com.fittmm.app.ui.auth.openClearingTask
import com.fittmm.app.ui.library.ExerciseLibraryActivity
import com.fittmm.app.ui.plan.ExerciseListActivity
import com.fittmm.app.ui.plan.PlanActivity
import com.fittmm.app.ui.progress.ProgressActivity
import com.fittmm.app.ui.record.RecordActivity
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.settings.SettingsActivity
import com.fittmm.app.ui.tools.BmiActivity
import com.fittmm.app.ui.tools.PlateActivity
import com.fittmm.app.ui.volume.VolumeActivity
import kotlin.math.abs
import kotlin.math.roundToInt

class HomeActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHomeBinding
    private val repo = FittmmRepository()
    private var selectedDay = Week.today()
    private var currentPlan: WorkoutPlan? = null
    private var metric = false
    private var networkRetries = 0

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
        binding.libraryButton.setOnClickListener {
            startActivity(Intent(this, ExerciseLibraryActivity::class.java))
        }
        binding.settingsButton.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        val openVolume = { _: android.view.View -> startActivity(Intent(this, VolumeActivity::class.java)) }
        binding.volumeCard.setOnClickListener(openVolume)
        binding.volumeButton.setOnClickListener(openVolume)
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
        if (repo.needsEmailVerification()) {
            openClearingTask(VerifyEmailActivity::class.java)
            return
        }
        load()
    }

    /** First name from the profile, else from the sign-in account, so it works offline too. */
    private fun greet(profileName: String?) {
        val fromAccount = repo.auth().displayName().trim().substringBefore(" ")
        val fromEmail = repo.currentEmail().substringBefore("@").substringBefore(".")
            .replaceFirstChar { it.uppercase() }
        val name = profileName?.trim().orEmpty().ifEmpty { fromAccount }.ifEmpty { fromEmail }
        binding.greetingText.text = if (name.isEmpty()) "Hi" else "Hi, $name"
    }

    /** Right after the phone wakes up the network may not be ready; try again shortly. */
    private fun retryIfOffline(message: String): Boolean {
        if (!message.startsWith("Can't reach") || networkRetries >= 3) return false
        networkRetries += 1
        binding.root.postDelayed({ if (!isDestroyed) load() }, 3000L)
        return true
    }

    private fun load() {
        binding.todayBody.text = "Loading..."
        greet(null)
        repo.loadProfile(object : FittmmRepository.ValueCallback<UserProfile> {
            override fun onSuccess(value: UserProfile?) {
                if (isDestroyed) return
                networkRetries = 0
                greet(value?.fname)
                metric = value?.metric() == true
                loadVolume()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                if (!retryIfOffline(message)) loadVolume()
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
                binding.todayBody.text =
                    if (message.startsWith("Can't reach") && networkRetries < 3) "Connecting..." else message
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

    private fun loadVolume() {
        repo.loadVolume(14, object : FittmmRepository.ValueCallback<VolumeSummary> {
            override fun onSuccess(value: VolumeSummary?) {
                if (isDestroyed || value == null) return
                val unit = Units.weightUnit(metric)
                binding.volumeText.text = "${Units.volumeText(value.thisWeek, metric)} $unit"
                binding.volumeDelta.text = when {
                    value.lastWeek > 0 -> {
                        val pct = ((value.thisWeek - value.lastWeek) / value.lastWeek * 100).roundToInt()
                        "${if (pct >= 0) "+" else "-"}${abs(pct)}% vs last week " +
                            "(${Units.volumeText(value.lastWeek, metric)} $unit)"
                    }
                    value.thisWeek > 0 -> "First logged week. This is your baseline."
                    else -> "Log a workout to start loading the bar."
                }
            }

            override fun onError(message: String) {
                if (!isDestroyed) binding.volumeDelta.text = message
            }
        })
    }
}
