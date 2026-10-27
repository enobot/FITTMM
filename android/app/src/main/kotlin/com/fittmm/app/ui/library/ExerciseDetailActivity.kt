package com.fittmm.app.ui.library

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import coil.load
import com.fittmm.app.R
import com.fittmm.app.data.Catalog
import com.fittmm.app.data.ExerciseDetail
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.databinding.ActivityExerciseDetailBinding
import com.fittmm.app.ui.dp
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.showError
import com.fittmm.app.ui.wireBack
import java.text.NumberFormat
import java.util.Locale

/** Photos, tutorial videos to pick from, steps, form pointers and muscles for one exercise. */
class ExerciseDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityExerciseDetailBinding
    private val repo = FittmmRepository()
    private var searchUrl = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityExerciseDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) return
        binding.backBar.screenTitle.text = "Exercise"
        wireBack(binding.backBar.backButton)
        val id = intent.getLongExtra(ID, -1)
        binding.videoSearchButton.setOnClickListener { search() }
        binding.youtubeButton.setOnClickListener { if (searchUrl.isNotEmpty()) open(searchUrl) }
        binding.youtubeButton.visibility = View.GONE
        if (id < 0) {
            binding.errorText.showError("That exercise doesn't exist.")
            return
        }
        load(id)
    }

    private fun load(id: Long) {
        repo.loadExerciseDetail(id, object : FittmmRepository.ValueCallback<ExerciseDetail> {
            override fun onSuccess(value: ExerciseDetail?) {
                if (isDestroyed || value == null) return
                bind(value)
                loadVideos(id)
            }

            override fun onError(message: String) {
                if (!isDestroyed) binding.errorText.showError(message)
            }
        })
    }

    private fun bind(detail: ExerciseDetail) {
        val ex = detail.exercise
        binding.titleText.text = ex.name
        binding.tagsText.text = listOf(ex.bodyPart, ex.equipment, ex.level, ex.category)
            .filter { it.isNotEmpty() }
            .joinToString(", ") { Catalog.label(it) }
        val images = ex.images.ifEmpty { listOfNotNull(ex.image.takeIf { it.isNotEmpty() }) }
        binding.photoStart.visibility = if (images.isEmpty()) View.GONE else View.VISIBLE
        binding.photoEnd.visibility = if (images.size < 2) View.GONE else View.VISIBLE
        images.getOrNull(0)?.let { binding.photoStart.load(it) { crossfade(true) } }
        images.getOrNull(1)?.let { binding.photoEnd.load(it) { crossfade(true) } }

        // The steps really are a sequence, so they're numbered; pointers aren't
        binding.stepsText.text = detail.instructions.mapIndexed { i, step -> "${i + 1}. $step" }.joinToString("\n\n")
        binding.tipsText.text = detail.tips.joinToString("\n\n") { "• $it" }
        val muscles = buildString {
            if (ex.primaryMuscles.isNotEmpty()) append("Main: ").append(ex.primaryMuscles.joinToString(", ") { Catalog.label(it) })
            if (detail.secondaryMuscles.isNotEmpty()) {
                if (isNotEmpty()) append("\n")
                append("Also: ").append(detail.secondaryMuscles.joinToString(", ") { Catalog.label(it) })
            }
        }
        binding.musclesText.text = muscles
        listOf(binding.stepsTitle to detail.instructions, binding.tipsTitle to detail.tips).forEach { (title, list) ->
            title.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
        }
        binding.musclesTitle.visibility = if (muscles.isEmpty()) View.GONE else View.VISIBLE
        binding.videoQuery.setText(detail.videoQuery)
    }

    private fun loadVideos(id: Long) {
        binding.videoStatus.text = "Finding tutorial videos..."
        repo.loadExerciseVideos(id, videosCallback())
    }

    private fun search() {
        val query = binding.videoQuery.text?.toString()?.trim().orEmpty()
        if (query.length < 2) return
        binding.videoStatus.text = "Searching..."
        repo.searchVideos(query, videosCallback())
    }

    private fun videosCallback() = object : FittmmRepository.ValueCallback<ExerciseDetail.VideoSearch> {
        override fun onSuccess(value: ExerciseDetail.VideoSearch?) {
            if (!isDestroyed && value != null) bindVideos(value)
        }

        override fun onError(message: String) {
            if (!isDestroyed) binding.videoStatus.text = message
        }
    }

    private fun bindVideos(result: ExerciseDetail.VideoSearch) {
        searchUrl = result.searchUrl
        binding.youtubeButton.visibility = if (searchUrl.isEmpty()) View.GONE else View.VISIBLE
        binding.videoList.removeAllViews()
        binding.videoSearchRow.visibility = if (result.configured) View.VISIBLE else View.GONE
        when {
            !result.configured -> {
                binding.videoStatus.text = "Video picks aren't set up on this server yet."
                binding.youtubeButton.text = "Search YouTube for this exercise"
            }
            result.videos.isEmpty() -> {
                binding.videoStatus.text = result.error.ifEmpty { "No videos found. Try different words." }
            }
            else -> {
                binding.videoStatus.text = result.error.ifEmpty { "Pick a video. It opens in YouTube." }
                binding.youtubeButton.text = "See all results on YouTube"
                result.videos.forEach { binding.videoList.addView(videoRow(it)) }
            }
        }
    }

    private fun videoRow(video: ExerciseDetail.Video): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(8), 0, dp(8))
            isClickable = true
            isFocusable = true
            setBackgroundResource(android.R.drawable.list_selector_background)
            contentDescription = "Play ${video.title} on YouTube"
            setOnClickListener { open(video.watchUrl()) }
        }
        row.addView(ImageView(this).apply {
            layoutParams = LinearLayout.LayoutParams(dp(128), dp(72))
            scaleType = ImageView.ScaleType.CENTER_CROP
            load(video.thumbnail) { crossfade(true) }
        })
        val meta = mutableListOf(video.channel)
        if (video.durationSeconds >= 0) meta.add(duration(video.durationSeconds))
        if (video.viewCount >= 0) meta.add("${compact(video.viewCount)} views")
        row.addView(TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(12)
            }
            text = "${video.title}\n${meta.joinToString(", ")}"
            maxLines = 4
            setTextColor(ContextCompat.getColor(context, R.color.text))
        })
        return row
    }

    private fun open(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (missing: ActivityNotFoundException) {
            binding.videoStatus.text = "No app on this phone can open YouTube links."
        }
    }

    private fun duration(seconds: Int): String {
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        val s = seconds % 60
        return if (h > 0) String.format(Locale.US, "%d:%02d:%02d", h, m, s)
        else String.format(Locale.US, "%d:%02d", m, s)
    }

    private fun compact(n: Long): String = when {
        n >= 1_000_000 -> String.format(Locale.US, "%.1fM", n / 1_000_000.0)
        n >= 1_000 -> String.format(Locale.US, "%.1fK", n / 1_000.0)
        else -> NumberFormat.getIntegerInstance(Locale.US).format(n)
    }

    companion object {
        const val ID = "exercise_id"
    }
}
