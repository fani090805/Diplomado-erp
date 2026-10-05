import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../design-system/tokens';
import { TTIcon } from '../design-system/components';
import { useNav } from '../nav/RouterContext';
import { isoWeekKey, monthKey, startOfDaysAgoISO, startOfMonthISO } from '../lib/dateRange';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Modos de la gráfica de ventas. Cada uno pide a la API una ventana y una
 * agrupación (groupBy) reales: semanas ISO o meses, en hora de México.
 */
const RANGE_OPTIONS = {
  semanal: { label: 'Semanal', groupBy: 'week', periods: 8, from: () => startOfDaysAgoISO(7 * 7 + 6), caption: 'Últimas 8 semanas' },
  mensual: { label: 'Mensual', groupBy: 'month', periods: 6, from: () => startOfMonthISO(5), caption: 'Últimos 6 meses' },
  anual: { label: 'Anual', groupBy: 'month', periods: 12, from: () => startOfMonthISO(11), caption: 'Últimos 12 meses' },
};

/**
 * Completa los periodos sin ventas con total 0 (la API sólo devuelve periodos
 * con movimientos) para que la gráfica no salte semanas o meses.
 */
function fillPeriods(series, cfg, now = new Date()) {
  const byPeriod = new Map((series || []).map((item) => [item.period, item]));
  const keys = [];
  for (let ago = cfg.periods - 1; ago >= 0; ago -= 1) {
    keys.push(
      cfg.groupBy === 'week'
        ? isoWeekKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago * 7))
        : monthKey(ago, now)
    );
  }
  return keys.map((key) => byPeriod.get(key) || { period: key, count: 0, total: 0 });
}

function formatMoney(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? currency.format(numeric) : 'Sin datos aún';
}

/** Etiqueta de un periodo de la API: "2026-10" → "Oct 26"; "2026-W41" → "Sem 41". */
function formatPeriodLabel(item) {
  const period = String(item?.period || item?.month || '');
  const week = /^(\d{4})-W(\d{2})$/.exec(period);
  if (week) return `Sem ${Number(week[2])}`;
  const [year, month] = period.split('-');
  if (!year || !month) return period || 'Sin datos';
  return `${monthLabels[Number(month) - 1] || month} ${year.slice(-2)}`;
}

