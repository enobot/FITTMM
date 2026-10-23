package com.fittmm.app.ui.plan

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.R
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.Nav
import com.fittmm.app.data.Week
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.databinding.ActivityReviewBinding
import com.fittmm.app.ui.dp
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import com.google.android.material.button.MaterialButton
import java.util.ArrayList

class ReviewActivity : AppCompatActivity() {
    private lateinit var binding: ActivityReviewBinding
    private val vm: ReviewViewModel by viewModels()
    private val repo = FittmmRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReviewBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) {
            return
        }
        if (vm.plan == null) {
            vm.plan = WorkoutPlan.fromJson(intent.getStringExtra(Nav.PLAN))
        }
        binding.backBar.screenTitle.text = "Review"
        wireBack(binding.backBar.backButton)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                returnPlan()
            }
        })
        binding.saveButton.setOnClickListener { save() }
        render()
    }

    private fun render() {
        val plan = vm.plan ?: return
        binding.reviewList.removeAllViews()
        val title = TextView(this)
        title.text = plan.name.ifBlank { "My plan" }
        title.textSize = 22f
        title.setTextColor(getColor(R.color.text))
        binding.reviewList.addView(title)
        if (plan.description.isNotBlank()) {
            val notes = TextView(this)
            notes.text = plan.description
            notes.setTextColor(getColor(R.color.textSecondary))
            notes.setPadding(0, dp(8), 0, dp(8))
            binding.reviewList.addView(notes)
        }
        for (day in Week.DAYS) {
            if (!plan.days.containsKey(day)) {
                continue
            }
            val header = TextView(this)
            header.text = day
            header.textSize = 18f
            header.setTextColor(getColor(R.color.primary))
            header.setPadding(0, dp(16), 0, dp(4))
            binding.reviewList.addView(header)
            val names = plan.days[day] ?: emptyList()
            if (names.isEmpty()) {
                val rest = TextView(this)
                rest.text = "REST"
                rest.setTextColor(getColor(R.color.textSecondary))
                binding.reviewList.addView(rest)
                continue
            }
            for (name in names.toList()) {
                binding.reviewList.addView(exerciseRow(plan, day, name))
            }
        }
    }

    private fun exerciseRow(plan: WorkoutPlan, day: String, name: String): LinearLayout {
        val row = LinearLayout(this)
        row.orientation = LinearLayout.HORIZONTAL
        row.gravity = android.view.Gravity.CENTER_VERTICAL
        val label = TextView(this)
        label.text = name
        label.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        label.setTextColor(getColor(R.color.text))
        val remove = MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle)
        remove.text = "Remove"
        remove.isAllCaps = false
        remove.setOnClickListener {
            val current = ArrayList(plan.days[day] ?: emptyList())
            current.removeAll { it.equals(name, true) }
            plan.days[day] = current
            render()
        }
        row.addView(label)
        row.addView(remove)
        return row
    }

    private fun save() {
        val plan = vm.plan ?: return
        if (!plan.hasSelections()) {
            binding.errorText.showError("Add at least one exercise.")
            return
        }
        binding.errorText.showError(null)
        binding.saveButton.isEnabled = false
        binding.saveButton.text = "Saving..."
        repo.savePlan(plan, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                startActivity(Intent(this@ReviewActivity, DoneActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.saveButton.isEnabled = true
                binding.saveButton.text = "Looks good"
                binding.errorText.showError(message)
            }
        })
    }

    private fun returnPlan() {
        setResult(RESULT_OK, Intent().putExtra(Nav.PLAN, vm.plan?.toJson()))
        finish()
    }
}
