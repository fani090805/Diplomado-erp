package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.TecodeAccent
import com.diplomado.erp.ui.theme.TecodeTextMuted

@Composable
fun TTLoading(
    text: String = "Cargando datos...",
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(
            color = TecodeAccent,
            strokeWidth = 3.dp
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = text,
            fontSize = 13.sp,
            color = TecodeTextMuted
        )
    }
}
