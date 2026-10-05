package com.diplomado.erp.feature.dashboard.presentation

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingDown
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.network.dto.MonthTotalDto
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*
import java.util.Locale
import kotlin.math.abs

// Tendencias: verde suave al subir, terracota suave al bajar (tokens trendUp/trendDown de la web).
private val TrendUpBg = FaiStatusPositiveBg
private val TrendUpText = FaiStatusPositiveText
private val TrendDownBg = FaiStatusNegativeBg
private val TrendDownText = FaiStatusNegativeText

/** % de cambio entre los dos últimos meses (igual que computeTrend de la web). */
fun computeTrend(series: List<MonthTotalDto>): Double? {
    if (series.size < 2) return null
    val previous = series[series.size - 2].total
    val current = series.last().total
    if (previous == 0.0) return null
    return (current - previous) / previous * 100.0
}

@Composable
fun TrendPill(value: Double?, modifier: Modifier = Modifier) {
    if (value == null || value.isNaN()) {
        Text(
            text = "Sin datos",
            fontSize = 11.sp,
            fontFamily = FaiFontFamily,
            fontWeight = FontWeight.Medium,
            color = FaiTextMuted,
            modifier = modifier
                .clip(FaiShapes.Pill)
                .border(1.dp, FaiBorder, FaiShapes.Pill)
                .padding(horizontal = 8.dp, vertical = 4.dp)
        )
        return
    }
    val up = value >= 0
    Row(
        modifier = modifier
            .clip(FaiShapes.Pill)
            .background(if (up) TrendUpBg else TrendDownBg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = if (up) Icons.AutoMirrored.Outlined.TrendingUp else Icons.AutoMirrored.Outlined.TrendingDown,
            contentDescription = if (up) "Sube" else "Baja",
            tint = if (up) TrendUpText else TrendDownText,
            modifier = Modifier.size(14.dp)
        )
        Text(
            text = String.format(Locale.US, "%.1f%%", abs(value)),
            fontSize = 11.sp,
            fontFamily = FaiFontFamily,
            fontWeight = FontWeight.Bold,
            color = if (up) TrendUpText else TrendDownText
        )
    }
}

@Composable
fun KpiCard(
    label: String,
    value: String?,
    detail: String,
    icon: ImageVector,
    trend: Double?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = FaiShapes.CardLarge,
        colors = CardDefaults.cardColors(containerColor = FaiSurface),
        border = BorderStroke(1.dp, FaiBorder),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = label.uppercase(),
                    fontSize = 11.sp,
                    letterSpacing = 0.6.sp,
                    fontFamily = FaiFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = FaiTextMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Box(
                    modifier = Modifier.size(32.dp).clip(CircleShape).background(FaiPrimaryGlow),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = FaiPrimary, modifier = Modifier.size(16.dp))
                }
            }
            if (value == null) {
                Text(
                    text = "Sin datos aún",
                    fontSize = 14.sp,
                    fontFamily = FaiFontFamily,
                    fontWeight = FontWeight.Medium,
                    color = FaiTextMuted
                )
            } else {
                Text(
                    text = value,
                    fontSize = if (value.length > 11) 17.sp else 20.sp,
                    fontFamily = FaiFontFamily,
                    fontWeight = FontWeight.Bold,
                    color = FaiTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                text = detail,
                fontSize = 12.sp,
                fontFamily = FaiFontFamily,
                color = FaiTextMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            TrendPill(value = if (value == null) null else trend)
        }
    }
}

/** Control segmentado Mensual / Semanal / Anual (activo: olivo con texto crema). */
@Composable
fun RangeSegmentedControl(selected: SalesRange, onSelect: (SalesRange) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(FaiBackground)
            .border(1.dp, FaiBorder, RoundedCornerShape(14.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        SalesRange.entries.forEach { option ->
            val active = option == selected
            val bg by animateColorAsState(if (active) FaiPrimary else FaiBackground, label = "segmentBg")
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(bg)
                    .semantics {
                        role = Role.Tab
                        this.selected = active
                    }
                    .clickable { onSelect(option) },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = option.label,
                    fontSize = 12.sp,
                    fontFamily = FaiFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = if (active) FaiCream else FaiTextSecondary
                )
            }
        }
    }
}

@Composable
fun OperationalStatusCard() {
    TTCard(title = "Estado operativo") {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            StatusRow(Icons.Outlined.Apartment, "Obras y centros de costo") { TTBadge(status = "IN_PROGRESS") }
            StatusRow(Icons.Outlined.Inventory2, "Inventario y almacenes") { TTBadge(status = "active", customLabel = "Óptimo") }
            StatusRow(Icons.Outlined.Security, "Multiempresa y seguridad RBAC") { TTBadge(status = "POSTED", customLabel = "Protegido") }
        }
    }
}

@Composable
private fun StatusRow(icon: ImageVector, text: String, badge: @Composable () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        TTIconText(
            icon = icon,
            text = text,
            fontSize = 13.sp,
            color = FaiTextPrimary,
            iconTint = FaiPrimaryLight,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        badge()
    }
}

/** Esqueleto con la silueta del Dashboard mientras carga. */
@Composable
fun DashboardSkeleton(columns: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        TTSkeletonBlock(height = 26.dp, modifier = Modifier.fillMaxWidth(0.55f))
        TTSkeletonBlock(height = 12.dp, modifier = Modifier.fillMaxWidth(0.4f))
        repeat(if (columns >= 4) 1 else 2) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(if (columns >= 4) 4 else 2) {
                    Box(modifier = Modifier.weight(1f).height(140.dp).shimmer(FaiShapes.CardLarge))
                }
            }
        }
        Box(modifier = Modifier.fillMaxWidth().height(300.dp).shimmer(FaiShapes.CardLarge))
        TTSkeletonCard()
        TTSkeletonCard()
    }
}
