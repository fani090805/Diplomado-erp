package com.diplomado.erp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

enum class TTButtonVariant {
    Primary,   // Verde olivo con texto crema
    Brand,     // Alias de Primary (compatibilidad)
    Secondary, // Blanco con borde sutil y texto olivo
    Ghost,     // Transparente con texto olivo
    Danger     // Fondo terracota claro con texto de error
}

private data class ButtonStyle(
    val container: Color,
    val content: Color,
    val border: BorderStroke?
)

private fun styleFor(variant: TTButtonVariant): ButtonStyle = when (variant) {
    TTButtonVariant.Primary, TTButtonVariant.Brand ->
        ButtonStyle(FaiPrimary, FaiCream, null)
    TTButtonVariant.Secondary ->
        ButtonStyle(FaiSurface, FaiPrimary, BorderStroke(1.dp, FaiBorder))
    TTButtonVariant.Ghost ->
        ButtonStyle(Color.Transparent, FaiPrimary, null)
    TTButtonVariant.Danger ->
        ButtonStyle(FaiStatusNegativeBg, FaiError, BorderStroke(1.dp, FaiStatusNegativeBorder))
}

@Composable
fun TTButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: TTButtonVariant = TTButtonVariant.Primary,
    loading: Boolean = false,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null
) {
    val style = styleFor(variant)
    val isEnabled = enabled && !loading
    val textColor = if (isEnabled) style.content else style.content.copy(alpha = 0.7f)

    Button(
        onClick = onClick,
        modifier = modifier.height(48.dp),
        enabled = isEnabled,
        shape = FaiShapes.Control,
        border = style.border,
        elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = style.container,
            contentColor = style.content,
            disabledContainerColor = style.container.copy(alpha = 0.55f),
            disabledContentColor = textColor
        )
    ) {
        if (loading) {
            CircularProgressIndicator(
                color = style.content,
                strokeWidth = 2.dp,
                modifier = Modifier.size(20.dp)
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (icon != null) {
                    icon()
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FaiFontFamily,
                    color = textColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
