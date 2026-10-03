import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../design-system/tokens';
import { TTIcon } from '../design-system/components';
import { useNav } from '../nav/RouterContext';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RANGE_OPTIONS = {
  mensual: { label: 'Mensual', days: 30 },
  semanal: { label: 'Semanal', days: 7 },
  anual: { label: 'Anual', days: 365 },
};

function buildRangeQuery(mode = 'mensual') {
  const cfg = RANGE_OPTIONS[mode] || RANGE_OPTIONS.mensual;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - cfg.days);
  const pad = (value) => String(value).padStart(2, '0');
  return {
    from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function formatMoney(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? currency.format(numeric) : 'Sin datos aún';
}

function formatMonthLabel(value) {
  if (!value) return 'Sin datos';
  const [year, month] = String(value).split('-');
  if (!year || !month) return value;
  const monthIndex = Number(month) - 1;
  return `${monthLabels[monthIndex] || month} ${year.slice(-2)}`;
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function computeTrend(values) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const previous = safeNumber(values[values.length - 2]?.total ?? values[values.length - 2]?.amount ?? 0);
  const current = safeNumber(values[values.length - 1]?.total ?? values[values.length - 1]?.amount ?? 0);
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function EmptyState({ label = 'Sin datos aún' }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

function TrendPill({ value, positive, compact = false }) {
  const hasValue = value !== null && value !== undefined && Number.isFinite(Number(value));
  if (!hasValue) {
    return (
      <View style={[styles.trendPill, styles.trendPillMuted]}>
        <Text style={styles.trendPillTextMuted}>Sin datos</Text>
      </View>
    );
  }

  const delta = Math.abs(Number(value));
  const direction = positive === undefined ? Number(value) >= 0 : Boolean(positive);

  return (
    <View style={[styles.trendPill, direction ? styles.trendPillPositive : styles.trendPillNegative, compact && styles.trendPillCompact]}>
      <View style={styles.trendPillContent}>
        <TTIcon
          name={direction ? 'tendenciaArriba' : 'tendenciaAbajo'}
          size={14}
          color={direction ? COLORS.success : COLORS.error}
        />
        <Text style={[styles.trendPillText, direction ? styles.trendPillTextPositive : styles.trendPillTextNegative]}>
          {delta.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

function KPIStat({ label, value, trend, positive, detail, icon }) {
  const hasValue = value !== null && value !== undefined && value !== 'Sin datos aún';

  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <View style={styles.kpiIconWrap}>
          <TTIcon name={icon} size={18} color={COLORS.primary} />
        </View>
      </View>

      {hasValue ? (
        <>
          <Text style={styles.kpiValue}>{value}</Text>
          {detail ? <Text style={styles.kpiDetail}>{detail}</Text> : null}
          <View style={styles.kpiTrendRow}>
            <TrendPill value={trend} positive={positive} compact />
          </View>
        </>
      ) : (
        <EmptyState />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { can, session } = useAuth();
  const { go } = useNav();
  const { width } = useWindowDimensions();
  const compact = width < 760;

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({});
  const [salesSeries, setSalesSeries] = useState([]);
  const [purchasesSeries, setPurchasesSeries] = useState([]);
  const [inventoryData, setInventoryData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [activeBar, setActiveBar] = useState(null);
  const [rangeMode, setRangeMode] = useState('mensual');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const rangeQuery = buildRangeQuery(rangeMode);
        const [kpis, sales, purchases, inventory, finance] = await Promise.all([
          can('reports.read') ? api('/reports/kpis', { query: rangeQuery }) : Promise.resolve(null),
          can('sales.orders.read') ? api('/reports/sales', { query: rangeQuery }) : Promise.resolve(null),
          can('purchases.read') ? api('/reports/purchases', { query: rangeQuery }) : Promise.resolve(null),
          can('inventory.read') ? api('/reports/inventory') : Promise.resolve(null),
          can('finance.accounts.read') ? api('/reports/finance', { query: rangeQuery }) : Promise.resolve(null),
        ]);

        if (!mounted) return;
        setReportData(kpis || {});
        setSalesSeries(Array.isArray(sales?.byMonth) ? sales.byMonth : []);
        setPurchasesSeries(Array.isArray(purchases?.byMonth) ? purchases.byMonth : []);
        setInventoryData(inventory || null);
        setFinanceData(finance || null);
      } catch (error) {
        if (!mounted) return;
        setReportData({});
        setSalesSeries([]);
        setPurchasesSeries([]);
        setInventoryData(null);
        setFinanceData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [can, rangeMode]);

  const quickActions = useMemo(() => {
    const actions = [];
    if (can('sales.orders.create')) actions.push({ label: 'Nueva venta', route: 'salesOrders', primary: true });
    if (can('products.create')) actions.push({ label: 'Productos', route: 'products', primary: false });
    if (can('customers.read')) actions.push({ label: 'Clientes', route: 'customers', primary: false });
    if (can('purchases.read')) actions.push({ label: 'Compras', route: 'purchaseOrders', primary: false });
    return actions.slice(0, 4);
  }, [can]);

  const salesTotal = reportData?.sales?.total;
  const purchasesTotal = reportData?.purchases?.total;
  const netTotal = reportData?.net;
  const inventoryValue = inventoryData?.totalValue;
  const financeNet = financeData?.net;
  const salesTrend = computeTrend(salesSeries);
  const purchasesTrend = computeTrend(purchasesSeries);

  const barValues = useMemo(() => {
    const data = [...salesSeries].slice(-6);
    if (!data.length) return [];
    const max = Math.max(...data.map((item) => safeNumber(item.total || item.amount)), 1);
    return data.map((item) => ({
      label: formatMonthLabel(item.month),
      value: safeNumber(item.total || item.amount),
      height: Math.max((safeNumber(item.total || item.amount) / max) * 100, 10),
    }));
  }, [salesSeries]);

  const salesDisplay = salesTotal != null ? formatMoney(salesTotal) : 'Sin datos aún';
  const purchasesDisplay = purchasesTotal != null ? formatMoney(purchasesTotal) : 'Sin datos aún';
  const netDisplay = netTotal != null ? formatMoney(netTotal) : 'Sin datos aún';

  const noSalesData = !barValues.length;

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
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KPIStat
              label="Ventas del mes"
              value={salesDisplay}
              trend={salesTrend}
              positive={salesTrend !== null ? salesTrend >= 0 : true}
              detail={salesTotal != null ? 'Ventas aprobadas' : 'Sin ventas registradas'}
              icon="ventas"
            />
            <KPIStat
              label="Compras del mes"
              value={purchasesDisplay}
              trend={purchasesTrend}
              positive={purchasesTrend !== null ? purchasesTrend >= 0 : true}
              detail={purchasesTotal != null ? 'Compras en operación' : 'Sin compras registradas'}
              icon="compras"
            />
            <KPIStat
              label="Neto"
              value={netDisplay}
              trend={netTotal != null ? 0 : null}
              positive={true}
              detail={financeNet != null ? 'Resultado financiero' : 'Sin datos de finanzas'}
              icon="dinero"
            />
          </View>

          <View style={styles.mainCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardLabel}>Desempeño de ventas</Text>
                <Text style={styles.cardSubtitle}>Datos reales del reporte de ventas</Text>
              </View>

              <View style={styles.segmentedControl}>
                {Object.entries(RANGE_OPTIONS).map(([key, option]) => (
                  <Pressable
                    key={key}
                    onPress={() => setRangeMode(key)}
                    style={[styles.segmentedOption, rangeMode === key && styles.segmentedOptionActive]}
                  >
                    <Text style={[styles.segmentedText, rangeMode === key && styles.segmentedTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.salesSummaryRow}>
              <View>
                <Text style={styles.salesTotalValue}>{salesTotal != null ? formatMoney(salesTotal) : 'Sin datos aún'}</Text>
                <Text style={styles.salesMetaText}>{salesTotal != null ? 'Total aprobado' : 'Sin ventas registradas'}</Text>
              </View>
              <TrendPill value={salesTrend} positive={salesTrend !== null ? salesTrend >= 0 : true} />
            </View>

            <View style={styles.chartWrap}>
              {noSalesData ? (
                <EmptyState label="Sin datos aún" />
              ) : (
                <>
                  <View style={styles.chartBars}>
                    {barValues.map((bar, index) => (
                      <View key={`${bar.label}-${index}`} style={styles.barColumnWrap}>
                        <Pressable
                          onPress={() => setActiveBar(index === activeBar ? null : index)}
                          onHoverIn={() => setActiveBar(index)}
                          onHoverOut={() => setActiveBar(null)}
                          style={styles.barButton}
                        >
                          <View
                            style={[
                              styles.barFill,
                              index === barValues.length - 1 && styles.barFillLast,
                              { height: `${bar.height}%` },
                            ]}
                          />
                        </Pressable>

                        {activeBar === index ? (
                          <View style={styles.tooltip}>
                            <Text style={styles.tooltipText}>{bar.label}</Text>
                            <Text style={styles.tooltipValue}>{formatMoney(bar.value)}</Text>
                          </View>
                        ) : null}

                        <Text style={styles.barLabel}>{bar.label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={styles.secondaryGrid}>
            <View style={styles.secondaryCard}>
              <Text style={styles.secondaryTitle}>Trimestral</Text>
              <Text style={styles.secondaryValue}>{salesSeries.length ? formatMoney(salesSeries.slice(-3).reduce((sum, item) => sum + safeNumber(item.total || item.amount), 0)) : 'Sin datos aún'}</Text>
              <View style={styles.secondaryMetaRow}>
                <TrendPill value={salesTrend} positive={salesTrend !== null ? salesTrend >= 0 : true} compact />
              </View>
              <View style={styles.miniChart}>
                {[18, 26, 34, 40, 52, 49].map((value, index) => (
                  <View
                    key={index}
                    style={[
                      styles.miniBar,
                      index === 5 && styles.miniBarActive,
                      { height: `${value}%` },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.secondaryCard}>
              <Text style={styles.secondaryTitle}>Inventario</Text>
              <Text style={styles.secondaryValue}>{inventoryValue != null ? formatMoney(inventoryValue) : 'Sin datos aún'}</Text>
              <View style={styles.secondaryMetaRow}>
                <TrendPill value={null} positive />
              </View>
              <View style={styles.miniChart}>
                {[15, 22, 16, 30, 27, 36].map((value, index) => (
                  <View key={index} style={[styles.miniBar, { height: `${value}%` }]} />
                ))}
              </View>
            </View>

            <View style={styles.secondaryCard}>
              <Text style={styles.secondaryTitle}>Finanzas</Text>
              <Text style={styles.secondaryValue}>{financeNet != null ? formatMoney(financeNet) : 'Sin datos aún'}</Text>
              <View style={styles.secondaryMetaRow}>
                <TrendPill value={null} positive />
              </View>
              <View style={styles.miniChart}>
                {[12, 25, 18, 32, 30, 46].map((value, index) => (
                  <View key={index} style={[styles.miniLineTrack, { width: `${value}%` }]} />
                ))}
              </View>
            </View>
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
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  miniBar: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: COLORS.primaryGlow,
  },
  miniBarActive: {
    backgroundColor: COLORS.primary,
  },
  miniLineTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    opacity: 0.8,
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
