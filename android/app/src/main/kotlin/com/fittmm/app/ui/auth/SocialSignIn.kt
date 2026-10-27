package com.fittmm.app.ui.auth

import androidx.appcompat.app.AppCompatActivity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.lifecycleScope
import com.fittmm.app.FittmmApp
import com.fittmm.app.data.AuthRepository
import com.fittmm.app.data.FittmmRepository
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

/**
 * "Continue with Google" and "Continue with Apple".
 *
 * Google uses Android's Credential Manager (one tap) when the app has a real
 * Firebase project. Apple, and Google against the local emulator, use
 * Firebase's browser sign-in page. onDone gets whether the account is new;
 * onError gets "" when the person simply backed out.
 */
fun AppCompatActivity.continueWith(
    providerId: String,
    repo: FittmmRepository,
    onDone: (Boolean) -> Unit,
    onError: (String) -> Unit,
) {
    val webClientId = googleWebClientId()
    if (providerId == AuthRepository.GOOGLE && webClientId != null && !FittmmApp.usingAuthEmulator) {
        lifecycleScope.launch {
            try {
                val option = GetSignInWithGoogleOption.Builder(webClientId).build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val result = CredentialManager.create(this@continueWith).getCredential(this@continueWith, request)
                val credential = result.credential
                if (credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                    repo.auth().signInWithGoogleIdToken(idToken, callback(onDone, onError))
                } else {
                    onError("Google didn't return an account. Try again.")
                }
            } catch (cancelled: GetCredentialCancellationException) {
                onError("")
            } catch (error: GetCredentialException) {
                onError(error.message ?: "Couldn't sign in with Google.")
            }
        }
        return
    }
    repo.signInWithProvider(this, providerId, callback(onDone, onError))
}

private fun callback(onDone: (Boolean) -> Unit, onError: (String) -> Unit) =
    object : FittmmRepository.ValueCallback<Boolean> {
        override fun onSuccess(value: Boolean?) = onDone(value == true)
        override fun onError(message: String) = onError(message)
    }

/** The OAuth web client ID the google-services plugin generates from google-services.json. */
private fun AppCompatActivity.googleWebClientId(): String? {
    val id = resources.getIdentifier("default_web_client_id", "string", packageName)
    return if (id == 0) null else getString(id).takeIf { it.isNotBlank() }
}
