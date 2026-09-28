package com.diplomado.erp.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.ui.theme.*

sealed class NavItem(val route: String, val title: String, val icon: ImageVector, val permission: String?) {
    data object Dashboard : NavItem("dashboard", "Inicio", Icons.Default.Bolt, null)
    data object Products : NavItem("products", "Productos", Icons.Default.Inventory2, "products.read")
    data object Stock : NavItem("stock", "Existencias", Icons.Default.BarChart, "inventory.read")
    data object Purchases : NavItem("purchases", "Compras", Icons.Default.ShoppingCart, "purchases.read")
    data object Sales : NavItem("sales", "Ventas", Icons.Default.LocalOffer, "sales.orders.read")
    data object Finance : NavItem("finance", "Finanzas", Icons.Default.AccountBalance, "finance.accounts.read")
    data object More : NavItem("more", "Menú", Icons.Default.Menu, null)
}

@Composable
fun TTBottomBar(
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
    }.take(5) // Máximo 5 ítems en BottomBar

    NavigationBar(
        modifier = modifier,
        containerColor = TecodeSurface,
        tonalElevation = 8.dp
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route

            NavigationBarItem(
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
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = TecodeAccent.copy(alpha = 0.15f)
                )
            )
        }
    }
}
