package com.diplomado.erp.ui.navigation

sealed class NavDestination(val route: String) {
    data object Login : NavDestination("login")
    data object Main : NavDestination("main")
    data object Dashboard : NavDestination("dashboard")
    data object Products : NavDestination("products")
    data object Stock : NavDestination("stock")
    data object Purchases : NavDestination("purchases")
    data object Sales : NavDestination("sales")
    data object Finance : NavDestination("finance")
    data object More : NavDestination("more")
}
