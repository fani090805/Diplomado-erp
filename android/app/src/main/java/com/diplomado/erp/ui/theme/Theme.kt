package com.diplomado.erp.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val TecodeDarkColorScheme = darkColorScheme(
    primary = TecodeAccent,
    onPrimary = TecodeTextDark,
    primaryContainer = TecodePrimary,
    onPrimaryContainer = TecodeTextPrimary,
    secondary = TecodeInfo,
    onSecondary = TecodeTextDark,
    background = TecodeBackground,
    onBackground = TecodeTextPrimary,
    surface = TecodeSurface,
    onSurface = TecodeTextPrimary,
    surfaceVariant = TecodeCard,
    onSurfaceVariant = TecodeTextSecondary,
    outline = TecodeBorder,
    error = TecodeError,
    onError = TecodeTextPrimary
)

@Composable
fun DiplomadoERPTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = TecodeDarkColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
