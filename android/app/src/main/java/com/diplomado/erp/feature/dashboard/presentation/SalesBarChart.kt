package com.diplomado.erp.feature.dashboard.presentation

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.formatMoneyRounded
import com.diplomado.erp.ui.theme.*

data class ChartBar(val label: String, val value: Double)

/**
 * Barras verticales (Canvas): olivo con esquinas superiores redondeadas.
 * Tocar una barra la resalta y muestra su monto; tocarla de nuevo la libera.
 */
@Composable
fun SalesBarChart(bars: List<ChartBar>, modifier: Modifier = Modifier) {
    var selected by remember(bars) { mutableStateOf<Int?>(bars.lastIndex.takeIf { it >= 0 }) }
    val growth = remember(bars) { Animatable(0f) }
    LaunchedEffect(bars) { growth.animateTo(1f, tween(600, easing = FastOutSlowInEasing)) }

    val measurer = rememberTextMeasurer()
    val labelStyle = TextStyle(fontSize = 11.sp, fontFamily = FaiFontFamily, color = FaiTextMuted)
    val tooltipStyle = TextStyle(
        fontSize = 12.sp,
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.SemiBold,
        color = FaiCream
    )
    val maxValue = (bars.maxOfOrNull { it.value } ?: 0.0).coerceAtLeast(1.0)
    val summary = bars.joinToString { "${it.label}: ${formatMoneyRounded(it.value)}" }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp)
            .semantics { contentDescription = "Gráfica de ventas. $summary" }
            .pointerInput(bars) {
                detectTapGestures { offset ->
                    if (bars.isEmpty()) return@detectTapGestures
                    val slot = size.width / bars.size
                    val index = (offset.x / slot).toInt().coerceIn(0, bars.lastIndex)
                    selected = if (selected == index) null else index
                }
            }
    ) {
        if (bars.isEmpty()) return@Canvas
        val labelArea = 24.dp.toPx()
        val tooltipArea = 34.dp.toPx()
        val chartTop = tooltipArea
        val chartBottom = size.height - labelArea
        val chartHeight = chartBottom - chartTop
        val slot = size.width / bars.size
        val barWidth = (slot * 0.56f).coerceAtMost(44.dp.toPx())
        val radius = 10.dp.toPx()

        // Línea base.
        drawLine(FaiBorder, Offset(0f, chartBottom), Offset(size.width, chartBottom), strokeWidth = 1.dp.toPx())

        bars.forEachIndexed { index, bar ->
            val ratio = (bar.value / maxValue).toFloat().coerceIn(0f, 1f)
            val barHeight = (chartHeight * ratio * growth.value).coerceAtLeast(4.dp.toPx())
            val left = slot * index + (slot - barWidth) / 2f
            val top = chartBottom - barHeight
            val isSelected = selected == index
            val color = when {
                selected == null -> FaiPrimary
                isSelected -> FaiPrimary
                else -> FaiPrimary.copy(alpha = 0.28f)
            }
            val path = Path().apply {
                addRoundRect(
                    RoundRect(
                        left = left,
                        top = top,
                        right = left + barWidth,
                        bottom = chartBottom,
                        topLeftCornerRadius = CornerRadius(radius, radius),
                        topRightCornerRadius = CornerRadius(radius, radius),
                        bottomLeftCornerRadius = CornerRadius.Zero,
                        bottomRightCornerRadius = CornerRadius.Zero
                    )
                )
            }
            drawPath(path, color)

            val label = measurer.measure(bar.label, labelStyle.copy(fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal))
            drawText(
                label,
                topLeft = Offset(left + barWidth / 2f - label.size.width / 2f, chartBottom + 6.dp.toPx())
            )

            if (isSelected) {
                val text = measurer.measure(formatMoneyRounded(bar.value), tooltipStyle)
                val padH = 8.dp.toPx()
                val padV = 4.dp.toPx()
                val boxW = text.size.width + padH * 2
                val boxH = text.size.height + padV * 2
                val boxLeft = (left + barWidth / 2f - boxW / 2f).coerceIn(0f, size.width - boxW)
                val boxTop = (top - boxH - 6.dp.toPx()).coerceAtLeast(0f)
                drawRoundRect(
                    color = FaiPrimaryDark,
                    topLeft = Offset(boxLeft, boxTop),
                    size = Size(boxW, boxH),
                    cornerRadius = CornerRadius(8.dp.toPx(), 8.dp.toPx())
                )
                drawText(text, topLeft = Offset(boxLeft + padH, boxTop + padV))
            }
        }
    }
}
