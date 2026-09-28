package com.diplomado.erp.core.common.rbac

import com.diplomado.erp.core.security.TokenStorage

object PermissionChecker {

    fun hasPermission(permission: String?): Boolean {
        if (permission.isNullOrEmpty()) return true
        val userPermissions = TokenStorage.getPermissions()
        return userPermissions.contains(permission)
    }

    fun hasAnyPermission(vararg permissions: String): Boolean {
        if (permissions.isEmpty()) return true
        val userPermissions = TokenStorage.getPermissions()
        return permissions.any { userPermissions.contains(it) }
    }
}
