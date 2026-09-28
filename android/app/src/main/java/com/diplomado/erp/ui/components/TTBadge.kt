package com.diplomado.erp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun TTBadge(
    status: String,
    modifier: Modifier = Modifier,
    customLabel: String? = null
) {
    val color = when (status) {
        "active", "APPROVED", "WON", "POSTED", "DONE", "SUCCESS" -> TecodeAccent
        "NEW", "RELEASED", "CONTACTED" -> TecodeInfo
        "QUALIFIED" -> TecodeWarning
        "LOCKED", "REJECTED", "LOST", "FAILURE" -> TecodeError
        else -> TecodeTextMuted
    }

    val label = customLabel ?: when (status) {
        "active" -> "Activo"
        "inactive" -> "Inactivo"
        "DRAFT" -> "Borrador"
        "APPROVED" -> "Aprobado"
        "REJECTED" -> "Rechazado"
        "RELEASED" -> "Liberada"
        "DONE" -> "Finalizada"
        "CANCELLED" -> "Cancelado"
        "POSTED" -> "Registrado"
        "VOID" -> "Anulado"
        "NEW" -> "Nuevo"
        "CONTACTED" -> "Contactado"
        "QUALIFIED" -> "Calificado"
        "WON" -> "Ganado"
        "LOST" -> "Perdido"
        else -> status
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(100.dp),
        color = color.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.35f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(color, CircleShape)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}
