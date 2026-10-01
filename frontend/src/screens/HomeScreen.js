import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { COLORS, RADIUS, TYPOGRAPHY } from '../design-system/tokens';
import { TTButton } from '../design-system/components';
import { MENU_CATEGORIES } from '../components/Layout';
import { dateOf, money } from '../lib/format';
import { useNav } from '../nav/RouterContext';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SALES = [680, 745, 720, 890, 960, 1120];
const MARGINS = [26, 28, 27, 31, 30, 35];
const MONTH_LABELS = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
const CRITICAL_ALERTS = [
  { title: 'Stock por debajo del mínimo', module: 'Inventario', state: 'Requiere atención', date: 'Hoy, 09:42', tone: 'warning' },
  { title: 'Factura vencida · FAC-2048', module: 'Finanzas', state: 'Vencida', date: 'Hoy, 08:16', tone: 'error' },
  { title: 'Pedido pendiente de aprobación', module: 'Ventas', state: 'Pendiente', date: 'Ayer, 16:30', tone: 'warning' },
];
const PRIMARY_MODULES = [
  { label: 'Finanzas', route: 'accounts', permission: 'finance.accounts.read', volume: '128 movimientos', state: 'Operativo' },
  { label: 'Inventario', route: 'stock', permission: 'inventory.read', volume: '842 productos', state: '2 alertas' },
  { label: 'Ventas', route: 'salesOrders', permission: 'sales.orders.read', volume: '64 pedidos', state: 'Operativo' },
  { label: 'Recursos Humanos', route: 'employees', permission: 'hr.read', volume: '48 colaboradores', state: 'Operativo' },
  { label: 'Analítica', route: 'reports', permission: 'reports.read', volume: '12 reportes', state: 'Actualizado' },
];

function SectionTitle({ title, subtitle, action }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

function FilterButton({ label, value, onPress, compact = false }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterButton, compact && styles.filterButtonCompact]}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Text style={styles.filterValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.filterCaret}>⌄</Text>
    </Pressable>
  );
}

function MetricCard({ label, value, change, icon, detail, tone = 'orange' }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={[styles.metricIconBox, tone === 'green' && styles.metricIconGreen]}>
          <Text style={[styles.metricIcon, tone === 'green' && styles.metricIconGreenText]}>{icon}</Text>
        </View>
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <View style={styles.metricBottom}>
        <Text style={[styles.metricChange, tone === 'green' && styles.metricChangeGreen]}>{change}</Text>
        <Text style={styles.metricDetail}>{detail}</Text>
      </View>
      <View style={[styles.metricAccent, tone === 'green' && styles.metricAccentGreen]} />
    </View>
  );
}

