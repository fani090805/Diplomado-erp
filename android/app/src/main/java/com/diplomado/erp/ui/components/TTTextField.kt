package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun TTTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String = "",
    modifier: Modifier = Modifier,
    placeholder: String = "",
    error: String? = null,
    isPassword: Boolean = false,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
    /** Agrega " *" a la etiqueta, como TTInput de la web. */
    required: Boolean = false,
    /** Texto de ayuda bajo el campo (se oculta si hay error). */
    hint: String? = null,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    /** Sólo cambia cómo se VE (p. ej. UppercaseTransformation); el valor guardado no se toca. */
    visualTransformation: VisualTransformation = VisualTransformation.None
) {
    var passwordVisible by remember { mutableStateOf(!isPassword) }

    Column(modifier = modifier.fillMaxWidth()) {
        if (label.isNotEmpty()) {
            Text(
                text = if (required) "$label *" else label,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                fontFamily = FaiFontFamily,
                color = FaiTextSecondary
            )
            Spacer(modifier = Modifier.height(6.dp))
        }

        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            placeholder = { Text(text = placeholder, color = FaiTextMuted, fontFamily = FaiFontFamily) },
            singleLine = singleLine,
            isError = error != null,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = FaiTextPrimary),
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else visualTransformation,
            trailingIcon = if (isPassword) {
                {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                            contentDescription = if (passwordVisible) "Ocultar contraseña" else "Mostrar contraseña",
                            tint = FaiTextMuted
                        )
                    }
                }
            } else null,
            shape = FaiShapes.Control,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = FaiPrimary,
                unfocusedBorderColor = FaiBorder,
                disabledBorderColor = FaiBorder,
                errorBorderColor = FaiError,
                focusedContainerColor = FaiSurface,
                unfocusedContainerColor = FaiSurface,
                disabledContainerColor = FaiBackground,
                errorContainerColor = FaiSurface,
                focusedTextColor = FaiTextPrimary,
                unfocusedTextColor = FaiTextPrimary,
                cursorColor = FaiPrimary
            )
        )

        if (error != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = error,
                color = FaiError,
                fontSize = 12.sp,
                fontFamily = FaiFontFamily
            )
        } else if (hint != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = hint,
                color = FaiTextMuted,
                fontSize = 12.sp,
                fontFamily = FaiFontFamily
            )
        }
    }
}

/**
 * Muestra el texto en MAYÚSCULAS sin modificar el valor (códigos de empresa, RFC).
 * Cambiar el texto dentro de onValueChange rompe la composición del teclado y se pierden letras.
 */
object UppercaseTransformation : VisualTransformation {
    override fun filter(text: androidx.compose.ui.text.AnnotatedString) =
        androidx.compose.ui.text.input.TransformedText(
            androidx.compose.ui.text.AnnotatedString(text.text.uppercase()),
            androidx.compose.ui.text.input.OffsetMapping.Identity
        )
}
