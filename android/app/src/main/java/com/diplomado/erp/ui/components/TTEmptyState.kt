package com.diplomado.erp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun TTEmptyState(
    title: String = "Sin registros",
    description: String = "No hay información disponible para mostrar.",
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Outlined.FolderOpen,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    iconTint: Color = FaiPrimary,
    iconBackground: Color = FaiPrimaryGlow,
    /** false dentro de otra tarjeta: sin borde ni margen propio. */
    bordered: Boolean = true
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(if (bordered) 16.dp else 0.dp),
        shape = FaiShapes.Card,
        colors = CardDefaults.cardColors(containerColor = FaiCard),
        border = if (bordered) BorderStroke(1.dp, FaiBorder) else null,
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(iconBackground),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(30.dp))
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FaiFontFamily,
                color = FaiTextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = description,
                fontSize = 14.sp,
                fontFamily = FaiFontFamily,
                color = FaiTextSecondary,
                textAlign = TextAlign.Center
            )
            if (actionLabel != null && onAction != null) {
                Spacer(modifier = Modifier.height(16.dp))
                TTButton(
                    text = actionLabel,
                    onClick = onAction,
                    variant = TTButtonVariant.Primary
                )
            }
        }
    }
}

/** Error de carga: mensaje amable, ícono de conexión y botón "Reintentar". */
@Composable
fun TTErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "No pudimos cargar la información"
) {
    TTEmptyState(
        title = title,
        description = message,
        modifier = modifier,
        icon = Icons.Outlined.CloudOff,
        actionLabel = "Reintentar",
        onAction = onRetry,
        iconTint = FaiStatusNegativeText,
        iconBackground = FaiStatusNegativeBg
    )
}
