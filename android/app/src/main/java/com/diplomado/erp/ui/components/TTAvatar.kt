package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.initialsOf
import com.diplomado.erp.ui.theme.FaiFontFamily
import com.diplomado.erp.ui.theme.FaiPrimary
import com.diplomado.erp.ui.theme.FaiSage

/** Avatar circular con iniciales (por defecto: fondo salvia, texto olivo). */
@Composable
fun TTAvatar(
    name: String?,
    modifier: Modifier = Modifier,
    size: Dp = 36.dp,
    background: Color = FaiSage,
    contentColor: Color = FaiPrimary
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(background),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = initialsOf(name),
            color = contentColor,
            fontFamily = FaiFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = (size.value * 0.38f).sp
        )
    }
}
