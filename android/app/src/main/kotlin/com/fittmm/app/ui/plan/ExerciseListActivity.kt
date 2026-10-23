package com.fittmm.app.ui.plan

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.recyclerview.widget.LinearLayoutManager
import com.fittmm.app.data.Catalog
import com.fittmm.app.data.Exercise
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.Nav
import com.fittmm.app.data.Week
import com.fittmm.app.data.WorkoutPlan
import com.fittmm.app.databinding.ActivityExercisesBinding
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import java.util.ArrayList

class ExerciseListActivity : AppCompatActivity() {
    private lateinit var binding: ActivityExercisesBinding
    private val vm: DraftViewModel by viewModels()
    private val repo = FittmmRepository()
    private val adapter = ExerciseAdapter { exercise, checked -> toggle(exercise, checked) }
    private val reviewLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val json = result.data?.getStringExtra(Nav.PLAN)
            if (json != null) {
                vm.plan = WorkoutPlan.fromJson(json)
            }
            renderDays()
            renderExercises()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityExercisesBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) {
            return
        }
        binding.backBar.screenTitle.text = "Exercises"
        wireBack(binding.backBar.backButton)
        binding.exerciseList.layoutManager = LinearLayoutManager(this)
        binding.exerciseList.adapter = adapter
        binding.searchInput.doAfterTextChanged {
            vm.query = it?.toString().orEmpty()
            renderExercises()
        }
        binding.addExerciseButton.setOnClickListener { showAddExerciseDialog(repo, ::catalog, ::addToDay) }
        binding.reviewButton.setOnClickListener { openReview() }
        ensurePlan()
    }

    private fun ensurePlan() {
        if (vm.ready) {
            if (vm.day.isEmpty()) {
                vm.day = defaultDay()
            }
            renderDays()
            renderFilters()
            renderExercises()
            loadCustom()
            return
        }
        val json = intent.getStringExtra(Nav.PLAN)
        if (json != null) {
            vm.plan = WorkoutPlan.fromJson(json)
            vm.ready = true
            vm.day = defaultDay()
            renderDays()
            renderFilters()
            renderExercises()
            loadCustom()
            return
        }
        repo.loadPlan(object : FittmmRepository.ValueCallback<WorkoutPlan> {
            override fun onSuccess(value: WorkoutPlan?) {
                vm.plan = value ?: emptyPlan()
                vm.ready = true
                if (isDestroyed) return
                vm.day = defaultDay()
                renderDays()
                renderFilters()
                renderExercises()
                loadCustom()
            }

            override fun onError(message: String) {
                vm.plan = emptyPlan()
                vm.ready = true
                if (isDestroyed) return
                vm.day = defaultDay()
                binding.emptyCatalog.showError(message)
                renderDays()
                renderFilters()
                renderExercises()
            }
        })
    }

    private fun emptyPlan(): WorkoutPlan {
        val plan = WorkoutPlan()
        for (day in Week.DAYS) {
            plan.days[day] = ArrayList()
        }
        return plan
    }

    private fun defaultDay(): String {
        val days = daysInPlan()
        val today = Week.today()
        return if (days.contains(today)) today else days.first()
    }

    private fun daysInPlan(): List<String> {
        val ordered = Week.DAYS.filter { vm.plan.days.containsKey(it) }
        return if (ordered.isEmpty()) Week.DAYS.toList() else ordered
    }

    private fun renderDays() {
        binding.dayBar.removeAllViews()
        for (day in daysInPlan()) {
            binding.dayBar.addView(choiceChip(day.take(3), day == vm.day) {
                vm.day = day
                renderDays()
                renderExercises()
            })
        }
    }

    private fun renderFilters() {
        binding.filterBar.removeAllViews()
        val filters = listOf("all") + Catalog.BODY_PARTS.toList()
        for (filter in filters) {
            val label = if (filter == "all") "All" else Catalog.label(filter)
            binding.filterBar.addView(choiceChip(label, filter == vm.filter) {
                vm.filter = filter
                renderFilters()
                renderExercises()
            })
        }
    }

    private fun loadCustom() {
        repo.loadCustomExercises(object : FittmmRepository.ValueCallback<List<Exercise>> {
            override fun onSuccess(value: List<Exercise>?) {
                vm.custom.clear()
                vm.custom.addAll(value.orEmpty())
                if (isDestroyed) return
                renderExercises()
            }

            override fun onError(message: String) {
                renderExercises()
            }
        })
    }

    private fun catalog(): List<Exercise> {
        val presets = Catalog.presets()
        val taken = presets.map { it.name.lowercase() }.toSet()
        return presets + vm.custom.filter { it.name.lowercase() !in taken }
    }

    private fun renderExercises() {
        val query = vm.query.trim().lowercase()
        val visible = catalog().filter { exercise ->
            val nameOk = query.isEmpty() || exercise.name.lowercase().contains(query)
            val partOk = vm.filter == "all" || exercise.bodyPart.equals(vm.filter, true)
            nameOk && partOk
        }
        val selected = vm.plan.days[vm.day] ?: emptyList()
        adapter.submit(visible, selected)
        binding.emptyCatalog.visibility = if (visible.isEmpty()) View.VISIBLE else View.GONE
        if (visible.isEmpty()) {
            binding.emptyCatalog.text = "No exercises match."
        }
    }

    private fun toggle(exercise: Exercise, checked: Boolean) {
        val current = ArrayList(vm.plan.days[vm.day] ?: emptyList())
        if (checked) {
            if (current.none { it.equals(exercise.name, true) }) {
                current.add(exercise.name)
            }
        } else {
            current.removeAll { it.equals(exercise.name, true) }
        }
        vm.plan.days[vm.day] = current
    }

    private fun addToDay(exercise: Exercise) {
        vm.custom.add(exercise)
        val current = ArrayList(vm.plan.days[vm.day] ?: emptyList())
        current.add(exercise.name)
        vm.plan.days[vm.day] = current
        renderExercises()
    }

    private fun openReview() {
        reviewLauncher.launch(
            Intent(this, ReviewActivity::class.java).putExtra(Nav.PLAN, vm.plan.toJson())
        )
    }
}
