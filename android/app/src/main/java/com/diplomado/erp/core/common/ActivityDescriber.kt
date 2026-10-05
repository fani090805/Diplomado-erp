package com.diplomado.erp.core.common

import com.diplomado.erp.core.network.dto.AuditLogDto
import java.time.ZoneId

/**
 * Traduce la bitácora de auditoría (GET /audit) a frases legibles:
 * "Laura Méndez · Registró una venta · hace 5 min".
 *
 * El backend guarda `module` (primer segmento de la URL o el módulo del
 * servicio) y `action` (LOGIN, POST_SALES-ORDERS, APPROVE_COMPANY_REQUEST…).
 */
data class ActivityItem(
    val id: String,
    val actorName: String,
    val sentence: String,
    val module: String,
    val createdAt: String?,
    val isSession: Boolean
)

object ActivityDescriber {

    private val SESSION_ACTIONS = setOf("LOGIN", "LOGOUT", "REFRESH")

    /** Complemento por módulo: "una venta", "un producto"… */
    private val MODULE_OBJECTS = mapOf(
        "sales-orders" to "una venta",
        "purchase-orders" to "una orden de compra",
        "products" to "un producto",
        "inventory" to "un movimiento de inventario",
        "warehouses" to "un almacén",
        "customers" to "un cliente",
        "suppliers" to "un proveedor",
        "finance" to "un movimiento financiero",
        "crm" to "un prospecto",
        "hr" to "un empleado",
        "production" to "una orden de producción",
        "projects" to "una obra",
        "cost-centers" to "un centro de costo",
        "users" to "un usuario",
        "roles" to "un rol",
        "branches" to "una sucursal",
        "master-data" to "un catálogo",
        "companies" to "la empresa",
        "company-requests" to "una solicitud de empresa",
        "platform" to "la plataforma",
        "reports" to "un reporte"
    )

    /** Acciones con frase propia (sin complemento). */
    private val FULL_SENTENCES = mapOf(
        "LOGIN" to "Inició sesión",
        "LOGOUT" to "Cerró sesión",
        "REFRESH" to "Renovó su sesión",
        "REGISTER" to "Solicitó acceso a la empresa",
        "REGISTER_COMPANY" to "Solicitó el alta de una empresa",
        "CHANGE_PASSWORD" to "Cambió su contraseña",
        "RESET_PASSWORD" to "Restableció su contraseña",
        "FORGOT_PASSWORD" to "Pidió recuperar su contraseña",
        "SUSPEND_COMPANY" to "Suspendió una empresa",
        "REACTIVATE_COMPANY" to "Reactivó una empresa",
        "CREATE_COMPANY_WITH_ADMIN" to "Dio de alta una empresa"
    )

    /** Verbo por prefijo de acción (CREATE_X, APPROVE_X…) o método HTTP del audit middleware. */
    private val VERBS = listOf(
        "CREATE" to "Creó",
        "UPDATE" to "Actualizó",
        "DELETE" to "Eliminó",
        "APPROVE" to "Aprobó",
        "REJECT" to "Rechazó",
        "CANCEL" to "Canceló",
        "VOID" to "Anuló",
        "RELEASE" to "Liberó",
        "DONE" to "Terminó",
        "DEACTIVATE" to "Desactivó",
        "REACTIVATE" to "Reactivó",
        "POST" to "Registró",
        "PUT" to "Actualizó",
        "PATCH" to "Actualizó"
    )

    fun isSession(log: AuditLogDto): Boolean =
        log.module == "auth" && (log.action ?: "") in SESSION_ACTIONS

    fun sentenceFor(log: AuditLogDto): String {
        val action = log.action?.uppercase().orEmpty()
        FULL_SENTENCES[action]?.let { return it }

        val verb = VERBS.firstOrNull { (prefix, _) -> action == prefix || action.startsWith("${prefix}_") }?.second
            ?: "Modificó"
        val obj = MODULE_OBJECTS[log.module.orEmpty()]
            ?: log.resourceType?.takeIf { it.isNotBlank() && it != "null" }?.replace('_', ' ')
        return if (obj.isNullOrBlank()) verb else "$verb $obj"
    }

    /**
     * Nombre del responsable: nombre del directorio de usuarios, o el de la sesión
     * actual, o el correo legible. "Sistema" sólo si no hay usuario ni correo.
     */
    fun actorName(
        log: AuditLogDto,
        namesById: Map<String, String>,
        currentEmail: String,
        currentName: String
    ): String {
        log.userId?.let { id -> namesById[id]?.let { return it } }
        val email = log.userEmail?.takeIf { it.isNotBlank() } ?: return "Sistema"
        if (email.equals(currentEmail, ignoreCase = true) && currentName.isNotBlank()) return currentName
        return email.substringBefore("@")
            .split('.', '_', '-')
            .filter { it.isNotBlank() }
            .joinToString(" ") { part -> part.replaceFirstChar { it.uppercase() } }
            .ifBlank { email }
    }

    /**
     * Prioriza la actividad de negocio: deja como máximo un evento de sesión por
     * usuario y día, y sólo los usa para completar hasta [max] elementos.
     */
    fun buildFeed(
        logs: List<AuditLogDto>,
        namesById: Map<String, String>,
        currentEmail: String,
        currentName: String,
        max: Int = 6
    ): List<ActivityItem> {
        val successful = logs.filter { it.result == null || it.result == "SUCCESS" }
        val (sessionLogs, businessLogs) = successful.partition { isSession(it) }

        val zone = ZoneId.systemDefault()
        val seenSessions = mutableSetOf<String>()
        val dedupedSessions = sessionLogs.filter { log ->
            val day = parseInstant(log.createdAt)?.atZone(zone)?.toLocalDate()?.toString() ?: "?"
            seenSessions.add("${log.userId ?: log.userEmail}|$day")
        }

        val chosen = businessLogs.take(max).toMutableList()
        if (chosen.size < max) chosen += dedupedSessions.take(max - chosen.size)

        return chosen
            .sortedByDescending { parseInstant(it.createdAt) }
            .map { log ->
                ActivityItem(
                    id = log.id,
                    actorName = actorName(log, namesById, currentEmail, currentName),
                    sentence = sentenceFor(log),
                    module = log.module.orEmpty(),
                    createdAt = log.createdAt,
                    isSession = isSession(log)
                )
            }
    }
}
