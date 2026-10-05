package com.diplomado.erp.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.SERVER_WAKING_MESSAGE
import com.diplomado.erp.ui.theme.FaiFontFamily
import com.diplomado.erp.ui.theme.FaiTextMuted
import kotlinx.coroutines.delay

/**
 * Estado de carga: skeletons con shimmer en lugar de un spinner suelto.
 * Si tarda más de 4 s (servidor dormido en Render) avisa con un mensaje amable.
 */
@Composable
fun TTLoading(
    text: String = "Cargando datos...",
    modifier: Modifier = Modifier,
    rows: Int = 5
) {
    var slow by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(4000)
        slow = true
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = text },
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AnimatedVisibility(visible = slow, enter = fadeIn()) {
            Text(
                text = SERVER_WAKING_MESSAGE,
                fontSize = 12.sp,
                fontFamily = FaiFontFamily,
                color = FaiTextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
        TTSkeletonList(count = rows)
    }
}
