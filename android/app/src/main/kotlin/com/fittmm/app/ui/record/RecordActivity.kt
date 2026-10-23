package com.fittmm.app.ui.record

import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.Nav
import com.fittmm.app.data.SessionEntry
import com.fittmm.app.data.Week
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.data.WorkoutSession
import com.fittmm.app.databinding.ActivityRecordBinding
import com.fittmm.app.logic.WeightUnits
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack

class RecordActivity : AppCompatActivity() {
    private lateinit var binding: ActivityRecordBinding
    private val vm: RecordViewModel by viewModels()
    private val repo = FittmmRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRecordBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) {
            return
        }
        binding.backBar.screenTitle.text = "Record workout"
        wireBack(binding.backBar.backButton)
        binding.saveButton.setOnClickListener { save() }
        if (vm.loaded) {
            bindSpinner()
        } else {
            if (vm.day.isEmpty()) {
                vm.day = intent.getStringExtra(Nav.DAY) ?: Week.today()
            }
            repo.loadPlan(object : FittmmRepository.ValueCallback<WorkoutPlan> {
                override fun onSuccess(value: WorkoutPlan?) {
                    vm.plan = value
                    vm.loaded = true
                    if (isDestroyed) return
                    bindSpinner()
                }

                override fun onError(message: String) {
                    vm.loaded = true
                    if (isDestroyed) return
                    binding.errorText.showError(message)
                    bindSpinner()
                }
            })
        }
    }

    private fun bindSpinner() {
        if (binding.daySpinner.adapter == null) {
            binding.daySpinner.adapter = ArrayAdapter(
                this,
                android.R.layout.simple_spinner_dropdown_item,
                Week.DAYS
            )
            binding.daySpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                    val picked = Week.DAYS[position]
                    if (picked == vm.day) {
                        return
                    }
                    vm.day = picked
                    renderCards()
                }

                override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            }
        }
        binding.daySpinner.setSelection(Week.indexOf(vm.day))
        renderCards()
    }

    private fun renderCards() {
        val names = vm.plan?.days?.get(vm.day) ?: emptyList()
        renderRecordCards(binding.recordCards, names, vm.drafts)
    }

    private fun save() {
        val names = vm.plan?.days?.get(vm.day) ?: emptyList()
        if (names.isEmpty()) {
            binding.errorText.showError("This day has no exercises to log.")
            return
        }
        val session = WorkoutSession()
        session.day = vm.day
        session.loggedAt = System.currentTimeMillis()
        for (name in names) {
            val draft = vm.drafts[name] ?: continue
            val setsText = draft.sets.trim()
            val repsText = draft.reps.trim()
            val weightText = draft.weight.trim()
            if (setsText.isEmpty() && repsText.isEmpty() && weightText.isEmpty()) {
                continue
            }
            val sets = if (setsText.isEmpty()) 1 else setsText.toIntOrNull()
            val reps = repsText.toIntOrNull()
            val weight = weightText.toDoubleOrNull()
            if (sets == null || sets <= 0 || reps == null || reps <= 0 || weight == null || weight < 0) {
                binding.errorText.showError("Enter sets, reps, and weight for $name.")
                return
            }
            val entry = SessionEntry()
            entry.name = name
            entry.sets = sets
            entry.reps = reps
            entry.weightLbs = if (draft.unit == "kg") WeightUnits.kgToPounds(weight) else weight
            entry.rating = draft.rating
            session.entries.add(entry)
        }
        if (session.entries.isEmpty()) {
            binding.errorText.showError("Log at least one exercise.")
            return
        }
        binding.errorText.showError(null)
        binding.saveButton.isEnabled = false
        binding.saveButton.text = "Saving..."
        repo.saveSession(session, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                finish()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.saveButton.isEnabled = true
                binding.saveButton.text = "Save workout"
                binding.errorText.showError(message)
            }
        })
    }
}
