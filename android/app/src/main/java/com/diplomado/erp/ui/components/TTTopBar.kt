package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
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
    val userEmail = TokenStorage.getUserEmail()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp)
            .background(TecodeSurface)
            .border(width = 0.5.dp, color = TecodeBorder)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        TecodeLogo(isLarge = false, showTagline = true)

        Row(verticalAlignment = Alignment.CenterVertically) {
            // Company Pill
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(100.dp))
                    .background(TecodeCard)
                    .border(1.dp, TecodeBorder, RoundedCornerShape(100.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(
                    text = if (branchName.isNotEmpty()) "$companyName · $branchName" else companyName,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TecodeAccent
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Logout Button
            IconButton(
                onClick = onLogoutClick,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(TecodeError.copy(alpha = 0.15f))
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                    contentDescription = "Cerrar sesión",
                    tint = TecodeError,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
