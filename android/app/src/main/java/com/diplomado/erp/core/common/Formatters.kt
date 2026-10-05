package com.diplomado.erp.core.common

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Formatos compartidos (espejo de frontend/src/lib/format.js):
 * moneda MXN "$1,234.56", fechas en español y fechas relativas.
 */
private val LOCALE_MX = Locale("es", "MX")

private val MONEY_FORMAT = DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.US))
private val MONEY_FORMAT_ROUND = DecimalFormat("#,##0", DecimalFormatSymbols(Locale.US))

/** $1,234.56 (negativos como -$1,234.56). */
fun formatMoney(value: Double?): String {
    val amount = value ?: 0.0
    val sign = if (amount < 0) "-" else ""
    return "$sign$${MONEY_FORMAT.format(kotlin.math.abs(amount))}"
}

/** $1,235 sin decimales: para cifras grandes de tarjetas y gráficas. */
fun formatMoneyRounded(value: Double?): String {
    val amount = value ?: 0.0
    val sign = if (amount < 0) "-" else ""
    return "$sign$${MONEY_FORMAT_ROUND.format(kotlin.math.abs(amount))}"
}

private val MONTHS_SHORT = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")

/** "2026-10" → "Oct 26". */
fun formatMonthLabel(yearMonth: String?): String {
    val parts = yearMonth?.split("-") ?: return "—"
    if (parts.size < 2) return yearMonth
    val month = parts[1].toIntOrNull() ?: return yearMonth
    return "${MONTHS_SHORT.getOrElse(month - 1) { parts[1] }} ${parts[0].takeLast(2)}"
}

/** "lunes, 5 de octubre de 2026". */
fun todayLabel(today: LocalDate = LocalDate.now()): String =
    today.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM 'de' yyyy", LOCALE_MX))
        .replaceFirstChar { it.uppercase() }

/** "05/10/2026" a partir de un ISO-8601 del backend; "—" si no se puede leer. */
fun formatDate(iso: String?): String {
    val instant = parseInstant(iso) ?: return "—"
    return instant.atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("dd/MM/yyyy", LOCALE_MX))
}

/** "hace 5 min", "hace 2 h", "ayer" o la fecha completa si es más vieja. */
fun formatRelative(iso: String?, now: Instant = Instant.now()): String {
    val instant = parseInstant(iso) ?: return ""
    val zone = ZoneId.systemDefault()
    val minutes = Duration.between(instant, now).toMinutes()
    val day = instant.atZone(zone).toLocalDate()
    val today = now.atZone(zone).toLocalDate()
    return when {
        minutes < 1 -> "justo ahora"
        minutes < 60 -> "hace $minutes min"
        day == today -> "hace ${minutes / 60} h"
        day == today.minusDays(1) -> "ayer"
        else -> instant.atZone(zone)
            .format(DateTimeFormatter.ofPattern("d 'de' MMM yyyy, HH:mm", LOCALE_MX))
    }
}

fun parseInstant(iso: String?): Instant? =
    if (iso.isNullOrBlank()) null else runCatching { Instant.parse(iso) }.getOrNull()

/** Iniciales para avatares: "Laura Méndez" → "LM"; "ana@x.com" → "A". */
fun initialsOf(nameOrEmail: String?): String {
    val clean = nameOrEmail?.substringBefore("@")?.trim().orEmpty()
    if (clean.isEmpty()) return "?"
    val words = clean.split(Regex("[\\s._-]+")).filter { it.isNotEmpty() }
    return words.take(2).joinToString("") { it.first().uppercase() }
}
