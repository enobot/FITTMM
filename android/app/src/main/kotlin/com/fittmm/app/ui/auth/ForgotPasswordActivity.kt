package com.fittmm.app.ui.auth

import android.os.Bundle
import android.text.InputType
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.AuthRepository
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.databinding.ActivityForgotPasswordBinding
import com.fittmm.app.logic.AccountRules
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import com.google.firebase.auth.PhoneAuthCredential

/** Reset by email link, or by a texted code to the recovery phone and then a new password. */
class ForgotPasswordActivity : AppCompatActivity() {
    private enum class Step { EMAIL, PHONE, CODE, NEW_PASSWORD, NO_PASSWORD }

    private lateinit var binding: ActivityForgotPasswordBinding
    private val repo = FittmmRepository()
    private var step = Step.EMAIL
    private var phone = ""
    private var verificationId = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.backBar.screenTitle.text = "Forgot password"
        wireBack(binding.backBar.backButton)
        binding.methodToggle.addOnButtonCheckedListener { _, id, checked ->
            if (checked && (step == Step.EMAIL || step == Step.PHONE)) {
                show(if (id == binding.phoneTab.id) Step.PHONE else Step.EMAIL)
            }
        }
        binding.actionButton.setOnClickListener { act() }
        show(Step.EMAIL)
    }

    private fun show(next: Step) {
        step = next
        binding.errorText.showError(null)
        binding.input.setText("")
        binding.confirmLayout.visibility = View.GONE
        binding.methodToggle.visibility = if (next == Step.EMAIL || next == Step.PHONE) View.VISIBLE else View.GONE
        binding.inputLayout.visibility = if (next == Step.NO_PASSWORD) View.GONE else View.VISIBLE
        binding.inputLayout.endIconMode = com.google.android.material.textfield.TextInputLayout.END_ICON_NONE
        when (next) {
            Step.EMAIL -> {
                binding.inputLayout.hint = "Email"
                binding.input.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
                binding.hintText.text = ""
                binding.actionButton.text = "Email me a reset link"
            }
            Step.PHONE -> {
                binding.inputLayout.hint = "Recovery phone"
                binding.input.inputType = InputType.TYPE_CLASS_PHONE
                binding.hintText.text = "The number you added in Settings. Message and data rates may apply."
                binding.actionButton.text = "Text me a code"
            }
            Step.CODE -> {
                binding.inputLayout.hint = "6-digit code"
                binding.input.inputType = InputType.TYPE_CLASS_NUMBER
                binding.hintText.text = "We texted a code to ${AccountRules.formatPhone(phone)}."
                binding.actionButton.text = "Verify code"
            }
            Step.NEW_PASSWORD -> {
                binding.inputLayout.hint = "New password"
                binding.input.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                binding.inputLayout.endIconMode = com.google.android.material.textfield.TextInputLayout.END_ICON_PASSWORD_TOGGLE
                binding.confirmLayout.visibility = View.VISIBLE
                binding.hintText.text = "At least 8 characters, with a letter and a number."
                binding.actionButton.text = "Save new password"
            }
            Step.NO_PASSWORD -> {
                binding.hintText.text = "You're signed in. Your account uses Google or Apple to log in, " +
                    "so there's no password to reset."
                binding.actionButton.text = "Continue to FITTMM"
            }
        }
    }

    private fun busy(on: Boolean) {
        binding.actionButton.isEnabled = !on
    }

    private fun act() {
        binding.errorText.showError(null)
        val value = binding.input.text?.toString()?.trim().orEmpty()
        when (step) {
            Step.EMAIL -> sendEmail(value.lowercase())
            Step.PHONE -> sendCode(value)
            Step.CODE -> {
                if (!Regex("^\\d{6}$").matches(value)) {
                    binding.errorText.showError("Enter the 6-digit code from the text message.")
                    return
                }
                recover(AuthRepository.codeCredential(verificationId, value))
            }
            Step.NEW_PASSWORD -> savePassword(binding.input.text?.toString().orEmpty())
            Step.NO_PASSWORD -> routeAfterSignIn(repo)
        }
    }

    private fun sendEmail(email: String) {
        if (email.isEmpty()) {
            binding.errorText.showError("Enter the email you signed up with.")
            return
        }
        busy(true)
        repo.auth().sendPasswordReset(email, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                busy(false)
                binding.messageText.text = "If an account uses $email, a reset link is on its way. It expires in an hour."
                binding.messageText.visibility = View.VISIBLE
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                busy(false)
                binding.errorText.showError(message)
            }
        })
    }

    private fun sendCode(raw: String) {
        val e164 = AccountRules.normalizePhone(raw)
        if (e164 == null) {
            binding.errorText.showError("Enter a full phone number, like +1 555 123 4567.")
            return
        }
        phone = e164
        busy(true)
        repo.auth().sendPhoneCode(this, e164, object : AuthRepository.CodeSent {
            override fun onCodeSent(verificationId: String) {
                if (isDestroyed) return
                busy(false)
                this@ForgotPasswordActivity.verificationId = verificationId
                show(Step.CODE)
            }

            override fun onVerified(credential: PhoneAuthCredential) {
                if (!isDestroyed) recover(credential)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                busy(false)
                binding.errorText.showError(message)
            }
        })
    }

    private fun recover(credential: PhoneAuthCredential) {
        busy(true)
        repo.recoverWithPhone(credential, object : FittmmRepository.ValueCallback<Boolean> {
            override fun onSuccess(value: Boolean?) {
                if (isDestroyed) return
                busy(false)
                show(if (value == true) Step.NEW_PASSWORD else Step.NO_PASSWORD)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                busy(false)
                binding.errorText.showError(message)
            }
        })
    }

    private fun savePassword(password: String) {
        if (password != binding.confirmInput.text?.toString().orEmpty()) {
            binding.errorText.showError("Passwords do not match.")
            return
        }
        AccountRules.passwordProblem(password)?.let {
            binding.errorText.showError(it)
            return
        }
        busy(true)
        repo.auth().setNewPassword(password, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (!isDestroyed) routeAfterSignIn(repo)
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                busy(false)
                binding.errorText.showError(message)
            }
        })
    }
}
