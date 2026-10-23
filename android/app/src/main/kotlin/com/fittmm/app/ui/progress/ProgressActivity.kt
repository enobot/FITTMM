package com.fittmm.app.ui.progress

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.data.WorkoutSession
import com.fittmm.app.databinding.ActivityProgressBinding
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.wireBack

class ProgressActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProgressBinding
    private val repo = FittmmRepository()
    private val adapter = SessionAdapter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProgressBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) {
            return
        }
        binding.backBar.screenTitle.text = "Progress"
        wireBack(binding.backBar.backButton)
        binding.sessionList.layoutManager = LinearLayoutManager(this)
        binding.sessionList.adapter = adapter
    }

    override fun onResume() {
        super.onResume()
        if (!repo.isSignedIn()) {
            return
        }
        repo.loadSessions(object : FittmmRepository.ValueCallback<List<WorkoutSession>> {
            override fun onSuccess(value: List<WorkoutSession>?) {
                if (isDestroyed) return
                val sessions = value.orEmpty()
                adapter.submit(sessions)
                binding.emptyText.visibility = if (sessions.isEmpty()) View.VISIBLE else View.GONE
            }

            override fun onError(message: String) {
                if (isDestroyed) return
                binding.emptyText.visibility = View.VISIBLE
                binding.emptyText.text = message
            }
        })
    }
}
