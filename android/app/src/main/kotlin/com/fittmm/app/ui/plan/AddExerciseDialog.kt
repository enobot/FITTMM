package com.fittmm.app.ui.plan

import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.fittmm.app.R
import com.fittmm.app.data.Catalog
import com.fittmm.app.data.Exercise
import com.fittmm.app.data.FittmmRepository
import com.fittmm.app.ui.showError
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText

fun AppCompatActivity.showAddExerciseDialog(
    repo: FittmmRepository,
    catalog: () -> List<Exercise>,
    onAdded: (Exercise) -> Unit
) {
    val view = layoutInflater.inflate(R.layout.dialog_add_exercise, null)
    val nameInput = view.findViewById<TextInputEditText>(R.id.customNameInput)
    val spinner = view.findViewById<Spinner>(R.id.bodyPartSpinner)
    val customLayout = view.findViewById<View>(R.id.customPartLayout)
    val customInput = view.findViewById<TextInputEditText>(R.id.customPartInput)
    val error = view.findViewById<TextView>(R.id.dialogError)
    val labels = Catalog.BODY_PARTS.map { Catalog.label(it) } + "Add a body part…"
    spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
    spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>?, item: View?, position: Int, id: Long) {
            customLayout.visibility = if (position == labels.lastIndex) View.VISIBLE else View.GONE
        }

        override fun onNothingSelected(parent: AdapterView<*>?) = Unit
    }
    val dialog = MaterialAlertDialogBuilder(this)
        .setTitle("Add your own exercise")
        .setView(view)
        .setNegativeButton("Cancel", null)
        .setPositiveButton("Save", null)
        .create()
    dialog.setOnShowListener {
        dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val name = nameInput.text?.toString()?.trim().orEmpty()
            if (name.isEmpty()) {
                error.showError("Enter an exercise name.")
                return@setOnClickListener
            }
            if (catalog().any { it.name.equals(name, true) }) {
                error.showError("That exercise is already in the list.")
                return@setOnClickListener
            }
            val bodyPart = if (spinner.selectedItemPosition == labels.lastIndex) {
                customInput.text?.toString()?.trim()?.lowercase().orEmpty()
            } else {
                Catalog.BODY_PARTS[spinner.selectedItemPosition]
            }
            if (bodyPart.isEmpty()) {
                error.showError("Enter a body part.")
                return@setOnClickListener
            }
            error.showError(null)
            dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).isEnabled = false
            repo.addCustomExercise(name, bodyPart, object : FittmmRepository.ValueCallback<Exercise> {
                override fun onSuccess(value: Exercise?) {
                    if (value != null && !isDestroyed) {
                        onAdded(value)
                    }
                    dialog.dismiss()
                }

                override fun onError(message: String) {
                    if (isDestroyed) return
                    dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).isEnabled = true
                    error.showError(message)
                }
            })
        }
    }
    dialog.show()
}
