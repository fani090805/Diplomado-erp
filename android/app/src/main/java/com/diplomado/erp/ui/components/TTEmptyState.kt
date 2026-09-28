package com.diplomado.erp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    icon: String = "📂",
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TecodeCard),
        border = BorderStroke(1.dp, TecodeBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = icon, fontSize = 32.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = TecodeTextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = description,
                fontSize = 13.sp,
                color = TecodeTextMuted,
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
