package com.diplomado.erp.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.R
import com.diplomado.erp.ui.theme.FaiCream
import com.diplomado.erp.ui.theme.FaiFontFamily
import com.diplomado.erp.ui.theme.FaiPrimary
import com.diplomado.erp.ui.theme.FaiShapes

enum class FaiLogoSize(
    val icon: Dp,
    val wordmark: TextUnit,
    val tagline: TextUnit,
    val tagSpacing: TextUnit
) {
    Sm(28.dp, 16.sp, 7.sp, 1.6.sp),
    Md(38.dp, 22.sp, 8.sp, 2.1.sp),
    Lg(52.dp, 30.sp, 9.sp, 2.6.sp),
    Xl(112.dp, 48.sp, 12.sp, 5.sp)
}

/** dark = sobre fondo verde (texto crema); light = sobre fondo claro (texto verde olivo). */
enum class FaiLogoVariant { Dark, Light }

@Composable
fun FaiLogoIcon(
    modifier: Modifier = Modifier,
    size: Dp = 40.dp
) {
    Image(
        painter = painterResource(R.drawable.fai_logo),
        contentDescription = "FAI Solution ERP",
        contentScale = ContentScale.Fit,
        modifier = modifier
            .size(size)
            .clip(FaiShapes.Control)
    )
}

@Composable
fun FaiLogo(
    modifier: Modifier = Modifier,
    size: FaiLogoSize = FaiLogoSize.Md,
    variant: FaiLogoVariant = FaiLogoVariant.Light,
    vertical: Boolean = false,
    showTagline: Boolean = true
) {
    val textColor = if (variant == FaiLogoVariant.Dark) FaiCream else FaiPrimary

    val wordmark: @Composable () -> Unit = {
        Column(
            horizontalAlignment = if (vertical) Alignment.CenterHorizontally else Alignment.Start
        ) {
            Text(
                text = "FAI",
                color = textColor,
                fontSize = size.wordmark,
                fontWeight = FontWeight.Bold,
                fontFamily = FaiFontFamily,
                lineHeight = size.wordmark * 1.15f
            )
            if (showTagline) {
                Text(
                    text = "SOLUTION ERP",
                    color = textColor,
                    fontSize = size.tagline,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FaiFontFamily,
                    letterSpacing = size.tagSpacing,
                    textAlign = if (vertical) TextAlign.Center else TextAlign.Start
                )
            }
        }
    }

    if (vertical) {
        Column(
            modifier = modifier,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            FaiLogoIcon(size = size.icon)
            wordmark()
        }
    } else {
        Row(
            modifier = modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            FaiLogoIcon(size = size.icon)
            wordmark()
        }
    }
}
