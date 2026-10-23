package com.fittmm.app.ui.progress

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.fittmm.app.R
import com.fittmm.app.data.WorkoutSession

class SessionAdapter : RecyclerView.Adapter<SessionAdapter.Holder>() {
    private val items = mutableListOf<WorkoutSession>()

    fun submit(list: List<WorkoutSession>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_session, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val session = items[position]
        holder.title.text = session.title()
        holder.body.text = session.details()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.sessionTitle)
        val body: TextView = view.findViewById(R.id.sessionBody)
    }
}
