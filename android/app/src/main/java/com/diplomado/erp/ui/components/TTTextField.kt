package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun TTTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    error: String? = null,
    isPassword: Boolean = false,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true
) {
    var passwordVisible by remember { mutableStateOf(!isPassword) }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = TecodeTextSecondary,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(modifier = Modifier.height(4.dp))

        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            placeholder = { Text(text = placeholder, color = TecodeTextMuted) },
            singleLine = singleLine,
            isError = error != null,
            keyboardOptions = keyboardOptions,
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            trailingIcon = if (isPassword) {
                {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = "Mostrar contraseña",
                            tint = TecodeTextMuted
                        )
                    }
                }
            } else null,
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TecodePrimary,
                unfocusedBorderColor = TecodeBorder,
                errorBorderColor = TecodeError,
                focusedContainerColor = TecodeSurface,
                unfocusedContainerColor = TecodeSurface,
                focusedTextColor = TecodeTextPrimary,
                unfocusedTextColor = TecodeTextPrimary
            )
        )

        if (error != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = error,
                color = TecodeError,
                fontSize = 12.sp,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
