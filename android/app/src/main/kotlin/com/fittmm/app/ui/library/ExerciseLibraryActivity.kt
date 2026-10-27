package com.fittmm.app.ui.library

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.fittmm.app.R
import com.fittmm.app.data.Catalog
import com.fittmm.app.data.Exercise
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.databinding.ActivityLibraryBinding
import com.fittmm.app.ui.requireSignedIn
import com.fittmm.app.ui.wireBack
import com.google.android.material.chip.Chip

/** Every exercise with a photo; tap one for steps, form pointers and videos. */
class ExerciseLibraryActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLibraryBinding
    private val repo = FittmmRepository()
    private var all: List<Exercise> = emptyList()
    private var part = ""
    private var query = ""
    private val adapter = LibraryAdapter { exercise ->
        startActivity(Intent(this, ExerciseDetailActivity::class.java)
            .putExtra(ExerciseDetailActivity.ID, exercise.apiId()))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLibraryBinding.inflate(layoutInflater)
        setContentView(binding.root)
        if (!requireSignedIn(repo)) return
        binding.backBar.screenTitle.text = "Exercises"
        wireBack(binding.backBar.backButton)
        binding.grid.layoutManager = GridLayoutManager(this, 2)
        binding.grid.adapter = adapter
        binding.searchInput.doAfterTextChanged {
            query = it?.toString()?.trim()?.lowercase().orEmpty()
            render()
        }
        addChip("All", "")
        Catalog.BODY_PARTS.forEach { addChip(Catalog.label(it), it) }
        load()
    }

    private fun addChip(label: String, value: String) {
        val chip = Chip(this).apply {
            text = label
            isCheckable = true
            isChecked = value == part
            setOnClickListener {
                part = value
                render()
            }
        }
        binding.partChips.addView(chip)
    }

    private fun load() {
        binding.countText.text = "Loading exercises..."
        repo.loadExercises(object : FittmmRepository.ValueCallback<List<Exercise>> {
            override fun onSuccess(value: List<Exercise>?) {
                if (isDestroyed) return
                all = value.orEmpty()
                render()
            }

            override fun onError(message: String) {
                if (!isDestroyed) binding.countText.text = message
            }
        })
    }

    private fun render() {
        val visible = all.filter {
            (query.isEmpty() || it.name.lowercase().contains(query)) &&
                (part.isEmpty() || it.bodyPart == part)
        }
        adapter.submit(visible)
        binding.countText.text = when {
            all.isEmpty() -> "No exercises yet."
            visible.isEmpty() -> "Nothing matches. Try a shorter search."
            else -> "${visible.size} exercises with photos and how-to videos"
        }
    }
}

private class LibraryAdapter(private val onOpen: (Exercise) -> Unit) :
    RecyclerView.Adapter<LibraryAdapter.Holder>() {
    private var items: List<Exercise> = emptyList()

    fun submit(list: List<Exercise>) {
        items = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_library, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val exercise = items[position]
        holder.name.text = exercise.name
        holder.tags.text = listOf(Catalog.label(exercise.bodyPart), Catalog.label(exercise.equipment))
            .filter { it.isNotEmpty() }
            .plus(if (exercise.custom) listOf("Yours") else emptyList())
            .joinToString(", ")
        if (exercise.image.isNotEmpty()) {
            holder.photo.load(exercise.image) { crossfade(true) }
        } else {
            holder.photo.setImageDrawable(null)
        }
        holder.itemView.contentDescription = exercise.name
        holder.itemView.setOnClickListener { onOpen(exercise) }
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val photo: ImageView = view.findViewById(R.id.photo)
        val name: TextView = view.findViewById(R.id.name)
        val tags: TextView = view.findViewById(R.id.tags)
    }
}
