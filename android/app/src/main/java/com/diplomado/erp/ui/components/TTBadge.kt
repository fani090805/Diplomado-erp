package com.diplomado.erp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.meta.AppMeta
import com.diplomado.erp.ui.theme.*

/** Tonos del badge, iguales a la web: fondo claro, borde de 1dp, texto oscuro y punto medio. */
enum class TTBadgeTone(val background: Color, val border: Color, val text: Color, val dot: Color) {
    Positive(FaiStatusPositiveBg, FaiStatusPositiveBorder, FaiStatusPositiveText, FaiStatusPositiveDot),
    Neutral(FaiStatusNeutralBg, FaiStatusNeutralBorder, FaiStatusNeutralText, FaiStatusNeutralDot),
    Pending(FaiStatusPendingBg, FaiStatusPendingBorder, FaiStatusPendingText, FaiStatusPendingDot),
    Negative(FaiStatusNegativeBg, FaiStatusNegativeBorder, FaiStatusNegativeText, FaiStatusNegativeDot)
}

/** Tono que manda el backend (GET /meta, igual que la web); null si no viene. */
private fun metaTone(status: String): TTBadgeTone? = when (AppMeta.status(status)?.tone) {
    "positive" -> TTBadgeTone.Positive
    "pending" -> TTBadgeTone.Pending
    "negative" -> TTBadgeTone.Negative
    "neutral" -> TTBadgeTone.Neutral
    else -> null
}

/** Respaldo local si /meta no cargó (mismos valores que /meta). */
private fun toneFor(status: String): TTBadgeTone = metaTone(status) ?: when (status.uppercase()) {
    "ACTIVE", "APPROVED", "DONE", "POSTED", "WON", "SUCCESS",
    "COMPLETED", "PAID", "RECEIVED", "DELIVERED", "FINALIZADA" -> TTBadgeTone.Positive
    "PENDING", "IN_REVIEW", "IN_PROGRESS", "RELEASED", "POSTING", "PARTIAL",
    "NEW", "CONTACTED", "QUALIFIED", "EN_PROCESO", "PAUSADA" -> TTBadgeTone.Pending
    "LOCKED", "SUSPENDED", "REJECTED", "LOST", "FAILURE", "OVERDUE" -> TTBadgeTone.Negative
    else -> TTBadgeTone.Neutral // inactive, DRAFT, CANCELLED, VOID, PLANEADA, CANCELADA…
}

private fun labelFor(status: String): String = AppMeta.status(status)?.label ?: when (status.uppercase()) {
    "ACTIVE" -> "Activo"
    "INACTIVE" -> "Inactivo"
    "PENDING" -> "Pendiente"
    "LOCKED" -> "Bloqueado"
    "SUSPENDED" -> "Suspendido"
    "DRAFT" -> "Borrador"
    "IN_REVIEW" -> "En revisión"
    "APPROVED" -> "Aprobado"
    "REJECTED" -> "Rechazado"
    "RELEASED" -> "Liberada"
    "IN_PROGRESS", "EN_PROCESO" -> "En proceso"
    "DONE", "FINALIZADA" -> "Finalizada"
    "COMPLETED" -> "Completado"
    "CANCELLED" -> "Cancelado"
    "CANCELADA" -> "Cancelada"
    "POSTING" -> "Registrando"
    "PARTIAL" -> "Parcial"
    "POSTED" -> "Registrado"
    "RECEIVED" -> "Recibido"
    "DELIVERED" -> "Entregado"
    "PAID" -> "Pagado"
    "VOID" -> "Anulado"
    "OVERDUE" -> "Vencido"
    "NEW" -> "Nuevo"
    "CONTACTED" -> "Contactado"
    "QUALIFIED" -> "Calificado"
    "WON" -> "Ganado"
    "LOST" -> "Perdido"
    "PLANEADA" -> "Planeada"
    "PAUSADA" -> "Pausada"
    "SUCCESS" -> "Éxito"
    "FAILURE" -> "Fallo"
    else -> status
}

@Composable
fun TTBadge(
    status: String,
    modifier: Modifier = Modifier,
    customLabel: String? = null,
    tone: TTBadgeTone? = null
) {
    val resolved = tone ?: toneFor(status)

    Surface(
        modifier = modifier,
        shape = FaiShapes.Pill,
        color = resolved.background,
        border = BorderStroke(1.dp, resolved.border)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(resolved.dot, CircleShape)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = customLabel ?: labelFor(status),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                fontFamily = FaiFontFamily,
                color = resolved.text
            )
        }
    }
}