/** Detalle del tooltip: en semanas, la fecha del lunes con que inicia. */
function formatPeriodDetail(item) {
  if (/W\d{2}$/.test(String(item?.period || '')) && item?.start) {
    const start = new Date(item.start);
    return `Semana del ${start.getDate()} ${monthLabels[start.getMonth()]}`;
  }
  return formatPeriodLabel(item);
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * % de cambio del mes en curso contra el mes anterior, buscando cada mes por
 * su clave (sin suponer que la serie trae todos los meses). null si no hay base.
 */
function monthOverMonth(series) {
  const totals = new Map((series || []).map((item) => [item.period || item.month, safeNumber(item.total)]));
  const current = totals.get(monthKey(0)) ?? 0;
  const previous = totals.get(monthKey(1));
  if (!previous) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function EmptyState({ label = 'Sin datos aún' }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

function TrendPill({ value, compact = false }) {
  const hasValue = value !== null && value !== undefined && Number.isFinite(Number(value));
  if (!hasValue) {
    return (
      <View style={[styles.trendPill, styles.trendPillMuted, compact && styles.trendPillCompact]}>
        <Text style={styles.trendPillTextMuted}>Sin comparativo</Text>
      </View>
    );
  }

  const delta = Math.abs(Number(value));
  const direction = Number(value) >= 0;

  return (
    <View style={[styles.trendPill, direction ? styles.trendPillPositive : styles.trendPillNegative, compact && styles.trendPillCompact]}>
      <View style={styles.trendPillContent}>
        <TTIcon
          name={direction ? 'tendenciaArriba' : 'tendenciaAbajo'}
          size={14}
          color={direction ? COLORS.success : COLORS.error}
        />
        <Text style={[styles.trendPillText, direction ? styles.trendPillTextPositive : styles.trendPillTextNegative]}>
          {delta.toFixed(1)}% vs mes anterior
        </Text>
      </View>
    </View>
  );
}

function KPIStat({ label, value, trend, showTrend = false, detail, icon }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <View style={styles.kpiIconWrap}>
          <TTIcon name={icon} size={18} color={COLORS.primary} />
        </View>
      </View>

      {value !== null && value !== undefined ? (
        <>
          <Text style={styles.kpiValue}>{value}</Text>
          {detail ? <Text style={styles.kpiDetail}>{detail}</Text> : null}
          {showTrend ? (
            <View style={styles.kpiTrendRow}>
              <TrendPill value={trend} compact />
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState />
      )}
    </View>
  );
}

/** Barras proporcionales con datos reales (sin valores de relleno). */
function MiniBars({ items }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <View style={styles.miniChart}>
      {items.map((item, index) => (
        <View key={item.key} style={styles.miniBarWrap}>
          <View
            style={[
              styles.miniBar,
              index === items.length - 1 && styles.miniBarActive,
              { height: `${Math.max((item.value / max) * 70, 4)}%` },
            ]}
          />
          <Text style={styles.miniBarLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function SecondaryCard({ title, value, detail, children }) {
  return (
    <View style={styles.secondaryCard}>
      <Text style={styles.secondaryTitle}>{title}</Text>
      <Text style={value ? styles.secondaryValue : styles.secondaryEmpty}>{value || 'Sin datos aún'}</Text>
      {detail ? <Text style={styles.secondaryDetail}>{detail}</Text> : null}
      {children}
    </View>
  );
}

/** Pide un reporte sólo si el usuario tiene permiso; un fallo deja el dato vacío. */
function optionalReport(enabled, path, query) {
  return enabled ? api(path, { query }).catch(() => null) : Promise.resolve(null);
}

export default function HomeScreen() {
  const { can } = useAuth();
  const { go } = useNav();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [chartSeries, setChartSeries] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeBar, setActiveBar] = useState(null);
  const [rangeMode, setRangeMode] = useState('mensual');

  const canReports = can('reports.read');

  // Indicadores del mes en curso (hasta este momento, para incluir hoy) y su comparativo.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const thisMonth = { from: startOfMonthISO(0), to: now };
      const sixMonths = { from: startOfMonthISO(5), to: now, groupBy: 'month' };
      const [kpis, sales, purchases, inventory, finance] = await Promise.all([
        optionalReport(canReports, '/reports/kpis', thisMonth),
        optionalReport(canReports && can('sales.orders.read'), '/reports/sales', sixMonths),
        optionalReport(canReports && can('purchases.read'), '/reports/purchases', sixMonths),
        optionalReport(canReports && can('inventory.read'), '/reports/inventory'),
        optionalReport(canReports && can('finance.accounts.read'), '/reports/finance', thisMonth),
      ]);
      if (!mounted) return;
      setOverview({
        kpis,
        salesMonthly: sales?.series || [],
        purchasesMonthly: purchases?.series || [],
        inventory,
        finance,
      });
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [can, canReports]);

  // Serie de la gráfica según el modo (semanas ISO o meses).
  useEffect(() => {
    let mounted = true;
    const cfg = RANGE_OPTIONS[rangeMode];
    setChartLoading(true);
    setActiveBar(null);
    optionalReport(canReports && can('sales.orders.read'), '/reports/sales', {
      from: cfg.from(),
      to: new Date().toISOString(),
      groupBy: cfg.groupBy,
    }).then((sales) => {
      if (!mounted) return;
      setChartSeries(sales?.series?.length ? fillPeriods(sales.series, cfg) : []);
      setChartLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [can, canReports, rangeMode]);

  const quickActions = useMemo(() => {
    const actions = [];
    if (can('sales.orders.create')) actions.push({ label: 'Nueva venta', route: 'salesOrders', primary: true });
    if (can('products.create')) actions.push({ label: 'Productos', route: 'products', primary: false });
    if (can('customers.read')) actions.push({ label: 'Clientes', route: 'customers', primary: false });
    if (can('purchases.read')) actions.push({ label: 'Compras', route: 'purchaseOrders', primary: false });
    return actions.slice(0, 4);
  }, [can]);

  const { kpis, salesMonthly = [], purchasesMonthly = [], inventory, finance } = overview;
  const salesTrend = monthOverMonth(salesMonthly);
  const purchasesTrend = monthOverMonth(purchasesMonthly);

  const barValues = useMemo(() => {
    const max = Math.max(...chartSeries.map((item) => safeNumber(item.total)), 1);
    return chartSeries.map((item) => ({
      label: formatPeriodLabel(item),
      detail: formatPeriodDetail(item),
      value: safeNumber(item.total),
      height: Math.max((safeNumber(item.total) / max) * 100, 4),
    }));
  }, [chartSeries]);
  const chartTotal = chartSeries.reduce((sum, item) => sum + safeNumber(item.total), 0);

  // Últimos 3 meses calendario (incluido el actual) a partir de la serie mensual real.
  const quarter = useMemo(() => {
    const totals = new Map(salesMonthly.map((item) => [item.period, safeNumber(item.total)]));
    return [2, 1, 0].map((ago) => {
      const key = monthKey(ago);
      return { key, label: formatPeriodLabel({ period: key }), value: totals.get(key) ?? 0 };
    });
  }, [salesMonthly]);
  const quarterTotal = quarter.reduce((sum, item) => sum + item.value, 0);
  const hasQuarterData = salesMonthly.length > 0;

  const rangeCfg = RANGE_OPTIONS[rangeMode];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.sectionEyebrow}>Resumen ejecutivo</Text>
          <Text style={styles.pageTitle}>Dashboard</Text>
        </View>

        <View style={styles.quickActionsWrap}>
          {quickActions.map((action) => (
            <Pressable
              key={action.route}
              onPress={() => go(action.route)}
              style={[styles.quickAction, action.primary ? styles.quickActionPrimary : styles.quickActionSecondary]}
            >
              <Text style={[styles.quickActionText, action.primary ? styles.quickActionTextPrimary : styles.quickActionTextSecondary]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}><Text style={styles.loadingText}>Cargando dashboard…</Text></View>
      ) : !canReports ? (
        <EmptyState label="Tu rol no tiene acceso a los reportes de la empresa." />
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KPIStat
              label="Ventas del mes"
              value={kpis?.sales ? formatMoney(kpis.sales.total) : null}
              trend={salesTrend}
              showTrend
              detail={kpis?.sales ? `${kpis.sales.count} ${kpis.sales.count === 1 ? 'venta aprobada' : 'ventas aprobadas'}` : null}
              icon="ventas"
            />
            <KPIStat
              label="Compras del mes"
              value={kpis?.purchases ? formatMoney(kpis.purchases.total) : null}
              trend={purchasesTrend}
              showTrend
              detail={kpis?.purchases ? `${kpis.purchases.count} ${kpis.purchases.count === 1 ? 'orden aprobada' : 'órdenes aprobadas'}` : null}
              icon="compras"
            />
            <KPIStat
              label="Neto del mes"
              value={kpis && kpis.net !== undefined ? formatMoney(kpis.net) : null}
              detail="Ingresos menos gastos registrados"
              icon="dinero"
            />
          </View>

          <View style={styles.mainCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardLabel}>Desempeño de ventas</Text>
                <Text style={styles.cardSubtitle}>{rangeCfg.caption} · ventas aprobadas</Text>
              </View>

              <View style={styles.segmentedControl}>
                {Object.entries(RANGE_OPTIONS).map(([key, option]) => (
                  <Pressable
                    key={key}
                    onPress={() => setRangeMode(key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: rangeMode === key }}
                    style={[styles.segmentedOption, rangeMode === key && styles.segmentedOptionActive]}
                  >
                    <Text style={[styles.segmentedText, rangeMode === key && styles.segmentedTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.salesSummaryRow}>
              <View>
                <Text style={styles.salesTotalValue}>{chartSeries.length ? formatMoney(chartTotal) : 'Sin datos aún'}</Text>
                <Text style={styles.salesMetaText}>
                  {chartSeries.length ? `Total del periodo · ${rangeCfg.caption.toLowerCase()}` : 'Sin ventas aprobadas en el periodo'}
                </Text>
              </View>
            </View>

            <View style={styles.chartWrap}>
              {chartLoading ? (
                <EmptyState label="Cargando serie…" />
              ) : !barValues.length ? (
                <EmptyState label="Sin datos aún" />
              ) : (
                <View style={styles.chartBars}>
                  {barValues.map((bar, index) => (
                    <View key={`${bar.label}-${index}`} style={styles.barColumnWrap}>
                      <Pressable
                        onPress={() => setActiveBar(index === activeBar ? null : index)}
                        onHoverIn={() => setActiveBar(index)}
                        onHoverOut={() => setActiveBar(null)}
                        style={styles.barButton}
                        accessibilityLabel={`${bar.detail}: ${formatMoney(bar.value)}`}
                      >
                        <View
                          style={[
                            styles.barFill,
                            (activeBar === index || (activeBar === null && index === barValues.length - 1)) && styles.barFillLast,
                            { height: `${bar.height}%` },
                          ]}
                        />
                      </Pressable>

                      {activeBar === index ? (
                        <View style={styles.tooltip}>
                          <Text style={styles.tooltipText}>{bar.detail}</Text>
                          <Text style={styles.tooltipValue}>{formatMoney(bar.value)}</Text>
                        </View>
                      ) : null}

                      <Text style={styles.barLabel}>{bar.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.secondaryGrid}>
            <SecondaryCard
              title="Trimestral"
              value={hasQuarterData ? formatMoney(quarterTotal) : null}
              detail={hasQuarterData ? 'Ventas aprobadas de los últimos 3 meses' : null}
            >
              {hasQuarterData ? <MiniBars items={quarter} /> : null}
            </SecondaryCard>

            <SecondaryCard
              title="Inventario"
              value={inventory ? formatMoney(inventory.totalValue) : null}
              detail={
                inventory
                  ? `${safeNumber(inventory.totalQuantity)} unidades · ${safeNumber(inventory.lowStock)} con stock bajo`
                  : null
              }
            />

            <SecondaryCard
              title="Finanzas del mes"
              value={finance ? formatMoney(finance.net) : null}
              detail={
                finance
                  ? `Ingresos ${formatMoney(finance.income?.total)} · Gastos ${formatMoney(finance.expense?.total)}`
                  : null
              }
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  headerRow: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  titleWrap: {
    gap: 4,
  },
  sectionEyebrow: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  quickActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 6,
  },
  quickAction: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickActionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickActionSecondary: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  quickActionTextPrimary: {
    color: COLORS.textInverted,
  },
  quickActionTextSecondary: {
    color: COLORS.textSecondary,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    minHeight: 170,
    justifyContent: 'space-between',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamily.display,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryGlow,
  },
  kpiValue: {
    ...TYPOGRAPHY.kpiValue,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  kpiDetail: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  kpiTrendRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  trendPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPillCompact: {
    minHeight: 24,
    paddingHorizontal: 8,
  },
  trendPillPositive: {
    backgroundColor: COLORS.trendUpBg,
  },
  trendPillNegative: {
    backgroundColor: COLORS.trendDownBg,
  },
  trendPillMuted: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  trendPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trendPillTextPositive: {
    color: COLORS.success,
  },
  trendPillTextNegative: {
    color: COLORS.error,
  },
  trendPillTextMuted: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    borderRadius: 24,
    padding: 18,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  cardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
  },
  segmentedOption: {
    minWidth: 90,
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentedOptionActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentedOptionDisabled: {
    opacity: 0.5,
  },
  segmentedText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  segmentedTextActive: {
    color: COLORS.textInverted,
  },
  salesSummaryRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  salesTotalValue: {
    color: COLORS.textPrimary,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  salesMetaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  chartWrap: {
    marginTop: 18,
    minHeight: 220,
    justifyContent: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 190,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 6,
  },
  barColumnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    position: 'relative',
    paddingHorizontal: 4,
  },
  barButton: {
    width: '70%',
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    opacity: 0.2,
    minHeight: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  barFillLast: {
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  tooltip: {
    position: 'absolute',
    top: 4,
    left: '20%',
    right: '20%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tooltipText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  tooltipValue: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  barLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 6,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  secondaryTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  secondaryValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    marginTop: 8,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  secondaryMetaRow: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  miniChart: {
    marginTop: 14,
    height: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  miniBarWrap: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  miniBar: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.primaryGlow,
  },
  miniBarLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  secondaryEmpty: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  secondaryDetail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  miniBarActive: {
    backgroundColor: COLORS.primary,
  },
  emptyState: {
    minHeight: 80,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  emptyStateText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});
