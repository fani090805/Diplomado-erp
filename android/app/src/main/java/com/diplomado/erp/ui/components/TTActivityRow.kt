package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.AccountTree
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Factory
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Handshake
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.Warehouse
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.ActivityItem
import com.diplomado.erp.core.common.formatRelative
import com.diplomado.erp.ui.theme.*

/** Ícono Outlined por módulo de la bitácora. */
fun moduleIcon(module: String): ImageVector = when (module) {
    "auth" -> Icons.AutoMirrored.Outlined.Login
    "sales-orders" -> Icons.Outlined.Sell
    "purchase-orders" -> Icons.Outlined.ShoppingCart
    "products" -> Icons.Outlined.Category
    "inventory" -> Icons.Outlined.Inventory2
    "warehouses" -> Icons.Outlined.Warehouse
    "customers" -> Icons.Outlined.Storefront
    "suppliers" -> Icons.Outlined.LocalShipping
    "finance" -> Icons.Outlined.AccountBalance
    "crm" -> Icons.Outlined.Handshake
    "hr" -> Icons.Outlined.Badge
    "production" -> Icons.Outlined.Factory
    "projects" -> Icons.Outlined.Apartment
    "cost-centers" -> Icons.Outlined.AccountTree
    "users" -> Icons.Outlined.Group
    "roles" -> Icons.Outlined.Security
    "branches" -> Icons.Outlined.Place
    "companies", "company-requests", "platform" -> Icons.Outlined.Business
    else -> Icons.Outlined.Description
}

@Composable
fun TTActivityRow(item: ActivityItem, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(FaiPrimaryGlow),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = moduleIcon(item.module),
                contentDescription = null,
                tint = FaiPrimary,
                modifier = Modifier.size(20.dp)
            )
        }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = item.sentence,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FaiFontFamily,
                color = FaiTextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                TTAvatar(name = item.actorName, size = 20.dp)
                Text(
                    text = item.actorName,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = FaiFontFamily,
                    color = FaiTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                val whenText = formatRelative(item.createdAt)
                if (whenText.isNotEmpty()) {
                    Text(text = "·", fontSize = 12.sp, color = FaiTextMuted)
                    Text(
                        text = whenText,
                        fontSize = 12.sp,
                        fontFamily = FaiFontFamily,
                        color = FaiTextMuted,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
