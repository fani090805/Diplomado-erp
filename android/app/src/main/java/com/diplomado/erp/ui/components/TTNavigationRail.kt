package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.diplomado.erp.ui.theme.*

/** Navegación lateral para tablets y pantallas anchas (≥ 600 dp). */
@Composable
fun TTNavigationRail(
    currentRoute: String,
    sections: NavSections,
    onNavigate: (String) -> Unit,
    onMoreClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = NavigationRailItemDefaults.colors(
        selectedIconColor = FaiPrimaryDark,
        unselectedIconColor = FaiCream.copy(alpha = 0.78f),
        selectedTextColor = FaiCream,
        unselectedTextColor = FaiCream.copy(alpha = 0.78f),
        indicatorColor = FaiSage
    )

    NavigationRail(
        modifier = modifier,
        containerColor = FaiPrimary,
        header = { FaiLogoIcon(size = 38.dp, modifier = Modifier.padding(vertical = 8.dp)) }
    ) {
        sections.primary.forEach { item ->
            val selected = currentRoute == item.route
            NavigationRailItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(imageVector = item.icon, contentDescription = null) },
                label = { faiNavLabel(item.title, selected) },
                colors = colors
            )
        }
        if (sections.more.isNotEmpty()) {
            val selected = sections.more.any { currentRoute.startsWith(it.route) }
            NavigationRailItem(
                selected = selected,
                onClick = onMoreClick,
                icon = { Icon(imageVector = Icons.Outlined.MoreHoriz, contentDescription = null) },
                label = { faiNavLabel("Más", selected) },
                colors = colors
            )
        }
    }
}
