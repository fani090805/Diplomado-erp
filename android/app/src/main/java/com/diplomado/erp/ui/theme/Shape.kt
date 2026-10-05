package com.diplomado.erp.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// Esquinas FAI (espejo de frontend/src/design-system/tokens/radius.js).
object FaiShapes {
    val Card = RoundedCornerShape(16.dp)
    val CardLarge = RoundedCornerShape(20.dp)
    val Control = RoundedCornerShape(12.dp) // botones y campos
    val Pill = RoundedCornerShape(999.dp)
}

val Shapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = FaiShapes.Control,
    large = FaiShapes.Card,
    extraLarge = FaiShapes.CardLarge
)
