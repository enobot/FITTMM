package com.fittmm.app.ui.volume

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import androidx.core.content.ContextCompat
import com.fittmm.app.R

/**
 * Simple single-series bar chart: one color, rounded tops, recessive grid,
 * first and last labels on the axis. Tap a bar to see its value.
 */
class BarChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {
    data class Bar(val label: String, val value: Double, val detail: String)

    private var bars: List<Bar> = emptyList()
    private var selected = -1
    private val density = resources.displayMetrics.density
    private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ContextCompat.getColor(context, R.color.primary) }
    private val gridPaint = Paint().apply {
        color = ContextCompat.getColor(context, R.color.rule)
        strokeWidth = density
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.textSecondary)
        textSize = 12 * density
    }
    private val tipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text)
        textSize = 13 * density
        isFakeBoldText = true
    }
    private val rect = RectF()

    var onSelect: ((Bar?) -> Unit)? = null

    fun setBars(list: List<Bar>) {
        bars = list
        selected = -1
        contentDescription = list.joinToString("; ") { it.detail }
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val height = (200 * density).toInt()
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), resolveSize(height, heightMeasureSpec))
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (bars.isEmpty()) return
        val top = 24 * density
        val bottom = height - 20 * density
        val chartHeight = bottom - top
        val max = bars.maxOf { it.value }.coerceAtLeast(1.0)

        for (i in 0..2) {
            val y = bottom - chartHeight * i / 2
            canvas.drawLine(0f, y, width.toFloat(), y, gridPaint)
        }

        val slot = width.toFloat() / bars.size
        val barWidth = (slot * 0.7f).coerceAtMost(40 * density)
        val radius = 4 * density
        bars.forEachIndexed { i, bar ->
            val h = (chartHeight * (bar.value / max)).toFloat()
            val left = i * slot + (slot - barWidth) / 2
            rect.set(left, bottom - h, left + barWidth, bottom)
            barPaint.alpha = if (selected == -1 || selected == i) 255 else 110
            if (h > 0) {
                canvas.drawRoundRect(rect, radius, radius, barPaint)
                // Square off the bottom so bars sit on the baseline
                canvas.drawRect(left, bottom - minOf(h, radius), left + barWidth, bottom, barPaint)
            }
        }

        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText(bars.first().label, 0f, height - 4 * density, textPaint)
        textPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText(bars.last().label, width.toFloat(), height - 4 * density, textPaint)

        if (selected in bars.indices) {
            val tip = bars[selected].detail
            tipPaint.textAlign = Paint.Align.CENTER
            val x = (selected * slot + slot / 2).coerceIn(tipPaint.measureText(tip) / 2, width - tipPaint.measureText(tip) / 2)
            canvas.drawText(tip, x, 16 * density, tipPaint)
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (bars.isEmpty()) return false
        if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_MOVE) {
            val index = (event.x / (width.toFloat() / bars.size)).toInt().coerceIn(0, bars.size - 1)
            if (index != selected) {
                selected = index
                onSelect?.invoke(bars[index])
                invalidate()
            }
            return true
        }
        return super.onTouchEvent(event)
    }
}
