package com.fittmm.app.ui.plan

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.fittmm.app.R
import com.fittmm.app.data.Catalog
import com.fittmm.app.data.Exercise
import coil.load

class ExerciseAdapter(
    private val onToggle: (Exercise, Boolean) -> Unit
) : RecyclerView.Adapter<ExerciseAdapter.Holder>() {
    private val items = mutableListOf<Exercise>()
    private var selected: Set<String> = emptySet()

    fun submit(list: List<Exercise>, selectedNames: Collection<String>) {
        items.clear()
        items.addAll(list)
        selected = selectedNames.map { it.lowercase() }.toSet()
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_exercise, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val exercise = items[position]
        holder.name.text = exercise.name
        holder.part.text = Catalog.label(exercise.bodyPart)
        if (exercise.image.isNotEmpty()) {
            holder.photo.visibility = View.VISIBLE
            holder.photo.load(exercise.image) { crossfade(true) }
        } else {
            holder.photo.visibility = View.GONE
        }
        holder.check.setOnCheckedChangeListener(null)
        holder.check.isChecked = selected.contains(exercise.name.lowercase())
        holder.check.setOnCheckedChangeListener { _, isChecked ->
            onToggle(exercise, isChecked)
        }
        holder.itemView.setOnClickListener {
            holder.check.isChecked = !holder.check.isChecked
        }
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.exerciseName)
        val part: TextView = view.findViewById(R.id.exercisePart)
        val check: CheckBox = view.findViewById(R.id.exerciseCheck)
        val photo: ImageView = view.findViewById(R.id.exercisePhoto)
    }
}
