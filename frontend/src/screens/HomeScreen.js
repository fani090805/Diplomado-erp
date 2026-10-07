import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../design-system/tokens';
import { TTIcon } from '../design-system/components';
import { useNav } from '../nav/RouterContext';
import LiveIndicator from '../components/LiveIndicator';
import { useLiveUpdates } from '../hooks/useLiveUpdates';
import SalesPerformanceChart, { abbreviateMoney, CHART_COLORS } from '../components/dashboard/SalesPerformanceChart';
import { isoWeekKey, monthKey, monthToDateRanges, percentChange, startOfDaysAgoISO, startOfMonthISO } from '../lib/dateRange';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/** Alto (px) del área de barras de la minigráfica "Trimestral". */
const MINI_PLOT_HEIGHT = 64;

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

/** Etiqueta corta para columnas angostas: "Oct" o "S41". */
function formatPeriodShort(item) {
  const period = String(item?.period || '');
  const week = /-W(\d{2})$/.exec(period);
  if (week) return `S${Number(week[1])}`;
  const month = Number(period.split('-')[1]);
  return monthLabels[month - 1] || period;
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
  const sign = direction ? '+' : '−';

  return (
    <View style={[styles.trendPill, direction ? styles.trendPillPositive : styles.trendPillNegative, compact && styles.trendPillCompact]}>
      <View style={styles.trendPillContent}>
        <TTIcon
          name={direction ? 'tendenciaArriba' : 'tendenciaAbajo'}
          size={14}
          color={direction ? COLORS.success : COLORS.error}
        />
        <Text style={[styles.trendPillText, direction ? styles.trendPillTextPositive : styles.trendPillTextNegative]}>
          {sign}{delta.toFixed(1)}% vs mismo periodo del mes anterior
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
/**
 * Minigráfica "Trimestral" con el estilo de "Desempeño de ventas": barras
 * olivo al 55 %, el mes en curso (el último) sólido y el monto abreviado encima.
 */
function MiniBars({ items }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.value), 1);
  const currentIndex = items.length - 1;
  return (
    <View style={styles.miniChart}>
      {items.map((item, index) => {
        const isCurrent = index === currentIndex;
        const height = item.value > 0 ? Math.max((item.value / max) * MINI_PLOT_HEIGHT, 3) : 0;
        return (
          <View key={item.key} style={styles.miniBarWrap}>
            {item.value > 0 ? (
              <Text style={[styles.miniBarValue, isCurrent && styles.miniBarValueCurrent]}>{abbreviateMoney(item.value)}</Text>
            ) : null}
            <View style={[styles.miniBar, { height, backgroundColor: isCurrent ? CHART_COLORS.barStrong : CHART_COLORS.bar }]} />
            <Text style={[styles.miniBarLabel, isCurrent && styles.miniBarLabelCurrent]}>{item.label}</Text>
          </View>
        );
      })}
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
  const [rangeMode, setRangeMode] = useState('mensual');

  const canReports = can('reports.read');

  // Cambios en vivo: recarga en silencio (sin "Cargando…") indicadores y gráfica.
  const [liveTick, setLiveTick] = useState(0);
  const silentRef = useRef({ overview: false, chart: false });
  useLiveUpdates(['sales-order', 'purchase-order', 'income', 'expense', 'inventory', 'product'], () => {
    silentRef.current = { overview: true, chart: true };
    setLiveTick((t) => t + 1);
  });

  // Indicadores del mes en curso y comparativo JUSTO: del día 1 a hoy contra
  // del día 1 al mismo día del mes anterior (hora de México).
  useEffect(() => {
    let mounted = true;
    const silent = silentRef.current.overview;
    silentRef.current.overview = false;
    const load = async () => {
      if (!silent) setLoading(true);
      const { current: thisMonth, previous: lastMonthToDate } = monthToDateRanges();
      const sixMonths = { from: startOfMonthISO(5), to: thisMonth.to, groupBy: 'month' };
      const [kpis, previousKpis, sales, inventory, finance] = await Promise.all([
        optionalReport(canReports, '/reports/kpis', thisMonth),
        optionalReport(canReports, '/reports/kpis', lastMonthToDate),
        optionalReport(canReports && can('sales.orders.read'), '/reports/sales', sixMonths),
        optionalReport(canReports && can('inventory.read'), '/reports/inventory'),
        optionalReport(canReports && can('finance.accounts.read'), '/reports/finance', thisMonth),
      ]);
      if (!mounted) return;
      setOverview({
        kpis,
        previousKpis,
        salesMonthly: sales?.series || [],
        inventory,
        finance,
      });
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [can, canReports, liveTick]);

  // Serie de la gráfica según el modo (semanas ISO o meses).
  useEffect(() => {
    let mounted = true;
    const cfg = RANGE_OPTIONS[rangeMode];
    const silent = silentRef.current.chart;
    silentRef.current.chart = false;
    if (!silent) setChartLoading(true);
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
  }, [can, canReports, rangeMode, liveTick]);

  const quickActions = useMemo(() => {
    const actions = [];
    if (can('sales.orders.create')) actions.push({ label: 'Nueva venta', route: 'salesOrders', primary: true });
    if (can('products.create')) actions.push({ label: 'Productos', route: 'products', primary: false });
    if (can('customers.read')) actions.push({ label: 'Clientes', route: 'customers', primary: false });
    if (can('purchases.read')) actions.push({ label: 'Compras', route: 'purchaseOrders', primary: false });
    return actions.slice(0, 4);
  }, [can]);

  const { kpis, previousKpis, salesMonthly = [], inventory, finance } = overview;
  const salesTrend = kpis && previousKpis ? percentChange(kpis.sales?.total, previousKpis.sales?.total) : null;
  const purchasesTrend = kpis && previousKpis ? percentChange(kpis.purchases?.total, previousKpis.purchases?.total) : null;

  const chartBars = useMemo(
    () =>
      chartSeries.map((item) => ({
        period: item.period,
        label: formatPeriodLabel(item),
        shortLabel: formatPeriodShort(item),
        detail: formatPeriodDetail(item),
        total: safeNumber(item.total),
        count: safeNumber(item.count),
      })),
    [chartSeries]
  );
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.sectionEyebrow}>Resumen ejecutivo</Text>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <LiveIndicator />
          </View>
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
              ) : !chartBars.length ? (
                <EmptyState label="Sin datos aún" />
              ) : (
                <SalesPerformanceChart series={chartBars} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Un solo contenedor: el panel blanco del Layout ya da fondo y márgenes.
  container: {
    gap: 18,
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
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
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
    flexShrink: 1,
    maxWidth: '100%',
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
    height: MINI_PLOT_HEIGHT + 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 18,
  },
  miniBarWrap: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    // Línea base justo bajo las barras (continua: las columnas no llevan separación).
    borderBottomWidth: 1,
    borderBottomColor: CHART_COLORS.grid,
  },
  miniBar: {
    width: '58%',
    maxWidth: 44,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  miniBarValue: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  miniBarValueCurrent: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  miniBarLabel: {
    position: 'absolute',
    bottom: -16,
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  miniBarLabelCurrent: {
    color: COLORS.textPrimary,
    fontWeight: '700',
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
