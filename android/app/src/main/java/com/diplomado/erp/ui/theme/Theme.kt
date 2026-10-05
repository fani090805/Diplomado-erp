package com.diplomado.erp.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val FaiLightColorScheme = lightColorScheme(
    primary = FaiPrimary,
    onPrimary = FaiCream,
    primaryContainer = FaiPrimaryGlow,
    onPrimaryContainer = FaiPrimaryDark,
    secondary = FaiPrimaryLight,
    onSecondary = FaiCream,
    secondaryContainer = FaiSage,
    onSecondaryContainer = FaiPrimaryDark,
    tertiary = FaiAccent,
    onTertiary = FaiCream,
    background = FaiBackground,
    onBackground = FaiTextPrimary,
    surface = FaiSurface,
    onSurface = FaiTextPrimary,
    surfaceVariant = FaiBackground,
    onSurfaceVariant = FaiTextSecondary,
    outline = FaiBorder,
    outlineVariant = FaiBorder,
    error = FaiError,
    onError = FaiCream
)

@Composable
fun FaiTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = FaiLightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            // Barras del sistema en verde olivo (igual que la barra superior e inferior) con íconos claros.
            window.statusBarColor = FaiPrimary.toArgb()
            window.navigationBarColor = FaiPrimary.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
