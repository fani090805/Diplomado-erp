package com.diplomado.erp.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.ui.theme.*

sealed class NavItem(val route: String, val title: String, val icon: ImageVector, val permission: String?) {
    data object Dashboard : NavItem("dashboard", "Inicio", Icons.Outlined.Dashboard, null)
    data object Projects : NavItem("projects", "Obras", Icons.Outlined.Apartment, "projects.read")
    data object Products : NavItem("products", "Productos", Icons.Outlined.Category, "products.read")
    data object Users : NavItem("users", "Usuarios", Icons.Outlined.Group, "users.read")
    data object Stock : NavItem("stock", "Existencias", Icons.Outlined.BarChart, "inventory.read")
    data object Purchases : NavItem("purchases", "Compras", Icons.Outlined.ShoppingCart, "purchases.read")
    data object Sales : NavItem("sales", "Ventas", Icons.Outlined.LocalOffer, "sales.orders.read")
    data object Finance : NavItem("finance", "Finanzas", Icons.Outlined.AccountBalance, "finance.accounts.read")
    data object More : NavItem("more", "Menú", Icons.Outlined.Menu, null)
}

/** Colores compartidos por la barra inferior y el rail: fondo olivo, íconos crema, activo salvia. */
@Composable
internal fun faiNavLabel(title: String, selected: Boolean) {
    Text(
        text = title,
        fontSize = 10.sp,
        fontFamily = FaiFontFamily,
        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        color = if (selected) FaiCream else FaiCream.copy(alpha = 0.7f)
    )
}

@Composable
fun TTBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val allItems = listOf(
        NavItem.Dashboard,
        NavItem.Projects,
        NavItem.Products,
        NavItem.Users,
        NavItem.Purchases,
        NavItem.Finance,
        NavItem.More
    )

    val items = allItems.filter { item ->
        item.permission == null || PermissionChecker.hasPermission(item.permission)
    }.take(5) // Máximo 5 ítems en BottomBar

    NavigationBar(
        modifier = modifier,
        containerColor = FaiPrimary,
        tonalElevation = 0.dp
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route

            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(imageVector = item.icon, contentDescription = item.title) },
                label = { faiNavLabel(item.title, selected) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = FaiPrimaryDark,
                    unselectedIconColor = FaiCream.copy(alpha = 0.75f),
                    indicatorColor = FaiSage
                )
            )
        }
    }
}
