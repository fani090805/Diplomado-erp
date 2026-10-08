package com.diplomado.erp.feature.auth.presentation

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.feature.auth.domain.INDUSTRY_OPTIONS
import com.diplomado.erp.ui.components.TTButton
import com.diplomado.erp.ui.components.TTButtonVariant
import com.diplomado.erp.ui.components.TTSelect
import com.diplomado.erp.ui.components.TTTextField
import com.diplomado.erp.ui.components.UppercaseTransformation
import com.diplomado.erp.ui.theme.*

private data class RegisterOption(val mode: RegisterMode, val icon: ImageVector, val title: String, val description: String)

private val REGISTER_OPTIONS = listOf(
    RegisterOption(RegisterMode.Company, Icons.Outlined.Business, "Registrar mi empresa", "Soy el dueño o encargado y quiero usar FAI en mi negocio."),
    RegisterOption(RegisterMode.Join, Icons.Outlined.Groups, "Unirme a mi empresa", "Mi empresa ya usa FAI y tengo un código.")
)

/** Crear cuenta, igual que RegisterScreen.js + CompanyRequestForm.js de la web. */
@Composable
fun RegisterScreen(
    onGoLogin: () -> Unit,
    onGoBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RegisterViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    // Atrás del sistema dentro de un formulario = "← Cambiar opción".
    BackHandler(enabled = state.mode != null && !state.succeeded && !state.loading) { viewModel.changeOption() }

    AuthScaffold(onGoBack = onGoBack, modifier = modifier) {
        when {
            state.succeeded && state.mode == RegisterMode.Join -> AuthSuccess(
                title = "¡Cuenta creada!",
                message = "Un administrador debe aprobar tu acceso. Te avisaremos cuando puedas entrar.",
                buttonText = "Ir a iniciar sesión",
                onButton = onGoLogin
            )
            state.succeeded -> AuthSuccess(
                title = "¡Solicitud enviada!",
                message = "Revisaremos los datos de tu empresa y te avisaremos por correo cuando esté lista.",
                buttonText = "Volver al inicio",
                onButton = onGoBack
            )
            state.mode == null -> ChooseOption(onChoose = viewModel::choose, onGoLogin = onGoLogin)
            else -> {
                AuthTextLink("← Cambiar opción", onClick = viewModel::changeOption)
                Spacer(modifier = Modifier.height(8.dp))
                if (state.mode == RegisterMode.Join) JoinForm(state, viewModel, onGoLogin)
                else CompanyForm(state, viewModel)
            }
        }
    }
}

@Composable
private fun ChooseOption(onChoose: (RegisterMode) -> Unit, onGoLogin: () -> Unit) {
    AuthTitle("Crear cuenta", "¿Cómo quieres empezar con FAI Solution ERP?")
    REGISTER_OPTIONS.forEach { option ->
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
                .clickable(role = Role.Button, onClickLabel = option.title) { onChoose(option.mode) },
            shape = FaiShapes.Card,
            colors = CardDefaults.cardColors(containerColor = FaiSurface),
            border = BorderStroke(1.dp, FaiBorder),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(FaiPrimaryGlow, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(option.icon, contentDescription = null, tint = FaiPrimary, modifier = Modifier.size(28.dp))
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(option.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, fontFamily = FaiFontFamily, color = FaiTextPrimary)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(option.description, fontSize = 13.sp, fontFamily = FaiFontFamily, color = FaiTextMuted)
                }
                Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = FaiTextMuted)
            }
        }
    }
    AuthLinkRow(prompt = "¿Ya tienes cuenta? ", action = "Inicia sesión", onClick = onGoLogin)
}

@Composable
private fun ColumnScope.FieldGap() = Spacer(modifier = Modifier.height(12.dp))

