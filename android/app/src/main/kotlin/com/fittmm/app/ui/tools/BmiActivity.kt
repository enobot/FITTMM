package com.fittmm.app.ui.tools

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.databinding.ActivityBmiBinding
import com.fittmm.app.logic.BmiCalculator
import com.fittmm.app.ui.wireBack

class BmiActivity : AppCompatActivity() {
    private lateinit var binding: ActivityBmiBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBmiBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.backBar.screenTitle.text = "BMI"
        wireBack(binding.backBar.backButton)
        binding.calculateButton.setOnClickListener { calculate() }
    }

    private fun calculate() {
        val weightText = binding.weightInput.text?.toString()?.trim().orEmpty()
        val heightText = binding.heightInput.text?.toString()?.trim().orEmpty()
        val weight = weightText.toDoubleOrNull()
        val height = heightText.toDoubleOrNull()
        if (weight == null || height == null) {
            binding.resultText.text = "Enter weight in kilograms and height in meters."
            return
        }
        try {
            val bmi = BmiCalculator.calculate(weight, height)
            binding.resultText.text = "Your BMI: $bmi\n${BmiCalculator.category(bmi)}"
        } catch (error: IllegalArgumentException) {
            binding.resultText.text = error.message
        }
    }
}
