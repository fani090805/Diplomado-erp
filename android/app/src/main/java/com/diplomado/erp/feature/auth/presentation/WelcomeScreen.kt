package com.diplomado.erp.feature.auth.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

private val TRUST_ITEMS = listOf(
    "99.99%" to "Disponibilidad SLA",
    "Multi-tenant" to "Aislamiento Robusto",
    "22+" to "Módulos Integrados",
    "100%" to "Control en Tiempo Real"
)

private data class EcoModule(val title: String, val subtitle: String, val text: String)

private val ECOSYSTEM = listOf(
    EcoModule("ERP CORE", "Gestión Central & RBAC", "Control de roles, permisos finos, sucursales y auditoría inmutable de cada transacción."),
    EcoModule("INVENTARIO", "Multidepósito & Trazabilidad", "Kardex en tiempo real, alertas de stock mínimo y trazabilidad de movimientos."),
    EcoModule("FINANZAS", "Cuentas & Presupuestos", "Ingresos, gastos, presupuestos por categoría y estados financieros automáticos."),
    EcoModule("CRM", "Leads & Conversión", "Embudo de oportunidades comerciales y seguimiento de interacción con clientes."),
    EcoModule("PRODUCCIÓN", "BOM & Órdenes de Trabajo", "Explosión de insumos de materiales (BOM) y consumo directo de materias primas."),
    EcoModule("RRHH", "Gestión de Personal", "Expediente digital de empleados, departamentos y ciclos de vida de colaboradores.")
)

/** Bienvenida: la landing de la web (LandingScreen.js) adaptada a celular. */
@Composable
fun WelcomeScreen(
    onGoLogin: () -> Unit,
    onGoRegister: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(FaiBackground)
            .verticalScroll(rememberScrollState())
    ) {
        // Barra superior: marca + "Iniciar Sesión"
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(FaiPrimary)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FaiLogo(size = FaiLogoSize.Md, variant = FaiLogoVariant.Dark)
            Spacer(modifier = Modifier.weight(1f))
            TTButton(text = "Iniciar Sesión", onClick = onGoLogin, variant = TTButtonVariant.Secondary)
        }

        // Hero
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            TTBadge(status = "active", customLabel = "FAI Solution ERP")
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "FAI Solution ERP",
                fontSize = 34.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FaiFontFamily,
                color = FaiPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.semantics { heading() }
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Conectando procesos, impulsando empresas. Una plataforma integrada para operar, controlar y escalar tu negocio.",
                fontSize = 15.sp,
                fontFamily = FaiFontFamily,
                color = FaiTextSecondary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(24.dp))
            TTButton(
                text = "Crear cuenta",
                onClick = onGoRegister,
                variant = TTButtonVariant.Primary,
                modifier = Modifier.fillMaxWidth(),
                icon = { Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = FaiTextInverted) }
            )
            Spacer(modifier = Modifier.height(10.dp))
            TTButton(
                text = "Iniciar Sesión",
                onClick = onGoLogin,
                variant = TTButtonVariant.Secondary,
                modifier = Modifier.fillMaxWidth()
            )
        }

        // Indicadores de confianza (2 × 2)
        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TRUST_ITEMS.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { (number, label) ->
                        TTCard(modifier = Modifier.weight(1f)) {
                            Text(number, fontSize = 20.sp, fontWeight = FontWeight.Bold, fontFamily = FaiFontFamily, color = FaiPrimary)
                            Text(label, fontSize = 12.sp, fontFamily = FaiFontFamily, color = FaiTextMuted)
                        }
                    }
                }
            }
        }

        // Ecosistema
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("ECOSISTEMA INTEGRADO", fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FaiFontFamily, color = FaiAccent)
            Text(
                "UN ECOSISTEMA. INFINITAS FORMAS DE CRECER.",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FaiFontFamily,
                color = FaiTextPrimary,
                modifier = Modifier.semantics { heading() }
            )
            Text(
                "Módulos diseñados para sincronizarse entre sí automáticamente sin silos de información.",
                fontSize = 14.sp,
                fontFamily = FaiFontFamily,
                color = FaiTextSecondary
            )
            ECOSYSTEM.forEach { module ->
                TTCard(title = module.title, subtitle = module.subtitle) {
                    Text(module.text, fontSize = 13.sp, fontFamily = FaiFontFamily, color = FaiTextSecondary)
                }
            }
        }

        // Llamado final
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(FaiPrimary)
                .padding(horizontal = 20.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "TU NEGOCIO. UN SOLO ECOSISTEMA.",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FaiFontFamily,
                color = FaiTextInverted,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Eleva la gestión de tu empresa con la plataforma más moderna del mercado.",
                fontSize = 14.sp,
                fontFamily = FaiFontFamily,
                color = FaiTextInverted.copy(alpha = 0.8f),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))
            TTButton(text = "Comenzar Ahora", onClick = onGoRegister, variant = TTButtonVariant.Secondary, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(24.dp))
            Text("FAI Solution ERP © 2026", fontSize = 12.sp, fontFamily = FaiFontFamily, color = FaiTextInverted.copy(alpha = 0.6f))
        }
    }
}
