package com.fittmm.app.ui.volume

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.fittmm.app.R
import com.fittmm.app.data.Catalog
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.UserProfile
import com.fittmm.app.data.VolumeSummary
import com.fittmm.app.databinding.ActivityVolumeBinding
import com.fittmm.app.ui.Units
import com.fittmm.app.ui.dp
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.wireBack
import com.google.android.material.progressindicator.LinearProgressIndicator
import java.text.SimpleDateFormat
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** Totals, weekly volume, body-part split and per-exercise bests, same as the website's Volume page. */
class VolumeActivity : AppCompatActivity() {
    private lateinit var binding: ActivityVolumeBinding
    private val repo = FittmmRepository()
    private var metric = false
    private var days = 30

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVolumeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) return
        binding.backBar.screenTitle.text = "Volume"
        wireBack(binding.backBar.backButton)
        binding.rangeToggle.addOnButtonCheckedListener { _, id, checked ->
            if (!checked) return@addOnButtonCheckedListener
            days = when (id) {
                binding.range7.id -> 7
                binding.range90.id -> 90
                binding.range365.id -> 365
                else -> 30
            }
            load()
        }
        repo.loadProfile(object : FittmmRepository.ValueCallback<UserProfile> {
            override fun onSuccess(value: UserProfile?) {
                metric = value?.metric() == true
                if (!isDestroyed) load()
            }

            override fun onError(message: String) {
                if (!isDestroyed) load()
            }
        })
    }

    private fun load() {
        binding.statusText.text = "Adding up your sets..."
        repo.loadVolume(days, object : FittmmRepository.ValueCallback<VolumeSummary> {
            override fun onSuccess(value: VolumeSummary?) {
                if (!isDestroyed && value != null) bind(value)
            }

            override fun onError(message: String) {
                if (!isDestroyed) binding.statusText.text = message
            }
        })
    }

    private fun bind(v: VolumeSummary) {
        val unit = Units.weightUnit(metric)
        val rangeLabel = if (days == 365) "year" else "$days days"
        binding.totalLabel.text = "Total volume, last $rangeLabel ($unit)"
        binding.totalText.text = Units.volumeText(v.totalVolume, metric)
        val change = if (v.lastWeek > 0) {
            val pct = ((v.thisWeek - v.lastWeek) / v.lastWeek * 100).roundToInt()
            "${if (pct >= 0) "up" else "down"} ${abs(pct)}% from last week"
        } else if (v.thisWeek > 0) "nothing logged last week" else ""
        binding.statsText.text = "This week ${Units.volumeText(v.thisWeek, metric)} $unit" +
            (if (change.isNotEmpty()) ", $change" else "") +
            "\n${v.workouts} workouts, ${v.sets} sets, ${v.reps} reps"

        if (v.workouts == 0) {
            binding.statusText.text = "No sets logged in this range yet. Record a workout to see your volume."
            binding.details.visibility = View.GONE
            return
        }
        binding.statusText.text = ""
        binding.details.visibility = View.VISIBLE

        val parse = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val show = SimpleDateFormat("MMM d", Locale.US)
        val label = { iso: String -> runCatching { show.format(parse.parse(iso)!!) }.getOrDefault(iso) }
        val points = if (days <= 7) v.daily else v.weekly
        binding.weeklyTitle.text = if (days <= 7) "Volume per day" else "Volume per week"
        binding.weeklyChart.setBars(points.map {
            val prefix = if (days <= 7) label(it.date) else "Week of ${label(it.date)}"
            BarChartView.Bar(label(it.date), it.volume, "$prefix: ${Units.volumeText(it.volume, metric)} $unit")
        })

        binding.partsList.removeAllViews()
        val maxPart = v.byBodyPart.maxOfOrNull { it.volume }?.coerceAtLeast(1.0) ?: 1.0
        for (part in v.byBodyPart) {
            val name = if (part.bodyPart == "other") "Other or custom" else Catalog.label(part.bodyPart)
            binding.partsList.addView(text(
                "$name: ${Units.volumeText(part.volume, metric)} $unit, ${part.sets} ${if (part.sets == 1) "set" else "sets"}"
            ))
            binding.partsList.addView(LinearProgressIndicator(this).apply {
                max = 1000
                progress = ((part.volume / maxPart) * 1000).roundToInt()
                trackCornerRadius = dp(4)
                indicatorTrackGapSize = 0
                trackStopIndicatorSize = 0
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(10)).apply {
                    bottomMargin = dp(10)
                }
            })
        }

        binding.exerciseList.removeAllViews()
        for (e in v.byExercise) {
            val best = if (e.bestWeight > 0) "${Units.weightText(e.bestWeight, metric)} × ${e.bestSetReps}"
            else "${e.bestSetReps} reps"
            val oneRm = if (e.estimatedOneRepMax > 0) ", est. 1RM ${Units.weightText(e.estimatedOneRepMax, metric)}" else ""
            binding.exerciseList.addView(text(
                "${e.name}\n${e.sets} sets, ${Units.volumeText(e.volume, metric)} $unit, best $best$oneRm",
                bold = true
            ))
        }
    }

    private fun text(value: String, bold: Boolean = false) = TextView(this).apply {
        text = value
        setTextColor(ContextCompat.getColor(context, R.color.text))
        textSize = 15f
        setPadding(0, dp(6), 0, dp(6))
        if (bold) {
            // Only the first line (the exercise name) is emphasized
            val end = value.indexOf('\n').takeIf { it > 0 } ?: value.length
            text = android.text.SpannableString(value).apply {
                setSpan(android.text.style.StyleSpan(android.graphics.Typeface.BOLD), 0, end, 0)
            }
        }
    }
}
