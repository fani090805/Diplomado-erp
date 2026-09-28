package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun TecodeLogoIcon(
    sizeDp: Int = 40,
    modifier: Modifier = Modifier
) {
    val scale = sizeDp / 40f

    Box(
        modifier = modifier
            .size(sizeDp.dp)
            .background(TecodePrimary, RoundedCornerShape((sizeDp * 0.28f).dp))
            .border(1.5.dp, TecodePrimaryLight, RoundedCornerShape((sizeDp * 0.28f).dp)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width((sizeDp * 0.82f).dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "T",
                    color = TecodeTextDark,
                    fontSize = (18 * scale).sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Serif
                )
                Text(
                    text = "<>",
                    color = TecodeTextDark,
                    fontSize = (13 * scale).sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .height((3.5f * scale).dp)
                    .rotate(-6f)
                    .background(Color.White, RoundedCornerShape(2.dp))
            )
        }
    }
}

@Composable
fun TecodeLogo(
    modifier: Modifier = Modifier,
    isLarge: Boolean = false,
    showTagline: Boolean = true
) {
    val iconSize = if (isLarge) 46 else 34
    val textSize = if (isLarge) 26.sp else 20.sp

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        TecodeLogoIcon(sizeDp = iconSize)
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Tec",
                    color = TecodeTextPrimary,
                    fontSize = textSize,
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    text = "[",
                    color = TecodeTextPrimary,
                    fontSize = textSize,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "ode",
                    color = TecodeTextPrimary,
                    fontSize = textSize,
                    fontWeight = FontWeight.ExtraBold
                )
            }
            if (showTagline) {
                Text(
                    text = "ERP ENTERPRISE",
                    color = TecodeAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp
                )
            }
        }
    }
}
