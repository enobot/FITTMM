package com.fittmm.app.ui.record

import androidx.lifecycle.ViewModel
import com.fittmm.app.data.WorkoutPlan

class RecordDraft {
    var sets = ""
    var reps = ""
    var weight = ""
    var unit = "lbs"
    var rating = 0
}

class RecordViewModel : ViewModel() {
    var plan: WorkoutPlan? = null
    var loaded = false
    var day = ""
    val drafts = mutableMapOf<String, RecordDraft>()
}
