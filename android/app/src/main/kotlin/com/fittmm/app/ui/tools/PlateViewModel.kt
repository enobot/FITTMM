package com.fittmm.app.ui.tools

import androidx.lifecycle.ViewModel

class PlateViewModel : ViewModel() {
    val plates = mutableListOf<Double>()
    var pounds = true
}
