package com.fittmm.app.ui.settings

import android.app.DatePickerDialog
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import com.fittmm.app.FittmmApp
import com.fittmm.app.R
import com.fittmm.app.data.AuthRepository
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.UserProfile
import com.fittmm.app.data.WeightEntry
import com.fittmm.app.databinding.ActivitySettingsBinding
import com.fittmm.app.logic.AccountRules
import com.fittmm.app.logic.WeightUnits
import com.fittmm.app.ui.Units
import com.fittmm.app.ui.auth.LoginActivity
import com.fittmm.app.ui.auth.openClearingTask
import com.fittmm.app.ui.dp
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.wireBack
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.firebase.auth.PhoneAuthCredential
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

/** Profile, body weight, sign-in methods, recovery phone, theme, and your data. */
class SettingsActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySettingsBinding
    private val repo = FittmmRepository()
    private var profile: UserProfile? = null
    private var metric = false
    private var birthdayIso = ""
    private var logDate = ""
    private var weightEdited = false
    private var verificationId = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) return
        binding.backBar.screenTitle.text = "Settings"
        wireBack(binding.backBar.backButton)
        if (intent.getBooleanExtra(WELCOME, false)) {
            binding.welcomeText.visibility = View.VISIBLE
        }

        binding.genderSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, GENDER_LABELS)
        binding.birthdayButton.setOnClickListener { pickBirthday() }
        binding.unitsToggle.addOnButtonCheckedListener { _, id, checked ->
            if (checked) switchUnits(id == binding.metricButton.id)
        }
        binding.weightInput.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: android.text.Editable?) {
                if (binding.weightInput.hasFocus()) weightEdited = true
            }
        })
        binding.saveProfileButton.setOnClickListener { saveProfile() }
        binding.logDateButton.setOnClickListener { pickLogDate() }
        binding.logWeightButton.setOnClickListener { logWeight() }
        binding.changePasswordButton.setOnClickListener { changePassword() }
        binding.phoneButton.setOnClickListener { phoneAction() }
        binding.removePhoneButton.setOnClickListener { removePhone() }
        binding.themeButton.setOnClickListener { toggleTheme() }
        binding.wipeButton.setOnClickListener { confirmWipe() }
        binding.deleteAccountButton.setOnClickListener { confirmDelete() }
        binding.logoutButton.setOnClickListener {
            repo.signOut()
            openClearingTask(LoginActivity::class.java)
        }
        refreshThemeLabel()
        bindSecurity()
        loadProfile()
    }

    // ---------- Profile ----------

    private fun loadProfile() {
        repo.loadProfile(object : FittmmRepository.ValueCallback<UserProfile> {
            override fun onSuccess(value: UserProfile?) {
                if (isDestroyed || value == null) return
                profile = value
                bindProfile(value)
                loadWeights()
            }

            override fun onError(message: String) {
                if (!isDestroyed) note(binding.profileMessage, message, ok = false)
            }
        })
    }

    private fun bindProfile(p: UserProfile) {
        metric = p.metric()
        binding.ageText.text = p.age?.toString() ?: "—"
        binding.heightText.text = Units.heightText(p.height, metric)
        binding.bmiText.text = p.bmi?.toString() ?: "—"
        binding.bmiCategoryText.text = p.bmiCategory
        binding.firstNameInput.setText(p.fname)
        binding.lastNameInput.setText(p.lname)
        birthdayIso = p.dateOfBirth
        binding.birthdayButton.text = if (birthdayIso.isEmpty()) "Birthday" else "Birthday: $birthdayIso"
        binding.genderSpinner.setSelection(GENDER_VALUES.indexOf(p.gender.lowercase()).coerceAtLeast(0))
        binding.unitsToggle.check(if (metric) binding.metricButton.id else binding.imperialButton.id)
        fillMeasurements(p.height, p.weight, p.goalWeight)
        weightEdited = false

        val unit = Units.weightUnit(metric)
        val change = if (p.weight > 0 && p.previousWeight != null) {
            val diff = (Units.weightValue(p.weight, metric) ?: 0.0) - (Units.weightValue(p.previousWeight, metric) ?: 0.0)
            when {
                diff == 0.0 -> ", no change"
                diff > 0 -> ", up ${WeightUnits.format(diff)} $unit"
                else -> ", down ${WeightUnits.format(-diff)} $unit"
            }
        } else ""
        binding.weightSummary.text = "Current ${Units.weightText(p.weight, metric)}" +
            "\nPrevious ${Units.weightText(p.previousWeight, metric)}$change" +
            "\nGoal ${Units.weightText(p.goalWeight, metric)}"
        binding.logWeightLayout.hint = "Weight ($unit)"
    }

    private fun fillMeasurements(heightIn: Double, weightLb: Double, goalLb: Double?) {
        if (metric) {
            binding.heightOneLayout.hint = "Height (cm)"
            binding.heightTwoLayout.visibility = View.GONE
            binding.heightOneInput.setText(if (heightIn > 0) Units.cmFromInches(heightIn).toString() else "")
        } else {
            binding.heightOneLayout.hint = "Feet"
            binding.heightTwoLayout.visibility = View.VISIBLE
            val total = heightIn.roundToInt()
            binding.heightOneInput.setText(if (heightIn > 0) (total / 12).toString() else "")
            binding.heightTwoInput.setText(if (heightIn > 0) (total % 12).toString() else "")
        }
        val unit = Units.weightUnit(metric)
        binding.weightLayout.hint = "Current weight ($unit)"
        binding.goalLayout.hint = "Goal ($unit, optional)"
        binding.weightInput.setText(Units.weightValue(weightLb, metric)?.let { WeightUnits.format(it) } ?: "")
        binding.goalInput.setText(Units.weightValue(goalLb, metric)?.let { WeightUnits.format(it) } ?: "")
    }

    /** Converts what's typed so far into the other unit system. */
    private fun switchUnits(toMetric: Boolean) {
        if (toMetric == metric) return
        val height = readHeightInches()
        val weight = readNumber(binding.weightInput)?.let { Units.toPounds(it, metric) }
        val goal = readNumber(binding.goalInput)?.let { Units.toPounds(it, metric) }
        val edited = weightEdited
        metric = toMetric
        fillMeasurements(height ?: 0.0, weight ?: 0.0, goal)
        weightEdited = edited
    }

    private fun readNumber(input: TextInputEditText): Double? =
        input.text?.toString()?.trim()?.toDoubleOrNull()

    private fun readHeightInches(): Double? {
        if (metric) return readNumber(binding.heightOneInput)?.let { Units.inchesFromCm(it) }
        val feet = readNumber(binding.heightOneInput)
        val inches = readNumber(binding.heightTwoInput)
        if (feet == null && inches == null) return null
        return (feet ?: 0.0) * 12 + (inches ?: 0.0)
    }

    private fun pickBirthday() {
        val now = Calendar.getInstance()
        DatePickerDialog(this, { _, y, m, d ->
            birthdayIso = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
            binding.birthdayButton.text = "Birthday: $birthdayIso"
        }, now.get(Calendar.YEAR) - 20, now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH))
            .apply { datePicker.maxDate = System.currentTimeMillis() }
            .show()
    }

    private fun saveProfile() {
        val first = binding.firstNameInput.text?.toString()?.trim().orEmpty()
        if (first.isEmpty()) return note(binding.profileMessage, "Enter your first name.", ok = false)
        if (birthdayIso.isNotEmpty()) {
            val age = AccountRules.ageOn(birthdayIso, Calendar.getInstance())
            if (age == null || age < AccountRules.MINIMUM_AGE || age > 120) {
                return note(binding.profileMessage, "Enter a real birthday. You must be 13 or older.", ok = false)
            }
        }
        val height = readHeightInches()
        if (height != null && height !in 20.0..108.0) {
            return note(binding.profileMessage, "Height looks off. Check the numbers and units.", ok = false)
        }
        val weight = readNumber(binding.weightInput)?.let { Units.toPounds(it, metric) }
        val goal = readNumber(binding.goalInput)?.let { Units.toPounds(it, metric) }
        if (listOfNotNull(weight, goal).any { it !in 20.0..1000.0 }) {
            return note(binding.profileMessage, "Weight looks off. Check the numbers and units.", ok = false)
        }
        val changes = JSONObject()
            .put("fname", first)
            .put("lname", binding.lastNameInput.text?.toString()?.trim().orEmpty())
            .put("unit_system", if (metric) "metric" else "imperial")
            .put("gender", GENDER_VALUES[binding.genderSpinner.selectedItemPosition].ifEmpty { JSONObject.NULL })
            .put("goal_weight", goal ?: JSONObject.NULL)
        if (birthdayIso.isNotEmpty()) changes.put("date_of_birth", birthdayIso)
        if (height != null) changes.put("height", height)
        // Only log a weigh-in when the weight was actually edited
        if (weight != null && (weightEdited || (profile?.weight ?: 0.0) <= 0)) changes.put("weight", weight)

        binding.saveProfileButton.isEnabled = false
        repo.updateProfile(changes, object : FittmmRepository.ValueCallback<UserProfile> {
            override fun onSuccess(value: UserProfile?) {
                if (isDestroyed) return
                binding.saveProfileButton.isEnabled = true
                if (value != null) {
                    profile = value
                    bindProfile(value)
                    loadWeights()
                }
                note(binding.profileMessage, "Profile saved.", ok = true)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.saveProfileButton.isEnabled = true
                note(binding.profileMessage, message, ok = false)
            }
        })
    }

    // ---------- Body weight ----------

    private fun loadWeights() {
        repo.loadWeights(object : FittmmRepository.ValueCallback<List<WeightEntry>> {
            override fun onSuccess(value: List<WeightEntry>?) {
                if (!isDestroyed) bindWeights(value.orEmpty())
            }

            override fun onError(message: String) = Unit
        })
    }

    private fun bindWeights(entries: List<WeightEntry>) {
        binding.weightHistory.removeAllViews()
        if (entries.isEmpty()) {
            binding.weightHistory.addView(TextView(this).apply {
                text = "No weigh-ins yet. Log one above to start your history."
                setTextColor(ContextCompat.getColor(context, R.color.textSecondary))
            })
            return
        }
        for (entry in entries) {
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(4), 0, dp(4))
            }
            row.addView(TextView(this).apply {
                text = "${entry.recordedOn}    ${Units.weightText(entry.weight, metric)}"
                setTextColor(ContextCompat.getColor(context, R.color.text))
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            row.addView(MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                text = "Delete"
                contentDescription = "Delete ${entry.recordedOn} weigh-in"
                setOnClickListener { deleteWeight(entry) }
            })
            binding.weightHistory.addView(row)
        }
    }

    private fun pickLogDate() {
        val now = Calendar.getInstance()
        DatePickerDialog(this, { _, y, m, d ->
            logDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
            binding.logDateButton.text = logDate
        }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH))
            .apply { datePicker.maxDate = System.currentTimeMillis() }
            .show()
    }

    private fun logWeight() {
        val value = readNumber(binding.logWeightInput)
        val pounds = value?.let { Units.toPounds(it, metric) }
        if (pounds == null || pounds !in 20.0..1000.0) {
            return note(binding.weightMessage, "Enter your weight in ${Units.weightUnit(metric)}.", ok = false)
        }
        val date = logDate.ifEmpty { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }
        binding.logWeightButton.isEnabled = false
        repo.addWeight(pounds, date, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                binding.logWeightButton.isEnabled = true
                binding.logWeightInput.setText("")
                note(binding.weightMessage, "Logged ${Units.weightText(pounds, metric)} for $date.", ok = true)
                loadProfile()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.logWeightButton.isEnabled = true
                note(binding.weightMessage, message, ok = false)
            }
        })
    }

    private fun deleteWeight(entry: WeightEntry) {
        repo.deleteWeight(entry.id, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (!isDestroyed) loadProfile()
            }

            override fun onError(message: String) {
                if (!isDestroyed) note(binding.weightMessage, message, ok = false)
            }
        })
    }

    // ---------- Sign-in and security ----------

    private fun bindSecurity() {
        val auth = repo.auth()
        val verified = if (auth.isEmailVerified) "Verified" else "Not verified"
        binding.emailText.text = "${auth.currentEmail()}  ($verified)"
        val providers = auth.providers()

        binding.providersList.removeAllViews()
        for ((id, label) in listOf(
            AuthRepository.PASSWORD to "Email and password",
            AuthRepository.GOOGLE to "Google",
            AuthRepository.APPLE to "Apple",
        )) {
            val on = providers.contains(id)
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                minimumHeight = dp(52)
            }
            row.addView(TextView(this).apply {
                text = "$label\n${if (on) "Connected" else "Not connected"}"
                setTextColor(ContextCompat.getColor(context, R.color.text))
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            if (id != AuthRepository.PASSWORD) {
                row.addView(MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                    text = if (on) "Disconnect" else "Connect"
                    isEnabled = !on || providers.count { it != AuthRepository.PHONE } > 1
                    setOnClickListener { if (on) disconnect(id) else connect(id) }
                })
            }
            binding.providersList.addView(row)
        }

        val hasPassword = providers.contains(AuthRepository.PASSWORD)
        binding.passwordTitle.text = if (hasPassword) "Change password" else "Add a password"
        binding.currentPasswordLayout.visibility = if (hasPassword) View.VISIBLE else View.GONE
        binding.changePasswordButton.text = if (hasPassword) "Change password" else "Add password"

        val phone = auth.phoneNumber()
        binding.phoneText.text = if (phone.isEmpty()) "Not added" else AccountRules.formatPhone(phone)
        binding.removePhoneButton.visibility = if (phone.isEmpty()) View.GONE else View.VISIBLE
        resetPhoneForm()
    }

    private fun connect(providerId: String) {
        repo.auth().linkProvider(this, providerId, securityResult("${label(providerId)} connected."))
    }

    private fun disconnect(providerId: String) {
        repo.auth().unlinkProvider(providerId, securityResult("${label(providerId)} disconnected."))
    }

    private fun label(providerId: String) = if (providerId == AuthRepository.GOOGLE) "Google" else "Apple"

    private fun securityResult(success: String) = object : FittmmRepository.Done {
        override fun onSuccess() {
            if (isDestroyed) return
            bindSecurity()
            note(binding.passwordMessage, success, ok = true)
        }

        override fun onError(message: String) {
            if (!isDestroyed && message.isNotEmpty()) note(binding.passwordMessage, message, ok = false)
        }
    }

    private fun changePassword() {
        val current = binding.currentPasswordInput.text?.toString().orEmpty()
        val next = binding.newPasswordInput.text?.toString().orEmpty()
        if (next != binding.confirmPasswordInput.text?.toString().orEmpty()) {
            return note(binding.passwordMessage, "Passwords do not match.", ok = false)
        }
        AccountRules.passwordProblem(next)?.let { return note(binding.passwordMessage, it, ok = false) }
        val hasPassword = repo.auth().providers().contains(AuthRepository.PASSWORD)
        if (hasPassword && current.isEmpty()) {
            return note(binding.passwordMessage, "Enter your current password.", ok = false)
        }
        binding.changePasswordButton.isEnabled = false
        repo.auth().changePassword(current, next, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                binding.changePasswordButton.isEnabled = true
                listOf(binding.currentPasswordInput, binding.newPasswordInput, binding.confirmPasswordInput)
                    .forEach { it.setText("") }
                bindSecurity()
                note(binding.passwordMessage,
                    if (hasPassword) "Password changed." else "Password added. You can now log in with your email too.",
                    ok = true)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.changePasswordButton.isEnabled = true
                note(binding.passwordMessage, message, ok = false)
            }
        })
    }

    private fun resetPhoneForm() {
        verificationId = ""
        binding.phoneLayout.hint = "Phone number, like +1 555 123 4567"
        binding.phoneInput.inputType = InputType.TYPE_CLASS_PHONE
        binding.phoneInput.setText("")
        binding.phoneButton.text = if (repo.auth().phoneNumber().isEmpty()) "Text me a code" else "Change number"
    }

    private fun phoneAction() {
        val value = binding.phoneInput.text?.toString()?.trim().orEmpty()
        if (verificationId.isEmpty()) {
            val e164 = AccountRules.normalizePhone(value)
                ?: return note(binding.phoneMessage, "Enter a full phone number, like +1 555 123 4567.", ok = false)
            binding.phoneButton.isEnabled = false
            repo.auth().sendPhoneCode(this, e164, object : AuthRepository.CodeSent {
                override fun onCodeSent(verificationId: String) {
                    if (isDestroyed) return
                    binding.phoneButton.isEnabled = true
                    this@SettingsActivity.verificationId = verificationId
                    binding.phoneLayout.hint = "6-digit code"
                    binding.phoneInput.inputType = InputType.TYPE_CLASS_NUMBER
                    binding.phoneInput.setText("")
                    binding.phoneButton.text = "Verify"
                    note(binding.phoneMessage, "We texted a code to ${AccountRules.formatPhone(e164)}.", ok = true)
                }

                override fun onVerified(credential: PhoneAuthCredential) {
                    if (!isDestroyed) linkPhone(credential)
                }

                override fun onError(message: String) {
                    if (isDestroyed) return
                    binding.phoneButton.isEnabled = true
                    note(binding.phoneMessage, message, ok = false)
                }
            })
        } else {
            if (!Regex("^\\d{6}$").matches(value)) {
                return note(binding.phoneMessage, "Enter the 6-digit code from the text message.", ok = false)
            }
            linkPhone(AuthRepository.codeCredential(verificationId, value))
        }
    }

    private fun linkPhone(credential: PhoneAuthCredential) {
        binding.phoneButton.isEnabled = false
        repo.auth().linkPhone(credential, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                binding.phoneButton.isEnabled = true
                bindSecurity()
                note(binding.phoneMessage,
                    "Recovery phone set to ${AccountRules.formatPhone(repo.auth().phoneNumber())}.", ok = true)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.phoneButton.isEnabled = true
                note(binding.phoneMessage, message, ok = false)
            }
        })
    }

    private fun removePhone() {
        repo.auth().unlinkProvider(AuthRepository.PHONE, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                bindSecurity()
                note(binding.phoneMessage, "Recovery phone removed.", ok = true)
            }

            override fun onError(message: String) {
                if (!isDestroyed) note(binding.phoneMessage, message, ok = false)
            }
        })
    }

    // ---------- Appearance and data ----------

    private fun refreshThemeLabel() {
        val night = getSharedPreferences(FittmmApp.PREFS, MODE_PRIVATE).getBoolean(FittmmApp.NIGHT, false)
        binding.themeButton.text = if (night) "Use light theme" else "Use dark theme"
    }

    private fun toggleTheme() {
        val prefs = getSharedPreferences(FittmmApp.PREFS, MODE_PRIVATE)
        val night = prefs.getBoolean(FittmmApp.NIGHT, false)
        prefs.edit().putBoolean(FittmmApp.NIGHT, !night).apply()
        AppCompatDelegate.setDefaultNightMode(
            if (night) AppCompatDelegate.MODE_NIGHT_NO else AppCompatDelegate.MODE_NIGHT_YES
        )
    }

    private fun confirmWipe() {
        MaterialAlertDialogBuilder(this)
            .setTitle("Remove all data?")
            .setMessage("This can't be undone. Your plan, workout history, custom exercises and weigh-ins will be deleted.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Remove all data") { _, _ ->
                repo.wipeUserData(object : FittmmRepository.Done {
                    override fun onSuccess() {
                        if (!isDestroyed) loadProfile()
                    }

                    override fun onError(message: String) {
                        if (!isDestroyed) alert(message)
                    }
                })
            }
            .show()
    }

    private fun confirmDelete() {
        val hasPassword = repo.auth().providers().contains(AuthRepository.PASSWORD)
        val input = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Your password"
        }
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(8), dp(24), 0)
            if (hasPassword) addView(input)
        }
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete your account?")
            .setMessage(
                if (hasPassword) "This can't be undone. Enter your password to confirm."
                else "This can't be undone. You'll confirm with Google or Apple first."
            )
            .setView(box)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Delete account") { _, _ ->
                val password = if (hasPassword) input.text?.toString().orEmpty() else null
                repo.auth().reauthenticate(this, password, object : FittmmRepository.Done {
                    override fun onSuccess() {
                        repo.deleteAccount(object : FittmmRepository.Done {
                            override fun onSuccess() {
                                if (!isDestroyed) openClearingTask(LoginActivity::class.java)
                            }

                            override fun onError(message: String) {
                                if (!isDestroyed) alert(message)
                            }
                        })
                    }

                    override fun onError(message: String) {
                        if (!isDestroyed && message.isNotEmpty()) alert(message)
                    }
                })
            }
            .show()
    }

    private fun alert(message: String) {
        MaterialAlertDialogBuilder(this).setMessage(message).setPositiveButton("OK", null).show()
    }

    private fun note(view: TextView, message: String, ok: Boolean) {
        view.text = message
        view.setTextColor(ContextCompat.getColor(this, if (ok) R.color.good else R.color.error))
        view.visibility = if (message.isEmpty()) View.GONE else View.VISIBLE
    }

    companion object {
        const val WELCOME = "welcome"
        private val GENDER_LABELS = arrayOf("Gender: not set", "Female", "Male", "Non-binary", "Prefer not to say")
        private val GENDER_VALUES = listOf("", "female", "male", "non-binary", "prefer not to say")

    }
}
