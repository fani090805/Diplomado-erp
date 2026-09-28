package com.diplomado.erp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.theme.*

@Composable
fun TTCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TecodeCard),
        border = BorderStroke(1.dp, TecodeBorder)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (title != null) {
                Text(
                    text = title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = TecodeTextPrimary
                )
                if (subtitle != null) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        fontSize = 13.sp,
                        color = TecodeTextMuted
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
            content()
        }
    }
}

@Composable
fun TTStatCard(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    trend: String? = null,
    accentColor: Color = TecodeInfo
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TecodeCard),
        border = BorderStroke(1.dp, TecodeBorder)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(accentColor)
                    .align(Alignment.TopCenter)
            )

            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = label.uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TecodeTextMuted,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = value,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TecodeTextPrimary
                )
                if (trend != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = trend,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = accentColor
                    )
                }
            }
        }
    }
}
