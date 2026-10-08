package com.diplomado.erp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.core.network.live.LiveEvents
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.ui.theme.*

/**
 * Barra superior: fondo olivo, logo FAI (variante oscura, md) y avatar con el
 * menú de la cuenta (nombre, correo, rol, empresa, sucursal y cerrar sesión).
 */
@Composable
fun TTTopBar(
    onLogoutConfirmed: () -> Unit,
    modifier: Modifier = Modifier
) {
    val name = TokenStorage.getUserName()
    val email = TokenStorage.getUserEmail()
    val roleLabel = TokenStorage.getRoleLabel()
    val company = TokenStorage.getCompanyName()
    val branch = TokenStorage.getBranchName()

    var menuOpen by remember { mutableStateOf(false) }
    var confirmLogout by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .background(FaiPrimary)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            FaiLogo(size = FaiLogoSize.Md, variant = FaiLogoVariant.Dark)
            // Igual que la web: punto salvia "En vivo" mientras el canal está conectado.
            val live by LiveEvents.connected.collectAsState()
            if (live) TTLiveIndicator()
        }

        Box {
            TTAvatar(
                name = name.ifBlank { email },
                size = 40.dp,
                modifier = Modifier
                    .clip(CircleShape)
                    .clickable { menuOpen = true }
                    .semantics {
                        role = Role.Button
                        contentDescription = "Menú de la cuenta"
                    }
            )
            DropdownMenu(
                expanded = menuOpen,
                onDismissRequest = { menuOpen = false },
                containerColor = FaiSurface,
                shape = FaiShapes.Card,
                modifier = Modifier.widthIn(min = 260.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TTAvatar(name = name.ifBlank { email }, size = 44.dp)
                    Column {
                        Text(
                            text = name.ifBlank { "Usuario" },
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FaiFontFamily,
                            color = FaiTextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = email,
                            fontSize = 12.sp,
                            fontFamily = FaiFontFamily,
                            color = FaiTextMuted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                HorizontalDivider(color = FaiBorder)
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (roleLabel.isNotBlank()) {
                        TTIconText(Icons.Outlined.Shield, roleLabel, fontSize = 13.sp, color = FaiTextSecondary, iconTint = FaiPrimary)
                    }
                    TTIconText(Icons.Outlined.Business, company, fontSize = 13.sp, color = FaiTextSecondary, iconTint = FaiPrimary)
                    if (branch.isNotBlank()) {
                        TTIconText(Icons.Outlined.Place, branch, fontSize = 13.sp, color = FaiTextSecondary, iconTint = FaiPrimary)
                    }
                }
                HorizontalDivider(color = FaiBorder)
                DropdownMenuItem(
                    text = {
                        Text(
                            text = "Cerrar sesión",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = FaiFontFamily,
                            color = FaiError
                        )
                    },
                    leadingIcon = {
                        Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null, tint = FaiError)
                    },
                    onClick = {
                        menuOpen = false
                        confirmLogout = true
                    }
                )
            }
        }
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            containerColor = FaiSurface,
            title = {
                Text("¿Cerrar sesión?", fontFamily = FaiFontFamily, fontWeight = FontWeight.Bold, color = FaiTextPrimary)
            },
            text = {
                Text(
                    "Tendrás que volver a ingresar tu correo y contraseña para entrar.",
                    fontFamily = FaiFontFamily,
                    fontSize = 14.sp,
                    color = FaiTextSecondary
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogout = false
                    onLogoutConfirmed()
                }) {
                    Text("Cerrar sesión", fontFamily = FaiFontFamily, fontWeight = FontWeight.SemiBold, color = FaiError)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) {
                    Text("Cancelar", fontFamily = FaiFontFamily, color = FaiPrimary)
                }
            }
        )
    }
}

/** Indicador de cambios en vivo sobre la barra olivo (punto salvia + "En vivo"). */
@Composable
fun TTLiveIndicator(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.semantics { contentDescription = "Actualización en vivo activa" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(FaiSage)
        )
        Text(
            text = "En vivo",
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            fontFamily = FaiFontFamily,
            color = FaiCream
        )
    }
}
