package com.diplomado.erp.ui.components

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.ui.theme.*

@Composable
fun TTNavigationRail(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val allItems = listOf(
        NavItem.Dashboard,
        NavItem.Products,
        NavItem.Stock,
        NavItem.Purchases,
        NavItem.Sales,
        NavItem.Finance,
        NavItem.More
    )

    val items = allItems.filter { item ->
        item.permission == null || PermissionChecker.hasPermission(item.permission)
    }

    NavigationRail(
        modifier = modifier,
        containerColor = TecodeSurface,
        header = {
            TecodeLogoIcon(sizeDp = 38)
        }
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route

            NavigationRailItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title,
                        tint = if (selected) TecodeAccent else TecodeTextMuted
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        fontSize = 10.sp,
                        color = if (selected) TecodeAccent else TecodeTextMuted
                    )
                },
                colors = NavigationRailItemDefaults.colors(
                    indicatorColor = TecodeAccent.copy(alpha = 0.15f)
                )
            )
        }
    }
}
