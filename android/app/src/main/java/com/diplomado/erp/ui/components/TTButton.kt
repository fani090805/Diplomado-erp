package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

enum class TTButtonVariant {
    Primary,   // Lime #B6FF00
    Brand,     // Morado #7C3AED
    Secondary, // Card Elevated #151B28
    Ghost,     // Transparente
    Danger     // Red #EF4444
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
    val containerColor = when (variant) {
        TTButtonVariant.Primary -> TecodeAccent
        TTButtonVariant.Brand -> TecodePrimary
        TTButtonVariant.Secondary -> TecodeCardElevated
        TTButtonVariant.Ghost -> Color.Transparent
        TTButtonVariant.Danger -> TecodeError.copy(alpha = 0.2f)
    }

    val contentColor = when (variant) {
        TTButtonVariant.Primary -> TecodeTextDark
        TTButtonVariant.Brand -> TecodeTextPrimary
        TTButtonVariant.Secondary -> TecodeTextPrimary
        TTButtonVariant.Ghost -> TecodeTextSecondary
        TTButtonVariant.Danger -> TecodeError
    }

    Button(
        onClick = onClick,
        modifier = modifier.height(48.dp),
        enabled = enabled && !loading,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = containerColor.copy(alpha = 0.4f),
            disabledContentColor = contentColor.copy(alpha = 0.4f)
        )
    ) {
        if (loading) {
            CircularProgressIndicator(
                color = contentColor,
                strokeWidth = 2.dp,
                modifier = Modifier
                    .width(20.dp)
                    .height(20.dp)
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
                    fontWeight = FontWeight.Bold,
                    color = contentColor
                )
            }
        }
    }
}
