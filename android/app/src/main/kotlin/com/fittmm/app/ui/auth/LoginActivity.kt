package com.fittmm.app.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.AuthRepository
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.databinding.ActivityLoginBinding
import com.fittmm.app.ui.home.HomeActivity
import com.fittmm.app.ui.showError

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private val repo = FittmmRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!repo.isConfigured()) {
            binding.errorText.showError(FittmmRepository.NOT_CONFIGURED)
        }
        // Firebase keeps people signed in between launches
        if (repo.isSignedIn()) {
            if (repo.needsEmailVerification()) {
                openClearingTask(VerifyEmailActivity::class.java)
            } else {
                openClearingTask(HomeActivity::class.java)
            }
            return
        }

        binding.loginButton.setOnClickListener { submit() }
        binding.social.googleButton.setOnClickListener { social(AuthRepository.GOOGLE) }
        binding.social.appleButton.setOnClickListener { social(AuthRepository.APPLE) }
        binding.forgotLink.setOnClickListener {
            startActivity(Intent(this, ForgotPasswordActivity::class.java))
        }
        binding.signupLink.setOnClickListener {
            startActivity(Intent(this, SignupActivity::class.java))
        }
    }

    private fun setBusy(busy: Boolean) {
        binding.loginButton.isEnabled = !busy
        binding.social.googleButton.isEnabled = !busy
        binding.social.appleButton.isEnabled = !busy
        binding.loginButton.text = if (busy) "Logging in..." else "Log in"
    }

    private fun submit() {
        val email = binding.emailInput.text?.toString()?.trim()?.lowercase().orEmpty()
        val password = binding.passwordInput.text?.toString().orEmpty()
        if (email.isEmpty() || password.isEmpty()) {
            binding.errorText.showError("Please enter email and password.")
            return
        }
        binding.errorText.showError(null)
        setBusy(true)
        repo.signIn(email, password, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                routeAfterSignIn(repo)
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
}
