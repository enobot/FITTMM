package com.fittmm.app.ui.auth

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.UserProfile
import com.fittmm.app.databinding.ActivitySignupBinding
import com.fittmm.app.ui.home.HomeActivity
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import java.util.Calendar
import java.util.Locale

class SignupActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySignupBinding
    private val repo = FittmmRepository()
    private var birthdayIso = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignupBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.backBar.screenTitle.text = "Sign up"
        wireBack(binding.backBar.backButton)
        birthdayIso = savedInstanceState?.getString(BIRTHDAY).orEmpty()
        if (birthdayIso.isNotEmpty()) {
            binding.birthdayButton.text = birthdayIso
        }

        val genders = arrayOf("Gender (optional)", "Male", "Female", "Other", "Prefer not to say")
        binding.genderSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, genders)
        binding.birthdayButton.setOnClickListener { pickBirthday() }
        binding.signupButton.setOnClickListener { submit() }
        if (!repo.isConfigured()) {
            binding.errorText.showError(FittmmRepository.NOT_CONFIGURED)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(BIRTHDAY, birthdayIso)
    }

    private fun pickBirthday() {
        val calendar = Calendar.getInstance()
        DatePickerDialog(
            this,
            { _, year, month, day ->
                birthdayIso = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day)
                binding.birthdayButton.text = birthdayIso
            },
            calendar.get(Calendar.YEAR) - 20,
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    private fun submit() {
        val first = binding.firstNameInput.text?.toString()?.trim().orEmpty()
        val last = binding.lastNameInput.text?.toString()?.trim().orEmpty()
        val email = binding.emailInput.text?.toString()?.trim()?.lowercase().orEmpty()
        val password = binding.passwordInput.text?.toString().orEmpty()
        val confirm = binding.confirmInput.text?.toString().orEmpty()
        if (first.isEmpty() || last.isEmpty()) {
            binding.errorText.showError("Please enter your first and last name.")
            return
        }
        if (birthdayIso.isEmpty()) {
            binding.errorText.showError("Please select your birthday.")
            return
        }
        if (email.isEmpty() || password.isEmpty()) {
            binding.errorText.showError("Please enter email and password.")
            return
        }
        if (password.length < 6) {
            binding.errorText.showError("Password should be at least 6 characters.")
            return
        }
        if (password != confirm) {
            binding.errorText.showError("Passwords do not match.")
            return
        }
        val weight = readNumber(binding.weightInput.text?.toString(), 180.0) ?: run {
            binding.errorText.showError("Enter a valid weight.")
            return
        }
        val height = readNumber(binding.heightInput.text?.toString(), 63.0) ?: run {
            binding.errorText.showError("Enter a valid height.")
            return
        }
        val genderValue = binding.genderSpinner.selectedItem?.toString().orEmpty()
        val profile = UserProfile()
        profile.fname = first
        profile.lname = last
        profile.email = email
        profile.dateOfBirth = birthdayIso
        profile.gender = if (genderValue.startsWith("Gender")) "" else genderValue
        profile.weight = weight
        profile.height = height

        binding.errorText.showError(null)
        binding.signupButton.isEnabled = false
        binding.signupButton.text = "Creating account..."
        repo.signUp(profile, password, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                startActivity(Intent(this@SignupActivity, HomeActivity::class.java))
                finish()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.signupButton.isEnabled = true
                binding.signupButton.text = "Create account"
                binding.errorText.showError(message)
            }
        })
    }

    private fun readNumber(raw: String?, defaultValue: Double): Double? {
        val text = raw?.trim().orEmpty()
        if (text.isEmpty()) {
            return defaultValue
        }
        val value = text.toDoubleOrNull() ?: return null
        if (value < 0) {
            return null
        }
        return value
    }

    companion object {
        private const val BIRTHDAY = "birthday"
    }
}
