package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun <T> TTDataTable(
    title: String,
    items: List<T>,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    loading: Boolean = false,
    error: String? = null,
    searchQuery: String = "",
    onSearchChange: ((String) -> Unit)? = null,
    onCreateClick: (() -> Unit)? = null,
    createLabel: String = "Nuevo",
    emptyText: String = "Sin registros para mostrar.",
    itemContent: @Composable (T) -> Unit
) {
    Column(modifier = modifier.fillMaxSize()) {
        // Header Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = FaiTextPrimary
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        fontSize = 13.sp,
                        color = FaiTextMuted
                    )
                }
            }

            if (onCreateClick != null) {
                TTButton(
                    text = "+ $createLabel",
                    onClick = onCreateClick,
                    variant = TTButtonVariant.Primary
                )
            }
        }

        // Search Field
        if (onSearchChange != null) {
            TTTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                label = "",
                placeholder = "Buscar registros...",
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        // Error message
        if (error != null) {
            TTCard(
                modifier = Modifier.padding(bottom = 12.dp),
                title = "Error",
                subtitle = error
            ) {}
        }

        // List / Body
        if (loading) {
            TTLoading()
        } else if (items.isEmpty()) {
            TTEmptyState(description = emptyText)
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(items) { item ->
                    itemContent(item)
                }
            }
        }
    }
}
