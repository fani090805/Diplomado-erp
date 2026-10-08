package com.diplomado.erp.ui.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.diplomado.erp.BuildConfig
import com.diplomado.erp.core.meta.AppMeta
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.live.LiveEvents
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.feature.auth.presentation.LoginScreen
import com.diplomado.erp.feature.configuration.presentation.AuditScreen
import com.diplomado.erp.feature.crm.presentation.LeadsScreen
import com.diplomado.erp.feature.dashboard.presentation.DashboardScreen
import com.diplomado.erp.feature.finance.presentation.AccountsScreen
import com.diplomado.erp.feature.hr.presentation.EmployeesScreen
import com.diplomado.erp.feature.inventory.movements.presentation.MovementsScreen
import com.diplomado.erp.feature.inventory.products.presentation.ProductsScreen
import com.diplomado.erp.feature.inventory.stock.presentation.StockScreen
import com.diplomado.erp.feature.projects.presentation.ProjectDetailScreen
import com.diplomado.erp.feature.projects.presentation.ProjectsScreen
import com.diplomado.erp.feature.purchases.presentation.PurchaseOrdersScreen
import com.diplomado.erp.feature.sales.presentation.SalesOrdersScreen
import com.diplomado.erp.feature.users.presentation.UsersScreen
import com.diplomado.erp.ui.components.TTBottomBar
import com.diplomado.erp.ui.components.TTMoreSheet
import com.diplomado.erp.ui.components.TTNavigationRail
import com.diplomado.erp.ui.components.TTTopBar
import com.diplomado.erp.ui.components.navSections
import com.diplomado.erp.ui.theme.FaiBackground
import com.diplomado.erp.ui.theme.FaiPrimary
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

private const val TRANSITION_MS = 220

@Composable
fun NavGraph(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
) {
    val startDestination = if (TokenStorage.hasValidSession()) {
        NavDestination.Main.route
    } else {
        NavDestination.Login.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
        enterTransition = { fadeIn(tween(TRANSITION_MS)) },
        exitTransition = { fadeOut(tween(TRANSITION_MS)) }
    ) {
        composable(NavDestination.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(NavDestination.Main.route) {
                        popUpTo(NavDestination.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(NavDestination.Main.route) {
            MainContainer(
                onLogout = {
                    LiveEvents.stop()
                    AppMeta.clear()
                    TokenStorage.clear()
                    navController.navigate(NavDestination.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}

@Composable
fun MainContainer(
    onLogout: () -> Unit
) {
    val innerNavController = rememberNavController()
    val navBackStackEntry by innerNavController.currentBackStackEntryAsState()
    val rawRoute = navBackStackEntry?.destination?.route ?: NavDestination.Dashboard.route
    // El detalle de una obra mantiene seleccionado "Obras".
    val currentRoute = if (rawRoute.startsWith("project_detail")) NavDestination.Projects.route else rawRoute

    // Configuración compartida (/meta) y canal en vivo mientras haya sesión.
    LaunchedEffect(Unit) {
        AppMeta.load()
        LiveEvents.start()
    }
    val meta by AppMeta.meta.collectAsState()
    val sections = remember(meta) { navSections(meta) }
    var updateDismissed by rememberSaveable { mutableStateOf(false) }
    var showMore by remember { mutableStateOf(false) }
    val isWide = LocalConfiguration.current.screenWidthDp >= 600
    val scope = rememberCoroutineScope()

    val navigateTo: (String) -> Unit = { route ->
        showMore = false
        innerNavController.navigate(route) {
            popUpTo(NavDestination.Dashboard.route) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    val logout: () -> Unit = {
        scope.launch {
            // Invalida las sesiones en el servidor (mejor esfuerzo) antes de limpiar el dispositivo.
            withTimeoutOrNull(3000) { runCatching { RetrofitClient.api.logout() } }
            onLogout()
        }
    }

    Row(modifier = Modifier.fillMaxSize()) {
        if (isWide) {
            TTNavigationRail(
                currentRoute = currentRoute,
                sections = sections,
                onNavigate = navigateTo,
                onMoreClick = { showMore = true }
            )
        }
        Scaffold(
            topBar = { TTTopBar(onLogoutConfirmed = logout) },
            bottomBar = {
                if (!isWide) {
                    TTBottomBar(
                        currentRoute = currentRoute,
                        sections = sections,
                        onNavigate = navigateTo,
                        onMoreClick = { showMore = true }
                    )
                }
            },
            containerColor = FaiBackground,
            modifier = Modifier.weight(1f)
        ) { innerPadding ->
            NavHost(
                navController = innerNavController,
                startDestination = NavDestination.Dashboard.route,
                modifier = Modifier.padding(innerPadding),
                // Fade + desplazamiento corto al cambiar de pantalla.
                enterTransition = {
                    fadeIn(tween(TRANSITION_MS)) + slideInHorizontally(tween(TRANSITION_MS)) { it / 12 }
                },
                exitTransition = { fadeOut(tween(TRANSITION_MS / 2)) },
                popEnterTransition = {
                    fadeIn(tween(TRANSITION_MS)) + slideInHorizontally(tween(TRANSITION_MS)) { -it / 12 }
                },
                popExitTransition = { fadeOut(tween(TRANSITION_MS / 2)) }
            ) {
                composable(NavDestination.Dashboard.route) {
                    DashboardScreen(onNavigate = navigateTo)
                }
                composable(NavDestination.Projects.route) {
                    ProjectsScreen(
                        onProjectClick = { projectId ->
                            innerNavController.navigate(NavDestination.ProjectDetail.createRoute(projectId))
                        }
                    )
                }
                composable(
                    route = NavDestination.ProjectDetail.route,
                    arguments = listOf(navArgument("projectId") { type = NavType.StringType })
                ) { backStackEntry ->
                    val projectId = backStackEntry.arguments?.getString("projectId") ?: ""
                    ProjectDetailScreen(
                        projectId = projectId,
                        onBackClick = { innerNavController.popBackStack() }
                    )
                }
                composable(NavDestination.Products.route) { ProductsScreen() }
                composable(NavDestination.Stock.route) { StockScreen() }
                composable(NavDestination.Movements.route) { MovementsScreen() }
                composable(NavDestination.Purchases.route) { PurchaseOrdersScreen() }
                composable(NavDestination.Sales.route) { SalesOrdersScreen() }
                composable(NavDestination.Finance.route) { AccountsScreen() }
                composable(NavDestination.Employees.route) { EmployeesScreen() }
                composable(NavDestination.Leads.route) { LeadsScreen() }
                composable(NavDestination.Users.route) { UsersScreen() }
                composable(NavDestination.Audit.route) { AuditScreen() }
            }
        }
    }

    // /meta pide una versión más nueva que la instalada.
    if (!updateDismissed && meta != null && AppMeta.needsUpdate(BuildConfig.VERSION_CODE)) {
        AlertDialog(
            onDismissRequest = { updateDismissed = true },
            title = { Text("Hay una nueva versión de FAI ERP") },
            text = { Text("Actualiza la app para usar las funciones más recientes y seguir sincronizada con la web.") },
            confirmButton = {
                TextButton(onClick = { updateDismissed = true }) { Text("Entendido", color = FaiPrimary) }
            }
        )
    }

    if (showMore) {
        TTMoreSheet(
            items = sections.more,
            currentRoute = currentRoute,
            onNavigate = navigateTo,
            onDismiss = { showMore = false }
        )
    }
}