@Composable
private fun ColumnScope.JoinForm(state: RegisterUiState, vm: RegisterViewModel, onGoLogin: () -> Unit) {
    val form = state.join
    val errors = state.errors
    val enabled = !state.loading
    AuthTitle("Crear cuenta", "Únete al espacio de tu empresa en FAI Solution ERP")
    state.serverError?.let { AuthNoticeBox(it) }

    TTTextField(form.name, { v -> vm.updateJoin("name") { it.copy(name = v) } }, "Nombre", placeholder = "Tu nombre",
        required = true, error = errors["name"], enabled = enabled)
    FieldGap()
    TTTextField(form.lastName, { v -> vm.updateJoin("lastName") { it.copy(lastName = v) } }, "Apellido", placeholder = "Tu apellido",
        error = errors["lastName"], enabled = enabled)
    FieldGap()
    TTTextField(form.companyCode, { v -> vm.updateJoin("companyCode") { it.copy(companyCode = v) } }, "Código de empresa",
        placeholder = "FAI-XXXXXX", required = true, error = errors["companyCode"], enabled = enabled,
        hint = "Pídeselo al administrador de tu empresa",
        visualTransformation = UppercaseTransformation,
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters))
    FieldGap()
    TTTextField(form.email, { v -> vm.updateJoin("email") { it.copy(email = v) } }, "Correo electrónico", placeholder = "tu@empresa.com",
        required = true, error = errors["email"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
    FieldGap()
    TTTextField(form.password, { v -> vm.updateJoin("password") { it.copy(password = v) } }, "Contraseña", placeholder = "Crea una contraseña",
        required = true, isPassword = true, error = errors["password"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
    PasswordRequirementsList(form.password)
    FieldGap()
    TTTextField(form.confirmPassword, { v -> vm.updateJoin("confirmPassword") { it.copy(confirmPassword = v) } }, "Confirmar contraseña",
        placeholder = "Repite tu contraseña", required = true, isPassword = true, error = errors["confirmPassword"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))

    Spacer(modifier = Modifier.height(20.dp))
    TTButton("Crear cuenta", onClick = vm::submit, variant = TTButtonVariant.Primary, loading = state.loading, modifier = Modifier.fillMaxWidth())
    ConnectionMessage(state.connectionMessage)
    AuthLinkRow(prompt = "¿Ya tienes cuenta? ", action = "Inicia sesión", onClick = onGoLogin)
}

@Composable
private fun ColumnScope.CompanyForm(state: RegisterUiState, vm: RegisterViewModel) {
    val form = state.company
    val errors = state.errors
    val enabled = !state.loading
    AuthTitle("Registrar mi empresa", "Envía los datos de tu negocio; te avisaremos por correo cuando tu empresa esté lista.")
    state.serverError?.let { AuthNoticeBox(it) }

    AuthSectionTitle("Datos de tu empresa")
    TTTextField(form.companyName, { v -> vm.updateCompany("companyName") { it.copy(companyName = v) } }, "Nombre de la empresa",
        placeholder = "Ej. Ferretería El Martillo", required = true, error = errors["companyName"], enabled = enabled)
    FieldGap()
    TTTextField(form.legalName, { v -> vm.updateCompany("legalName") { it.copy(legalName = v) } }, "Razón social",
        placeholder = "Ej. El Martillo SA de CV", error = errors["legalName"], enabled = enabled)
    FieldGap()
    TTTextField(form.taxId, { v -> vm.updateCompany("taxId") { it.copy(taxId = v) } }, "RFC",
        placeholder = "XAXX010101000", error = errors["taxId"], enabled = enabled,
        visualTransformation = UppercaseTransformation,
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters))
    FieldGap()
    TTSelect(form.industry, { v -> vm.updateCompany("industry") { it.copy(industry = v) } }, INDUSTRY_OPTIONS, "Giro",
        placeholder = "Selecciona el giro", required = true, error = errors["industry"], enabled = enabled)
    FieldGap()
    TTTextField(form.phone, { v -> vm.updateCompany("phone") { it.copy(phone = v) } }, "Teléfono",
        placeholder = "10 dígitos", error = errors["phone"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
    FieldGap()
    TTTextField(form.city, { v -> vm.updateCompany("city") { it.copy(city = v) } }, "Ciudad",
        placeholder = "Ej. Puebla", error = errors["city"], enabled = enabled)

    Spacer(modifier = Modifier.height(8.dp))
    AuthSectionTitle("Tus datos (serás el administrador)")
    TTTextField(form.name, { v -> vm.updateCompany("name") { it.copy(name = v) } }, "Nombre", placeholder = "Tu nombre",
        required = true, error = errors["name"], enabled = enabled)
    FieldGap()
    TTTextField(form.lastName, { v -> vm.updateCompany("lastName") { it.copy(lastName = v) } }, "Apellido", placeholder = "Tu apellido",
        error = errors["lastName"], enabled = enabled)
    FieldGap()
    TTTextField(form.email, { v -> vm.updateCompany("email") { it.copy(email = v) } }, "Correo electrónico", placeholder = "tu@empresa.com",
        required = true, error = errors["email"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
    FieldGap()
    TTTextField(form.password, { v -> vm.updateCompany("password") { it.copy(password = v) } }, "Contraseña", placeholder = "Crea una contraseña",
        required = true, isPassword = true, error = errors["password"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
    PasswordRequirementsList(form.password)
    FieldGap()
    TTTextField(form.confirmPassword, { v -> vm.updateCompany("confirmPassword") { it.copy(confirmPassword = v) } }, "Confirmar contraseña",
        placeholder = "Repite tu contraseña", required = true, isPassword = true, error = errors["confirmPassword"], enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))

    Spacer(modifier = Modifier.height(20.dp))
    TTButton("Enviar solicitud", onClick = vm::submit, variant = TTButtonVariant.Primary, loading = state.loading, modifier = Modifier.fillMaxWidth())
    ConnectionMessage(state.connectionMessage)
}
