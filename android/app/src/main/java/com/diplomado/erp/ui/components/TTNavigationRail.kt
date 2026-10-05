package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
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
        containerColor = FaiPrimary,
        header = {
            FaiLogoIcon(size = 38.dp, modifier = Modifier.padding(vertical = 8.dp))
        }
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route

            NavigationRailItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(imageVector = item.icon, contentDescription = item.title) },
                label = { faiNavLabel(item.title, selected) },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = FaiPrimaryDark,
                    unselectedIconColor = FaiCream.copy(alpha = 0.75f),
                    indicatorColor = FaiSage
                )
            )
        }
    }
}
