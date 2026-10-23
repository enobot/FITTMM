package com.fittmm.app.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
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
        if (repo.isSignedIn()) {
            openHome()
            return
        }

        binding.loginButton.setOnClickListener { submit() }
        binding.signupLink.setOnClickListener {
            startActivity(Intent(this, SignupActivity::class.java))
        }
    }

    private fun submit() {
        val email = binding.emailInput.text?.toString()?.trim()?.lowercase().orEmpty()
        val password = binding.passwordInput.text?.toString().orEmpty()
        if (email.isEmpty() || password.isEmpty()) {
            binding.errorText.showError("Please enter email and password.")
            return
        }
        binding.errorText.showError(null)
        binding.loginButton.isEnabled = false
        binding.loginButton.text = "Logging in..."
        repo.signIn(email, password, object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                openHome()
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.loginButton.isEnabled = true
                binding.loginButton.text = "Log in"
                binding.errorText.showError(message)
            }
        })
    }

    private fun openHome() {
        startActivity(Intent(this, HomeActivity::class.java))
        finish()
    }
}
