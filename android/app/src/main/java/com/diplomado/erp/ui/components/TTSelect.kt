package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

/**
 * Selector de una opción (equivalente a TTSelect de la web).
 * `options`: pares valor → etiqueta visible.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TTSelect(
    value: String?,
    onValueChange: (String) -> Unit,
    options: List<Pair<String, String>>,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "Selecciona una opción",
    error: String? = null,
    required: Boolean = false,
    enabled: Boolean = true
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first == value }?.second.orEmpty()

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = if (required) "$label *" else label,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            fontFamily = FaiFontFamily,
            color = FaiTextSecondary
        )
        Spacer(modifier = Modifier.height(6.dp))
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { if (enabled) expanded = it }) {
            OutlinedTextField(
                value = selectedLabel,
                onValueChange = {},
                readOnly = true,
                enabled = enabled,
                isError = error != null,
                placeholder = { Text(placeholder, color = FaiTextMuted, fontFamily = FaiFontFamily) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                shape = FaiShapes.Control,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = FaiPrimary,
                    unfocusedBorderColor = FaiBorder,
                    errorBorderColor = FaiError,
                    focusedContainerColor = FaiSurface,
                    unfocusedContainerColor = FaiSurface,
                    focusedTextColor = FaiTextPrimary,
                    unfocusedTextColor = FaiTextPrimary
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled)
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { (optionValue, optionLabel) ->
                    DropdownMenuItem(
                        text = { Text(optionLabel, fontFamily = FaiFontFamily, color = FaiTextPrimary) },
                        onClick = {
                            onValueChange(optionValue)
                            expanded = false
                        }
                    )
                }
            }
        }
        if (error != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = error, color = FaiError, fontSize = 12.sp, fontFamily = FaiFontFamily)
        }
    }
}