function BarChart() {
  const maxValue = Math.max(...SALES);
  return (
    <View style={styles.barChart}>
      <View style={[styles.chartGuideRow, { top: 16 }]}>
        <Text style={styles.chartAxisLabel}>$1.2 M</Text>
        <View style={styles.chartGuide} />
      </View>
      <View style={[styles.chartGuideRow, { top: 86 }]}>
        <Text style={styles.chartAxisLabel}>$600 k</Text>
        <View style={styles.chartGuide} />
      </View>
      <View style={styles.barColumns}>
        {SALES.map((amount, index) => (
          <View key={MONTH_LABELS[index]} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, index === SALES.length - 1 && styles.barCurrent, { height: `${(amount / maxValue) * 100}%` }]} />
            </View>
            <Text style={[styles.barLabel, index === SALES.length - 1 && styles.chartLabelActive]}>{MONTH_LABELS[index]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.barLegend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>Ventas netas · miles MXN</Text>
      </View>
    </View>
  );
}

function LineChart({ width }) {
  const chartWidth = Math.max(240, Math.min(600, width));
  const chartHeight = 152;
  const plotHeight = 112;
  const points = MARGINS.map((value, index) => ({
    x: 12 + (index * (chartWidth - 24)) / (MARGINS.length - 1),
    y: 10 + ((36 - value) / 16) * plotHeight,
  }));

  return (
    <View style={styles.lineChart}>
      <View style={[styles.linePlot, { width: chartWidth, height: chartHeight }]}>
        {[0, 1, 2].map((line) => <View key={line} style={[styles.lineGuide, { top: 24 + line * 42 }]} />)}
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1];
          const deltaX = next.x - point.x;
          const deltaY = next.y - point.y;
          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const angle = Math.atan2(deltaY, deltaX);
          return (
            <View
              key={`segment-${index}`}
              style={[styles.lineSegment, { left: (point.x + next.x - length) / 2, top: (point.y + next.y) / 2 - 1, width: length, transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }] }]}
            />
          );
        })}
        {points.map((point, index) => (
          <View key={`point-${index}`} style={[styles.linePoint, index === points.length - 1 && styles.linePointCurrent, { left: point.x - 5, top: point.y - 5 }]} />
        ))}
        <View style={styles.lineAxisLabels}>
          {MONTH_LABELS.map((month, index) => <Text key={month} style={[styles.barLabel, index === MONTH_LABELS.length - 1 && styles.chartLabelActive]}>{month}</Text>)}
        </View>
      </View>
      <View style={styles.barLegend}>
        <View style={[styles.legendDot, styles.legendDotGreen]} />
        <Text style={styles.legendText}>Margen bruto · porcentaje</Text>
        <Text style={styles.lineLatest}>35%</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { can, session } = useAuth();
  const { go } = useNav();
  const { width } = useWindowDimensions();
  const [kpis, setKpis] = useState(null);
  const [period, setPeriod] = useState('Este mes');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [entity, setEntity] = useState('Todas las entidades');
  const { company, branch } = session || {};
  const chartWidth = width < 720 ? width - 88 : (width - 390) / 2;

  useEffect(() => {
    let cancelled = false;
    if (can('reports.read')) {
      api('/reports/kpis')
        .then((data) => { if (!cancelled) setKpis(data); })
        .catch(() => { if (!cancelled) setKpis(null); });
    }
    return () => { cancelled = true; };
  }, [can]);

  const reportAccess = can('reports.read');
  const visibleModules = PRIMARY_MODULES.filter((module) => can(module.permission));
  const categories = MENU_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter((item) => item.permission && can(item.permission)),
  })).filter((category) => category.items.length > 0);
  const monthIndex = MONTHS.indexOf(month);
  const alertRows = CRITICAL_ALERTS.filter((_, index) => index !== 2 || can('sales.orders.read'));

  const cycleMonth = () => setMonth(MONTHS[(monthIndex + 1) % MONTHS.length]);
  const cycleEntity = () => setEntity((current) => (
    current === 'Todas las entidades' ? (branch?.name || company?.name || 'Entidad principal') : 'Todas las entidades'
  ));

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.statusDot} />
            <Text style={styles.eyebrow}>CRABERP TECHNOLOGIES</Text>
          </View>
          <Text style={styles.pageTitle}>Resumen Ejecutivo</Text>
          <Text style={styles.pageSubtitle}>Conectando procesos, impulsando empresas.</Text>
        </View>
        <View style={styles.headerDate}>
          <Text style={styles.dateLabel}>ACTUALIZADO</Text>
          <Text style={styles.dateValue}>{dateOf(new Date())}</Text>
        </View>
        <View pointerEvents="none" style={styles.circuitPattern}>
          <View style={styles.circuitLineOne} /><View style={styles.circuitLineTwo} />
          <View style={styles.circuitNodeOne} /><View style={styles.circuitNodeTwo} />
        </View>
      </View>

      <View style={styles.controlBar}>
        <View style={styles.filters}>
          <View style={styles.yearFilter}>
            <Text style={styles.filterLabel}>AÑO</Text>
            <Pressable onPress={() => setYear((value) => value - 1)} style={styles.yearArrow}><Text style={styles.yearArrowText}>‹</Text></Pressable>
            <Text style={styles.yearValue}>{year}</Text>
            <Pressable onPress={() => setYear((value) => value + 1)} style={styles.yearArrow}><Text style={styles.yearArrowText}>›</Text></Pressable>
          </View>
          <FilterButton label="MES" value={month} onPress={cycleMonth} />
          <FilterButton label="ENTIDAD" value={entity} onPress={cycleEntity} compact />
        </View>
        <View style={styles.periodControl}>
          {['Hoy', 'Esta semana', 'Este mes'].map((option) => (
            <Pressable key={option} onPress={() => setPeriod(option)} style={[styles.periodButton, period === option && styles.periodButtonActive]}>
              <Text style={[styles.periodText, period === option && styles.periodTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Ventas totales" value={reportAccess ? money(kpis?.sales?.total ?? 1284500) : '—'} change="↑ 12.8%" detail={`${kpis?.sales?.count ?? 64} pedidos`} icon="$" />
        <MetricCard label="Pedidos pendientes" value={can('sales.orders.read') ? '18' : '—'} change="6 requieren acción" detail="vs. 23 semana anterior" icon="↗" tone="green" />
        <MetricCard label="Margen bruto" value={reportAccess ? '34.8%' : '—'} change="↑ 2.4 pts" detail="objetivo: 32%" icon="%" />
        <MetricCard label="Nuevos leads" value={can('crm.read') ? '26' : '—'} change="↑ 18.2%" detail="9 calificados" icon="＋" tone="green" />
      </View>

      <View style={styles.chartGrid}>
        <View style={styles.panel}>
          <SectionTitle title="Ventas por mes" subtitle="Rendimiento comercial · 6 meses" action={<Text style={styles.panelMeta}>MXN</Text>} />
          <BarChart />
        </View>
        <View style={styles.panel}>
          <SectionTitle title="Tendencia de margen" subtitle="Rentabilidad consolidada · 6 meses" action={<Text style={styles.panelMeta}>+ 2.4 pts</Text>} />
          <LineChart width={chartWidth} />
        </View>
      </View>

      <View style={styles.lowerGrid}>
        <View style={[styles.panel, styles.alertPanel]}>
          <SectionTitle
            title="Alertas críticas"
            subtitle="Elementos que necesitan seguimiento"
            action={<View style={styles.alertCount}><Text style={styles.alertCountText}>{alertRows.length}</Text></View>}
          />
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeading, styles.alertNameColumn]}>ALERTA</Text>
            <Text style={[styles.tableHeading, styles.alertModuleColumn]}>MÓDULO</Text>
            <Text style={[styles.tableHeading, styles.alertStateColumn]}>ESTADO</Text>
            <Text style={[styles.tableHeading, styles.alertDateColumn]}>FECHA</Text>
          </View>
          {alertRows.map((alert) => (
            <View key={alert.title} style={styles.alertRow}>
              <View style={[styles.alertSignal, alert.tone === 'error' && styles.alertSignalError]} />
              <Text style={[styles.tableCell, styles.alertNameColumn]} numberOfLines={2}>{alert.title}</Text>
              <Text style={[styles.tableCell, styles.alertModuleColumn]} numberOfLines={1}>{alert.module}</Text>
              <View style={styles.alertStateColumn}><Text style={[styles.stateBadge, alert.tone === 'error' && styles.stateBadgeError]} numberOfLines={1}>{alert.state}</Text></View>
              <Text style={[styles.tableMeta, styles.alertDateColumn]}>{alert.date}</Text>
            </View>
          ))}
          <Pressable onPress={() => go('stock')} style={styles.tableFooter}>
            <Text style={styles.footerLink}>Revisar alertas de inventario</Text><Text style={styles.footerArrow}>→</Text>
          </Pressable>
        </View>

        <View style={[styles.panel, styles.modulesPanel]}>
          <SectionTitle title="Módulos principales" subtitle="Estado de las áreas de negocio" />
          <View style={styles.moduleTableHeader}>
            <Text style={[styles.tableHeading, styles.moduleNameColumn]}>MÓDULO</Text>
            <Text style={[styles.tableHeading, styles.moduleVolumeColumn]}>ACTIVIDAD</Text>
            <Text style={[styles.tableHeading, styles.moduleStateColumn]}>ESTADO</Text>
          </View>
          {visibleModules.map((module) => (
            <Pressable key={module.route} onPress={() => go(module.route)} style={styles.moduleRow}>
              <View style={styles.moduleNameColumn}><View style={styles.moduleStatusDot} /><Text style={styles.tableCell} numberOfLines={1}>{module.label}</Text></View>
              <Text style={[styles.tableMeta, styles.moduleVolumeColumn]} numberOfLines={1}>{module.volume}</Text>
              <Text style={[styles.moduleState, styles.moduleStateColumn]} numberOfLines={1}>{module.state}</Text>
            </Pressable>
          ))}
          {visibleModules.length === 0 ? <Text style={styles.noModules}>No hay módulos disponibles para este perfil.</Text> : null}
        </View>
      </View>

      <View style={styles.quickAccess}>
        <SectionTitle title="Acceso a módulos" subtitle="Atajos según tus permisos" />
        <View style={styles.moduleLinks}>
          {categories.flatMap((category) => category.items).slice(0, 7).map((item) => (
            <Pressable key={item.route} onPress={() => go(item.route)} style={({ hovered }) => [styles.moduleLink, hovered && styles.moduleLinkHovered]}>
              <Text style={styles.moduleLinkIcon}>{item.icon}</Text>
              <Text style={styles.moduleLinkText} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.moduleLinkArrow}>↗</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.quickActions}>
          {can('sales.orders.create') ? <TTButton variant="primary" size="sm" onPress={() => go('salesOrders')}>+ Nuevo pedido</TTButton> : null}
          {can('products.create') ? <TTButton variant="secondary" size="sm" onPress={() => go('products')}>+ Producto</TTButton> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18, paddingBottom: 34 },
  pageHeader: { minHeight: 112, backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 22, justifyContent: 'center', overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: COLORS.border },
  headerCopy: { gap: 4, zIndex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, fontFamily: TYPOGRAPHY.fontFamily.display },
  pageTitle: { color: COLORS.textPrimary, fontSize: 25, lineHeight: 31, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  pageSubtitle: { color: COLORS.textMuted, fontSize: 12, fontFamily: TYPOGRAPHY.fontFamily.ui },
  headerDate: { position: 'absolute', right: 22, top: 25, alignItems: 'flex-end', zIndex: 1 },
  dateLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  dateValue: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, fontFamily: TYPOGRAPHY.fontFamily.ui },
  circuitPattern: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 240, opacity: 0.55 },
  circuitLineOne: { position: 'absolute', right: 28, top: 26, width: 112, height: 1, backgroundColor: '#B8D2C3' },
  circuitLineTwo: { position: 'absolute', right: 28, top: 26, width: 1, height: 74, backgroundColor: '#B8D2C3' },
  circuitNodeOne: { position: 'absolute', right: 136, top: 21, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: COLORS.secondary },
  circuitNodeTwo: { position: 'absolute', right: 23, top: 94, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: COLORS.accent },
  controlBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  yearFilter: { height: 42, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterButton: { minWidth: 118, maxWidth: 184, height: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm },
  filterButtonCompact: { minWidth: 158 },
  filterLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  filterValue: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', flex: 1, fontFamily: TYPOGRAPHY.fontFamily.ui },
  filterCaret: { color: COLORS.primary, fontSize: 14 },
  yearArrow: { width: 19, height: 24, alignItems: 'center', justifyContent: 'center' },
  yearArrowText: { color: COLORS.primary, fontSize: 20, lineHeight: 23 },
  yearValue: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12, fontFamily: TYPOGRAPHY.fontFamily.ui },
  periodControl: { flexDirection: 'row', padding: 3, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm },
  periodButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: RADIUS.xs },
  periodButtonActive: { backgroundColor: COLORS.primary },
  periodText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', fontFamily: TYPOGRAPHY.fontFamily.ui },
  periodTextActive: { color: '#FFFFFF' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flex: 1, minWidth: 205, minHeight: 132, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16, justifyContent: 'space-between', overflow: 'hidden' },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  metricLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', fontFamily: TYPOGRAPHY.fontFamily.ui },
  metricIconBox: { width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: 'rgba(242,140,40,0.12)', alignItems: 'center', justifyContent: 'center' },
  metricIconGreen: { backgroundColor: 'rgba(72,166,126,0.14)' },
  metricIcon: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  metricIconGreenText: { color: COLORS.primary },
  metricValue: { color: COLORS.accent, fontSize: 24, lineHeight: 30, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display, marginTop: 7 },
  metricBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 5 },
  metricChange: { color: COLORS.accent, fontSize: 10, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.ui },
  metricChangeGreen: { color: COLORS.primary },
  metricDetail: { color: COLORS.textMuted, fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.ui },
  metricAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: COLORS.accent },
  metricAccentGreen: { backgroundColor: COLORS.secondary },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  panel: { flex: 1, minWidth: 310, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 15 },
  sectionHeading: { flex: 1, gap: 3 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  sectionSubtitle: { color: COLORS.textMuted, fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.ui },
  panelMeta: { color: COLORS.primary, fontSize: 10, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.ui },
  barChart: { height: 200, paddingLeft: 42, position: 'relative', justifyContent: 'flex-end' },
  chartGuideRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartAxisLabel: { width: 34, color: '#98958C', fontSize: 8, textAlign: 'right', fontFamily: TYPOGRAPHY.fontFamily.ui },
  chartGuide: { flex: 1, height: 1, backgroundColor: '#EEEAE2' },
  barColumns: { height: 172, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#E8E4DC' },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  barTrack: { height: 142, width: '52%', maxWidth: 38, justifyContent: 'flex-end', overflow: 'hidden', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  bar: { width: '100%', backgroundColor: '#9DCBB3', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barCurrent: { backgroundColor: COLORS.accent },
  barLabel: { color: '#858279', fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.ui },
  chartLabelActive: { color: COLORS.textPrimary, fontWeight: '700' },
  barLegend: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  legendDotGreen: { backgroundColor: COLORS.primary },
  legendText: { flex: 1, color: COLORS.textMuted, fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.ui },
  lineChart: { minHeight: 200, justifyContent: 'flex-end', alignItems: 'center' },
  linePlot: { position: 'relative', maxWidth: '100%' },
  lineGuide: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#EEEAE2' },
  lineSegment: { position: 'absolute', height: 2, backgroundColor: COLORS.primary, borderRadius: 2 },
  linePoint: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: COLORS.secondary },
  linePointCurrent: { width: 11, height: 11, borderRadius: 6, borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  lineAxisLabels: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' },
  lineLatest: { color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  lowerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  alertPanel: { flex: 1.25, minWidth: 440 },
  modulesPanel: { flex: 1, minWidth: 330 },
  alertCount: { minWidth: 24, height: 24, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill, backgroundColor: 'rgba(242,140,40,0.14)' },
  alertCountText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeading: { color: '#8B8981', fontSize: 8, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  alertNameColumn: { flex: 1.6 },
  alertModuleColumn: { flex: 0.8 },
  alertStateColumn: { flex: 1.05 },
  alertDateColumn: { flex: 0.85, textAlign: 'right' },
  alertRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#F0EDE7' },
  alertSignal: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  alertSignalError: { backgroundColor: COLORS.error },
  tableCell: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '500', fontFamily: TYPOGRAPHY.fontFamily.ui },
  tableMeta: { color: COLORS.textMuted, fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.ui },
  stateBadge: { alignSelf: 'flex-start', color: '#9A5B13', backgroundColor: 'rgba(242,140,40,0.13)', overflow: 'hidden', borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 4, fontSize: 8, fontWeight: '600', fontFamily: TYPOGRAPHY.fontFamily.ui },
  stateBadgeError: { color: '#A84338', backgroundColor: 'rgba(196,75,63,0.11)' },
  tableFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  footerLink: { color: COLORS.primary, fontSize: 10, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.ui },
  footerArrow: { color: COLORS.primary, fontSize: 15 },
  moduleTableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  moduleNameColumn: { flex: 1.15, flexDirection: 'row', alignItems: 'center', gap: 7 },
  moduleVolumeColumn: { flex: 1, textAlign: 'left' },
  moduleStateColumn: { flex: 0.8, textAlign: 'right' },
  moduleRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#F0EDE7' },
  moduleStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary },
  moduleState: { color: COLORS.primary, fontSize: 9, fontWeight: '600', fontFamily: TYPOGRAPHY.fontFamily.ui },
  noModules: { paddingVertical: 18, color: COLORS.textMuted, fontSize: 11, fontFamily: TYPOGRAPHY.fontFamily.ui },
  quickAccess: { gap: 4 },
  moduleLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moduleLink: { minWidth: 158, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm },
  moduleLinkHovered: { borderColor: COLORS.secondary, backgroundColor: '#F8FBF8' },
  moduleLinkIcon: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  moduleLinkText: { flex: 1, color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', fontFamily: TYPOGRAPHY.fontFamily.ui },
  moduleLinkArrow: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});