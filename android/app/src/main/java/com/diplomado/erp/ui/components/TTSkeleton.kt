package com.diplomado.erp.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.diplomado.erp.ui.theme.*

/** Brillo que recorre el bloque de izquierda a derecha (efecto shimmer). */
fun Modifier.shimmer(shape: Shape = FaiShapes.Control): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1100, easing = LinearEasing), RepeatMode.Restart),
        label = "shimmerProgress"
    )
    val start = -400f + 1400f * progress
    this
        .clip(shape)
        .background(
            Brush.linearGradient(
                colors = listOf(FaiBorder.copy(alpha = 0.55f), FaiCream, FaiBorder.copy(alpha = 0.55f)),
                start = Offset(start, 0f),
                end = Offset(start + 400f, 0f)
            )
        )
}

@Composable
fun TTSkeletonBlock(width: Dp? = null, height: Dp = 14.dp, modifier: Modifier = Modifier, shape: Shape = FaiShapes.Control) {
    val sized = if (width != null) modifier.width(width) else modifier.fillMaxWidth()
    Box(modifier = sized.height(height).shimmer(shape))
}

/** Tarjeta fantasma con la misma silueta que una fila de lista. */
@Composable
fun TTSkeletonCard(modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = FaiShapes.Card,
        colors = CardDefaults.cardColors(containerColor = FaiCard),
        border = BorderStroke(1.dp, FaiBorder),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(modifier = Modifier.size(40.dp).shimmer(CircleShape))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                TTSkeletonBlock(height = 14.dp, modifier = Modifier.fillMaxWidth(0.7f))
                TTSkeletonBlock(height = 12.dp, modifier = Modifier.fillMaxWidth(0.45f))
            }
            TTSkeletonBlock(width = 56.dp, height = 22.dp, shape = FaiShapes.Pill)
        }
    }
}

@Composable
fun TTSkeletonList(count: Int = 5, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TTSkeletonBlock(height = 22.dp, modifier = Modifier.fillMaxWidth(0.5f))
        TTSkeletonBlock(height = 12.dp, modifier = Modifier.fillMaxWidth(0.3f))
        Spacer(modifier = Modifier.height(4.dp))
        repeat(count) { TTSkeletonCard() }
    }
}
