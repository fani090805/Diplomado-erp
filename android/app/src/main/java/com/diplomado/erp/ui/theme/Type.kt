package com.diplomado.erp.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.diplomado.erp.R

// Poppins descargable desde Google Fonts (vía Google Play Services).
private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private val Poppins = GoogleFont("Poppins")

/**
 * Si la descarga falla (sin Play Services o sin red), Compose recurre a la
 * fuente del sistema, equivalente a FontFamily.Default.
 */
val FaiFontFamily = FontFamily(
    Font(googleFont = Poppins, fontProvider = provider, weight = FontWeight.Normal),
    Font(googleFont = Poppins, fontProvider = provider, weight = FontWeight.Medium),
    Font(googleFont = Poppins, fontProvider = provider, weight = FontWeight.SemiBold),
    Font(googleFont = Poppins, fontProvider = provider, weight = FontWeight.Bold)
)

val Typography = Typography(
    displayLarge = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        color = FaiTextPrimary
    ),
    displayMedium = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        color = FaiTextPrimary
    ),
    titleLarge = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        color = FaiTextPrimary
    ),
    titleMedium = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        color = FaiTextPrimary
    ),
    bodyLarge = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        color = FaiTextPrimary
    ),
    bodyMedium = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        color = FaiTextSecondary
    ),
    bodySmall = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        color = FaiTextMuted
    ),
    labelLarge = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FaiFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp
    )
)
