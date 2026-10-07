import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Gráfica "Desempeño de ventas" del dashboard.
 *
 * - Barras olivo (COLORS.chartBar) al 55 %; la del periodo en curso (la última)
 *   sólida con la etiqueta "En curso". Al pasar el mouse o tocar una barra se
 *   resalta y muestra un tooltip con periodo, monto completo y número de ventas.
 * - Eje Y a la izquierda con 4 marcas "redondas" ($10M, $20M…) y líneas guía tenues.
 * - Monto abreviado encima de cada barra cuando cabe (si no, sólo en la activa).
 * `series` = [{ period, label, shortLabel?, detail, total, count }] en orden
 * cronológico; `shortLabel` se usa cuando las columnas son angostas (móvil).
 */

const PLOT_HEIGHT = 190;
const AXIS_WIDTH = 52;
const TOOLTIP_WIDTH = 168;
const MIN_COLUMN_FOR_LABELS = 46;

const moneyFull = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** "#334024" + 0.55 → "rgba(51, 64, 36, 0.55)". */
function withAlpha(hex, alpha) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const BAR = withAlpha(COLORS.chartBar, 0.55);
const BAR_STRONG = COLORS.chartBar;
const GRID = withAlpha(COLORS.chartBar, 0.08);

/** Colores de barra compartidos con otras gráficas del dashboard (p. ej. "Trimestral"). */
export const CHART_COLORS = { bar: BAR, barStrong: BAR_STRONG, grid: GRID };

/** $17.4M, $350k, $900 (sin ".0" sobrante). */
export function abbreviateMoney(value) {
  const v = Number(value) || 0;
  const trim = (n) => String(Number(n.toFixed(1)));
  if (Math.abs(v) >= 1e6) return `$${trim(v / 1e6)}M`;
  if (Math.abs(v) >= 1e3) return `$${trim(v / 1e3)}k`;
  return `$${Math.round(v)}`;
}

/** Escala con 4 marcas redondas (1, 2, 2.5 o 5 × 10^n) que cubren el máximo. */
export function niceScale(max) {
  if (!(max > 0)) return { step: 1, top: 4, ticks: [1, 2, 3, 4] };
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = nice * magnitude;
  return { step, top: step * 4, ticks: [1, 2, 3, 4].map((i) => step * i) };
}

function Tooltip({ bar, index, count, barHeight }) {
  // Las primeras/últimas barras alinean el tooltip hacia dentro para no salirse.
  const edge = index < 2 ? { left: 0 } : index > count - 3 ? { right: 0 } : { left: '50%', marginLeft: -TOOLTIP_WIDTH / 2 };
  return (
    <View pointerEvents="none" style={[styles.tooltip, edge, { bottom: Math.min(barHeight + 26, PLOT_HEIGHT - 8) }]}>
      <Text style={styles.tooltipPeriod}>{bar.detail}</Text>
      <Text style={styles.tooltipValue}>{moneyFull.format(bar.total)}</Text>
      <Text style={styles.tooltipCount}>
        {bar.count} {bar.count === 1 ? 'venta aprobada' : 'ventas aprobadas'}
      </Text>
    </View>
  );
}

export default function SalesPerformanceChart({ series }) {
  const [active, setActive] = useState(null);
  const [width, setWidth] = useState(0);

  const max = Math.max(...series.map((item) => Number(item.total) || 0), 0);
  const scale = niceScale(max);
  const columnWidth = width ? (width - AXIS_WIDTH) / Math.max(series.length, 1) : 0;
  const roomForLabels = columnWidth >= MIN_COLUMN_FOR_LABELS;
  const currentIndex = series.length - 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.plotRow}>
        <View style={styles.axis}>
          {scale.ticks.map((tick) => (
            <Text key={tick} style={[styles.axisLabel, { bottom: (tick / scale.top) * PLOT_HEIGHT - 7 }]}>
              {abbreviateMoney(tick)}
            </Text>
          ))}
        </View>

        <View style={styles.plot}>
          {scale.ticks.map((tick) => (
            <View key={tick} style={[styles.gridLine, { bottom: (tick / scale.top) * PLOT_HEIGHT }]} />
          ))}
          <View style={[styles.gridLine, styles.baseline]} />

          <View style={styles.bars}>
            {series.map((bar, index) => {
              const total = Number(bar.total) || 0;
              const height = total > 0 ? Math.max((total / scale.top) * PLOT_HEIGHT, 3) : 0;
              const isActive = active === index;
              const isCurrent = index === currentIndex;
              const showValue = total > 0 && !isActive && (roomForLabels || isCurrent);
              return (
                <Pressable
                  key={bar.period}
                  style={[styles.column, isActive && { zIndex: 10 }]}
                  onHoverIn={() => setActive(index)}
                  onHoverOut={() => setActive((a) => (a === index ? null : a))}
                  // Tocar muestra el tooltip de esa barra (con mouse, el hover ya lo hizo).
                  onPress={() => setActive(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`${bar.detail}: ${moneyFull.format(total)}, ${bar.count} ventas`}
                >
                  {showValue ? <Text style={[styles.valueLabel, isCurrent && styles.valueLabelStrong]}>{abbreviateMoney(total)}</Text> : null}
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: isActive || isCurrent ? BAR_STRONG : BAR },
                      isActive && styles.barActive,
                    ]}
                  />
                  {isActive ? <Tooltip bar={{ ...bar, total }} index={index} count={series.length} barHeight={height} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.xAxis}>
        {series.map((bar, index) => (
          <View key={bar.period} style={styles.xCell}>
            <Text style={[styles.xLabel, !roomForLabels && styles.xLabelCompact, (active === index || index === currentIndex) && styles.xLabelStrong]} numberOfLines={1}>
              {roomForLabels || !bar.shortLabel ? bar.label : bar.shortLabel}
            </Text>
            {index === currentIndex ? <Text style={styles.currentTag}>En curso</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plotRow: { flexDirection: 'row', height: PLOT_HEIGHT + 8, paddingTop: 8 },
  axis: { width: AXIS_WIDTH, height: PLOT_HEIGHT, position: 'relative' },
  axisLabel: {
    position: 'absolute',
    right: 8,
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  plot: { flex: 1, height: PLOT_HEIGHT, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GRID },
  baseline: { bottom: 0, backgroundColor: withAlpha(COLORS.chartBar, 0.18) },
  bars: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  bar: {
    width: '58%',
    maxWidth: 44,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barActive: {
    shadowColor: COLORS.chartBar,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  valueLabel: {
    fontSize: 10,
    marginBottom: 4,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  valueLabelStrong: { color: COLORS.textPrimary, fontWeight: '700' },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tooltipPeriod: { fontSize: 10, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.fontFamily.ui },
  tooltipValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.fontFamily.ui },
  tooltipCount: { fontSize: 10, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.ui },
  xAxis: { flexDirection: 'row', marginLeft: AXIS_WIDTH, marginTop: 6 },
  xCell: { flex: 1, alignItems: 'center', gap: 3 },
  xLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.fontFamily.ui },
  xLabelCompact: { fontSize: 9 },
  xLabelStrong: { color: COLORS.textPrimary, fontWeight: '700' },
  currentTag: {
    width: 52,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textInverted,
    backgroundColor: COLORS.chartBar,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});
