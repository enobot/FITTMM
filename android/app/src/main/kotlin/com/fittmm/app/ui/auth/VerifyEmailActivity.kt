package com.fittmm.app.ui.auth

import android.os.Bundle
import android.os.CountDownTimer
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.databinding.ActivityVerifyEmailBinding
import com.fittmm.app.ui.showError

/** Waits for the email link to be opened; checks again whenever the app comes back. */
class VerifyEmailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityVerifyEmailBinding
    private val repo = FittmmRepository()
    private var timer: CountDownTimer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVerifyEmailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!repo.isSignedIn()) {
            openClearingTask(LoginActivity::class.java)
            return
        }
        binding.bodyText.text = "We sent a link to ${repo.currentEmail()}. Open it on any device to confirm " +
            "your address, then come back here. Can't find it? Check your spam folder."
        binding.checkButton.setOnClickListener { check(userAsked = true) }
        binding.resendButton.setOnClickListener { resend() }
        binding.otherEmailButton.setOnClickListener {
            repo.signOut()
            // Login underneath, so Back from sign-up doesn't leave the app
            openClearingTask(LoginActivity::class.java)
            startActivity(android.content.Intent(this, SignupActivity::class.java))
        }
        startResendWait()
    }

    override fun onResume() {
        super.onResume()
        if (repo.isSignedIn()) check(userAsked = false)
    }

    override fun onDestroy() {
        timer?.cancel()
        super.onDestroy()
    }

    private fun check(userAsked: Boolean) {
        binding.errorText.showError(null)
        if (userAsked) binding.checkButton.isEnabled = false
        repo.auth().refreshVerification(object : FittmmRepository.ValueCallback<Boolean> {
            override fun onSuccess(value: Boolean?) {
                if (isDestroyed) return
                binding.checkButton.isEnabled = true
                if (value == true) {
                    routeAfterSignIn(repo)
                } else if (userAsked) {
                    binding.errorText.showError(
                        "Your email isn't verified yet. Open the link in the email we sent, then try again."
                    )
                }
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.checkButton.isEnabled = true
                if (userAsked) binding.errorText.showError(message)
            }
        })
    }

    private fun resend() {
        binding.errorText.showError(null)
        repo.auth().resendVerification(object : FittmmRepository.Done {
            override fun onSuccess() {
                if (isDestroyed) return
                binding.messageText.text = "Sent a new link to ${repo.currentEmail()}."
                binding.messageText.visibility = View.VISIBLE
                startResendWait()
            }

            override fun onError(message: String) {
                if (!isDestroyed) binding.errorText.showError(message)
            }
        })
    }

    private fun startResendWait() {
        timer?.cancel()
        binding.resendButton.isEnabled = false
        timer = object : CountDownTimer(60_000, 1_000) {
            override fun onTick(left: Long) {
                binding.resendButton.text = "Resend in ${left / 1000}s"
            }

            override fun onFinish() {
                binding.resendButton.isEnabled = true
                binding.resendButton.text = "Resend email"
            }
        }.start()
    }
}
