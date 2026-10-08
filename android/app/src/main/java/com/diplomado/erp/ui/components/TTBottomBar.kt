package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Handshake
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.core.network.dto.AppMetaDto
import com.diplomado.erp.ui.theme.*

/** Módulos navegables de la app (permiso = el mismo que usa la web para mostrarlos). */
sealed class NavItem(val route: String, val title: String, val icon: ImageVector, val permission: String?) {
    data object Dashboard : NavItem("dashboard", "Inicio", Icons.Outlined.Home, null)
    data object Sales : NavItem("sales", "Ventas", Icons.Outlined.Sell, "sales.orders.read")
    data object Stock : NavItem("stock", "Inventario", Icons.Outlined.Inventory2, "inventory.read")
    data object Purchases : NavItem("purchases", "Compras", Icons.Outlined.ShoppingCart, "purchases.read")
    data object Projects : NavItem("projects", "Obras", Icons.Outlined.Apartment, "projects.read")
    data object Products : NavItem("products", "Productos", Icons.Outlined.Category, "products.read")
    data object Movements : NavItem("movements", "Movimientos", Icons.Outlined.SwapHoriz, "inventory.read")
    data object Finance : NavItem("finance", "Finanzas", Icons.Outlined.AccountBalance, "finance.accounts.read")
    data object Employees : NavItem("employees", "RRHH", Icons.Outlined.Badge, "hr.read")
    data object Leads : NavItem("leads", "CRM", Icons.Outlined.Handshake, "crm.read")
    data object Users : NavItem("users", "Usuarios", Icons.Outlined.Group, "users.read")
    data object Audit : NavItem("audit", "Auditoría", Icons.Outlined.History, "audit.read")
}

/** Entrada del menú ya resuelta: pantalla de la app + nombre y permiso de /meta. */
data class NavEntry(val route: String, val title: String, val icon: ImageVector, val permission: String?)

/** Reparto de módulos permitidos entre la barra (4 principales) y la hoja "Más". */
data class NavSections(val primary: List<NavEntry>, val more: List<NavEntry>)

/** Módulo de /meta (id neutral, igual que en la web) → pantalla de la app. Sólo los que existen en Android. */
private val ANDROID_MODULES = mapOf(
    "dashboard" to NavItem.Dashboard,
    "sales-orders" to NavItem.Sales,
    "stock" to NavItem.Stock,
    "purchase-orders" to NavItem.Purchases,
    "projects" to NavItem.Projects,
    "products" to NavItem.Products,
    "movements" to NavItem.Movements,
    "accounts" to NavItem.Finance,
    "employees" to NavItem.Employees,
    "leads" to NavItem.Leads,
    "users" to NavItem.Users,
    "audit" to NavItem.Audit
)

private fun NavItem.toEntry() = NavEntry(route, title, icon, permission)

private val PREFERRED_PRIMARY = listOf(NavItem.Dashboard, NavItem.Sales, NavItem.Stock, NavItem.Purchases)
private val SECONDARY = listOf(
    NavItem.Projects,
    NavItem.Products,
    NavItem.Movements,
    NavItem.Finance,
    NavItem.Employees,
    NavItem.Leads,
    NavItem.Users,
    NavItem.Audit
)

/**
 * Menú desde /meta (orden, nombre corto y permiso compartidos con la web); si
 * /meta no cargó, la lista local. Siempre filtrado por los permisos del usuario.
 */
fun navSections(meta: AppMetaDto? = null): NavSections {
    val fromMeta = meta?.modules.orEmpty().mapNotNull { module ->
        ANDROID_MODULES[module.id]?.let { item ->
            NavEntry(item.route, module.shortName ?: module.name, item.icon, module.permission)
        }
    }
    val entries = fromMeta.ifEmpty { (PREFERRED_PRIMARY + SECONDARY).map { it.toEntry() } }
    val allowed = entries.filter { PermissionChecker.hasPermission(it.permission) }
    val preferred = PREFERRED_PRIMARY.map { it.route }
    val primary = (allowed.filter { it.route in preferred }.sortedBy { preferred.indexOf(it.route) } +
        allowed.filter { it.route !in preferred }).take(4)
    return NavSections(primary = primary, more = allowed.filter { it !in primary })
}

@Composable
internal fun faiNavLabel(title: String, selected: Boolean) {
    Text(
        text = title,
        fontSize = 11.sp,
        fontFamily = FaiFontFamily,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        color = if (selected) FaiCream else FaiCream.copy(alpha = 0.78f),
        maxLines = 1
    )
}

@Composable
internal fun faiNavBarColors() = NavigationBarItemDefaults.colors(
    selectedIconColor = FaiPrimaryDark,
    unselectedIconColor = FaiCream.copy(alpha = 0.78f),
    selectedTextColor = FaiCream,
    unselectedTextColor = FaiCream.copy(alpha = 0.78f),
    indicatorColor = FaiSage
)

/** Barra inferior: 4 accesos principales + "Más" (indicador pill salvia). */
@Composable
fun TTBottomBar(
    currentRoute: String,
    sections: NavSections,
    onNavigate: (String) -> Unit,
    onMoreClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(modifier = modifier, containerColor = FaiPrimary, tonalElevation = 0.dp) {
        sections.primary.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(imageVector = item.icon, contentDescription = null) },
                label = { faiNavLabel(item.title, selected) },
                colors = faiNavBarColors()
            )
        }
        if (sections.more.isNotEmpty()) {
            val selected = sections.more.any { currentRoute.startsWith(it.route) }
            NavigationBarItem(
                selected = selected,
                onClick = onMoreClick,
                icon = { Icon(imageVector = Icons.Outlined.MoreHoriz, contentDescription = null) },
                label = { faiNavLabel("Más", selected) },
                colors = faiNavBarColors()
            )
        }
    }
}

/** Hoja inferior con el resto de módulos permitidos, en cuadrícula de íconos. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TTMoreSheet(
    items: List<NavEntry>,
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val columns = if (LocalConfiguration.current.screenWidthDp >= 600) 6 else 4
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = FaiSurface,
        dragHandle = { BottomSheetDefaults.DragHandle(color = FaiBorderHover) }
    ) {
        Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 32.dp)) {
            Text(
                text = "Más módulos",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FaiFontFamily,
                color = FaiTextPrimary,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            items.chunked(columns).forEach { row ->
                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    row.forEach { item ->
                        MoreSheetTile(
                            item = item,
                            selected = currentRoute.startsWith(item.route),
                            onClick = { onNavigate(item.route) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    repeat(columns - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun MoreSheetTile(item: NavEntry, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(FaiShapes.Control)
            .clickable(onClick = onClick)
            .semantics { role = Role.Button }
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(if (selected) FaiSage else FaiPrimaryGlow),
            contentAlignment = Alignment.Center
        ) {
            Icon(item.icon, contentDescription = null, tint = FaiPrimary, modifier = Modifier.size(24.dp))
        }
        Text(
            text = item.title,
            fontSize = 12.sp,
            fontFamily = FaiFontFamily,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = FaiTextPrimary,
            textAlign = TextAlign.Center,
            maxLines = 1
        )
    }
}
