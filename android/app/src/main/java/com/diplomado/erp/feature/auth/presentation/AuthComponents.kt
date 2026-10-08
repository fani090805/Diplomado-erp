package com.diplomado.erp.feature.auth.presentation

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.FiberManualRecord
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.feature.auth.domain.passwordRequirements
import com.diplomado.erp.ui.components.FaiLogo
import com.diplomado.erp.ui.components.FaiLogoSize
import com.diplomado.erp.ui.components.FaiLogoVariant
import com.diplomado.erp.ui.components.TTButton
import com.diplomado.erp.ui.components.TTButtonVariant
import com.diplomado.erp.ui.theme.*

/**
 * Marco de las pantallas de cuenta (igual que la web en celular): franja olivo con el
 * logo FAI, que es un botón para volver a la bienvenida, y la tarjeta del formulario.
 */
@Composable
fun AuthScaffold(
    onGoBack: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(FaiBackground)
            .verticalScroll(rememberScrollState())
            .imePadding()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(FaiPrimary)
                .padding(horizontal = 24.dp, vertical = 28.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clickable(role = Role.Button, onClick = onGoBack)
                    .semantics { contentDescription = "Volver al inicio" }
                    .padding(8.dp)
            ) {
                FaiLogo(size = FaiLogoSize.Lg, variant = FaiLogoVariant.Dark, vertical = true)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "← Volver al inicio",
                    color = FaiTextInverted.copy(alpha = 0.6f),
                    fontSize = 13.sp,
                    fontFamily = FaiFontFamily
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            contentAlignment = Alignment.TopCenter
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 480.dp),
                shape = FaiShapes.CardLarge,
                colors = CardDefaults.cardColors(containerColor = FaiSurface),
                border = BorderStroke(1.dp, FaiBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp), content = content)
            }
        }
    }
}

@Composable
fun AuthTitle(title: String, subtitle: String? = null) {
    Text(
        text = title,
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FaiFontFamily,
        color = FaiTextPrimary,
        modifier = Modifier.semantics { heading() }
    )
    if (subtitle != null) {
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = subtitle, fontSize = 13.sp, fontFamily = FaiFontFamily, color = FaiTextMuted)
    }
    Spacer(modifier = Modifier.height(20.dp))
}

/** Caja de aviso: roja por defecto; ámbar (`pending`) para cuenta o empresa en revisión. */
@Composable
fun AuthNoticeBox(message: String, pending: Boolean = false) {
    val (background, border, content) = if (pending) {
        Triple(ColorTokens.WarningGlow, FaiWarning.copy(alpha = 0.25f), FaiWarning)
    } else {
        Triple(FaiStatusNegativeBg, FaiStatusNegativeBorder, FaiStatusNegativeText)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp)
            .background(background, FaiShapes.Control)
            .border(1.dp, border, FaiShapes.Control)
            .padding(12.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Outlined.ErrorOutline,
            contentDescription = if (pending) "Aviso" else "Error",
            tint = if (pending) FaiWarning else FaiError,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = message,
            color = content,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            fontFamily = FaiFontFamily
        )
    }
}

/** Requisitos de contraseña: se marcan con ✓ en salvia (successText de la web) al cumplirse. */
@Composable
fun PasswordRequirementsList(password: String) {
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.padding(top = 6.dp)
    ) {
        passwordRequirements(password).forEach { requirement ->
            val color = if (requirement.met) FaiSuccessText else FaiTextMuted
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.semantics {
                    contentDescription = "${requirement.label}: ${if (requirement.met) "cumplido" else "pendiente"}"
                }
            ) {
                Icon(
                    imageVector = if (requirement.met) Icons.Rounded.Check else Icons.Rounded.FiberManualRecord,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(if (requirement.met) 14.dp else 8.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = requirement.label, color = color, fontSize = 12.sp, fontFamily = FaiFontFamily)
            }
        }
    }
}

/** "¿No tienes cuenta? Crear cuenta" / "¿Ya tienes cuenta? Inicia sesión". */
@Composable
fun AuthLinkRow(prompt: String, action: String, onClick: () -> Unit) {
    Row(
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 12.dp)
    ) {
        Text(text = prompt, color = FaiTextMuted, fontSize = 13.sp, fontFamily = FaiFontFamily)
        Text(text = action, color = FaiPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, fontFamily = FaiFontFamily)
    }
}

/** Enlace de texto suelto ("¿Olvidaste tu contraseña?", "← Cambiar opción"). */
@Composable
fun AuthTextLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Text(
        text = text,
        color = FaiPrimary,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        fontFamily = FaiFontFamily,
        modifier = modifier
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 8.dp)
    )
}

@Composable
fun ConnectionMessage(message: String?) {
    if (message == null) return
    Text(
        text = message,
        color = FaiTextMuted,
        fontSize = 12.sp,
        fontFamily = FaiFontFamily,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp)
            .semantics { liveRegion = LiveRegionMode.Polite }
    )
}

/** Pantalla de éxito: ✓ grande, título, mensaje y un botón (como la web). */
@Composable
fun AuthSuccess(title: String, message: String, buttonText: String, onButton: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Icon(
            imageVector = Icons.Outlined.CheckCircle,
            contentDescription = null,
            tint = FaiSuccessText,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = title,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FaiFontFamily,
            color = FaiTextPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            fontSize = 14.sp,
            fontFamily = FaiFontFamily,
            color = FaiTextSecondary,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        TTButton(text = buttonText, onClick = onButton, variant = TTButtonVariant.Primary, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
fun AuthSectionTitle(text: String) {
    Text(
        text = text,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FaiFontFamily,
        color = FaiPrimary,
        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
    )
}
