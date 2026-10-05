package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.ui.theme.*

@Composable
fun TTTopBar(
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val companyName = TokenStorage.getCompanyName()
    val branchName = TokenStorage.getBranchName()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp)
            .background(FaiPrimary)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        FaiLogo(size = FaiLogoSize.Sm, variant = FaiLogoVariant.Dark)

        Row(verticalAlignment = Alignment.CenterVertically) {
            // Empresa activa
            Box(
                modifier = Modifier
                    .widthIn(max = 180.dp)
                    .clip(FaiShapes.Pill)
                    .background(FaiCream.copy(alpha = 0.12f))
                    .border(1.dp, FaiSage.copy(alpha = 0.45f), FaiShapes.Pill)
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(
                    text = if (branchName.isNotEmpty()) "$companyName · $branchName" else companyName,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = FaiFontFamily,
                    color = FaiCream,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            IconButton(
                onClick = onLogoutClick,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(FaiCream.copy(alpha = 0.12f))
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.Logout,
                    contentDescription = "Cerrar sesión",
                    tint = FaiCream,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
