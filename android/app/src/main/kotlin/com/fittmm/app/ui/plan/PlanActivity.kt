package com.fittmm.app.ui.plan

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.Nav
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.databinding.ActivityPlanBinding
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import java.util.ArrayList

class PlanActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPlanBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPlanBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.backBar.screenTitle.text = "Create a plan"
        wireBack(binding.backBar.backButton)
        binding.continueButton.setOnClickListener { goNext() }
    }

    private fun goNext() {
        val chosen = listOf(
            binding.daySunday to "Sunday",
            binding.dayMonday to "Monday",
            binding.dayTuesday to "Tuesday",
            binding.dayWednesday to "Wednesday",
            binding.dayThursday to "Thursday",
            binding.dayFriday to "Friday",
            binding.daySaturday to "Saturday"
        )
        val plan = WorkoutPlan()
        plan.name = binding.planNameInput.text?.toString()?.trim().orEmpty().ifEmpty { "My plan" }
        plan.description = binding.planNotesInput.text?.toString()?.trim().orEmpty()
        var any = false
        for ((box, day) in chosen) {
            if (box.isChecked) {
                any = true
                plan.days[day] = ArrayList()
            }
        }
        if (!any) {
            binding.errorText.showError("Pick at least one training day.")
            return
        }
        binding.errorText.showError(null)
        startActivity(
            Intent(this, ExerciseListActivity::class.java)
                .putExtra(Nav.PLAN, plan.toJson())
        )
    }
}
