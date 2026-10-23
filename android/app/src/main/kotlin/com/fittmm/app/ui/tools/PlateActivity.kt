package com.fittmm.app.ui.tools

import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.R
import com.fittmm.app.databinding.ActivityPlateBinding
import com.fittmm.app.logic.PlateMath
import com.fittmm.app.logic.WeightUnits
import com.fittmm.app.ui.wireBack
import com.google.android.material.button.MaterialButton

class PlateActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPlateBinding
    private val vm: PlateViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPlateBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.backBar.screenTitle.text = "Plate calculator"
        wireBack(binding.backBar.backButton)
        binding.lbButton.setOnClickListener { switchUnit(true) }
        binding.kgButton.setOnClickListener { switchUnit(false) }
        binding.clearButton.setOnClickListener {
            vm.plates.clear()
            render()
        }
        render()
    }

    private fun switchUnit(pounds: Boolean) {
        if (vm.pounds == pounds) {
            return
        }
        vm.pounds = pounds
        vm.plates.clear()
        render()
    }

    private fun render() {
        val unit = if (vm.pounds) "lb" else "kg"
        styleUnit(binding.lbButton, vm.pounds)
        styleUnit(binding.kgButton, !vm.pounds)
        binding.perSideText.text = "Per side: ${WeightUnits.format(PlateMath.perSide(vm.plates))} $unit"
        binding.totalText.text = "Total: ${WeightUnits.format(PlateMath.total(vm.plates, vm.pounds))} $unit"
        binding.overflowText.text = PlateMath.OVERFLOW
        binding.overflowText.visibility = if (PlateMath.overflow(vm.plates, vm.pounds)) View.VISIBLE else View.GONE
        renderPlateBar(binding.barRow, vm.plates, vm.pounds)
        renderPlateRows(binding.plateRows, vm.plates, vm.pounds) { render() }
    }

    private fun styleUnit(button: MaterialButton, selected: Boolean) {
        if (selected) {
            button.backgroundTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.primary))
            button.setTextColor(getColor(R.color.onPrimary))
        } else {
            button.backgroundTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.surface))
            button.setTextColor(getColor(R.color.text))
        }
    }
}
