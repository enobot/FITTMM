package com.fittmm.app.ui

import com.fittmm.app.logic.WeightUnits
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.roundToInt

/** The API stores pounds and inches; these convert for display and input. */
object Units {
    private const val CM_PER_IN = 2.54

    fun weightUnit(metric: Boolean) = if (metric) "kg" else "lb"

    fun weightValue(lb: Double?, metric: Boolean): Double? {
        if (lb == null || lb <= 0) return null
        return WeightUnits.round1(if (metric) WeightUnits.poundsToKg(lb) else lb)
    }

    fun weightText(lb: Double?, metric: Boolean): String {
        val v = weightValue(lb, metric) ?: return "—"
        return "${WeightUnits.format(v)} ${weightUnit(metric)}"
    }

    fun toPounds(value: Double, metric: Boolean): Double =
        WeightUnits.round1(if (metric) WeightUnits.kgToPounds(value) else value)

    fun heightText(inches: Double, metric: Boolean): String {
        if (inches <= 0) return "—"
        if (metric) return "${(inches * CM_PER_IN).roundToInt()} cm"
        val total = inches.roundToInt()
        return "${total / 12} ft ${total % 12} in"
    }

    fun cmFromInches(inches: Double) = (inches * CM_PER_IN).roundToInt()

    fun inchesFromCm(cm: Double) = WeightUnits.round1(cm / CM_PER_IN)

    fun volumeText(lb: Double, metric: Boolean): String {
        val value = if (metric) WeightUnits.poundsToKg(lb) else lb
        return NumberFormat.getIntegerInstance(Locale.US).format(value.roundToInt())
    }
}
