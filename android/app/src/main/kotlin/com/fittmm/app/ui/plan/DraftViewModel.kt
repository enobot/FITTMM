package com.fittmm.app.ui.plan

import androidx.lifecycle.ViewModel
import com.fittmm.app.data.Exercise
import com.fittmm.app.data.WorkoutPlan

class DraftViewModel : ViewModel() {
    var plan = WorkoutPlan()
    var ready = false
    var day = ""
    var query = ""
    var filter = "all"
    val custom = mutableListOf<Exercise>()
}
