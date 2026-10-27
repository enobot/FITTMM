package com.fittmm.app.ui.auth

import android.app.DatePickerDialog
import android.os.Bundle
import android.widget.ArrayAdapter
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.AuthRepository
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.UserProfile
import com.fittmm.app.databinding.ActivitySignupBinding
import com.fittmm.app.logic.AccountRules
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import org.json.JSONObject
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

        binding.genderSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, GENDERS)
        binding.birthdayButton.setOnClickListener { pickBirthday() }
        binding.signupButton.setOnClickListener { submit() }
        binding.social.googleButton.setOnClickListener { social(AuthRepository.GOOGLE) }
        binding.social.appleButton.setOnClickListener { social(AuthRepository.APPLE) }
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
        ).apply { datePicker.maxDate = System.currentTimeMillis() }.show()
    }

    private fun setBusy(busy: Boolean) {
        binding.signupButton.isEnabled = !busy
        binding.social.googleButton.isEnabled = !busy
        binding.social.appleButton.isEnabled = !busy
        binding.signupButton.text = if (busy) "Creating your account..." else "Sign up"
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
        if (password != confirm) {
            binding.errorText.showError("Passwords do not match.")
            return
        }
        val age = AccountRules.ageOn(birthdayIso, Calendar.getInstance())
        if (age == null || age < AccountRules.MINIMUM_AGE) {
            binding.errorText.showError("You need to be at least 13 to use FITTMM.")
            return
        }
        AccountRules.passwordProblem(password)?.let {
            binding.errorText.showError(it)
            return
        }
        val weight = readNumber(binding.weightInput.text?.toString())
            ?.takeIf { it == 0.0 || it in 20.0..1000.0 } ?: run {
            binding.errorText.showError("Enter your weight in pounds, or leave it blank.")
            return
        }
        val height = readNumber(binding.heightInput.text?.toString())
            ?.takeIf { it == 0.0 || it in 20.0..108.0 } ?: run {
            binding.errorText.showError("Enter your height in inches, or leave it blank.")
            return
        }
        val genderValue = binding.genderSpinner.selectedItem?.toString().orEmpty()
        val profile = UserProfile().apply {
            fname = first
            lname = last
            this.email = email
            dateOfBirth = birthdayIso
        }

        // The API accepts these once the email is verified
        val pending = JSONObject()
            .put("fname", first)
            .put("lname", last)
            .put("date_of_birth", birthdayIso)
        if (!genderValue.startsWith("Gender")) pending.put("gender", genderValue.lowercase())
        if (weight > 0) pending.put("weight", weight)
        if (height > 0) pending.put("height", height)
        PendingProfile.save(this, email, pending)

        binding.errorText.showError(null)
        setBusy(true)
        repo.signUp(profile, password, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                openClearingTask(VerifyEmailActivity::class.java)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                setBusy(false)
                binding.errorText.showError(message)
            }
        })
    }

    private fun social(providerId: String) {
        binding.errorText.showError(null)
        setBusy(true)
        continueWith(providerId, repo,
            onDone = { if (!isDestroyed) routeAfterSignIn(repo) },
            onError = { message ->
                if (!isDestroyed) {
                    setBusy(false)
                    binding.errorText.showError(message)
                }
            })
    }

    /** Blank is allowed (0); anything else must be a positive number. Null means invalid. */
    private fun readNumber(raw: String?): Double? {
        val text = raw?.trim().orEmpty()
        if (text.isEmpty()) return 0.0
        val value = text.toDoubleOrNull() ?: return null
        return if (value < 0) null else value
    }

    companion object {
        private const val BIRTHDAY = "birthday"
        private val GENDERS = arrayOf("Gender (optional)", "Female", "Male", "Non-binary", "Prefer not to say")
    }
}
