import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
  getResponsiveLayout,
} from '../design-system/tokens';
import { TTAvatar, TTIcon, TTSearch } from '../design-system/components';
import { useNav } from '../nav/RouterContext';
import { FaiLogo, FaiLogoIcon } from './FaiLogo';

/** Categorías del menú de FAI Solution ERP. */
export const MENU_CATEGORIES = [
  {
    category: 'PRINCIPAL',
    items: [
      { route: 'home', label: 'Dashboard', icon: 'dashboard', permission: null },
      { route: 'accounts', label: 'Finanzas', icon: 'finanzas', permission: 'finance.accounts.read' },
      { route: 'stock', label: 'Inventario', icon: 'inventario', permission: 'inventory.read' },
      { route: 'salesOrders', label: 'Ventas', icon: 'ventas', permission: 'sales.orders.read' },
      { route: 'employees', label: 'Recursos Humanos', icon: 'rrhh', permission: 'hr.read' },
      { route: 'reports', label: 'Analítica', icon: 'analitica', permission: 'reports.read' },
      { route: 'users', label: 'Configuración', icon: 'configuracion', permission: 'users.read' },
    ],
  },
  {
    category: 'OPERACIONES',
    items: [
      { route: 'products', label: 'Productos', icon: 'productos', permission: 'products.read' },
      { route: 'warehouses', label: 'Almacenes', icon: 'almacen', permission: 'warehouses.read' },
      { route: 'movements', label: 'Movimientos', icon: 'intercambio', permission: 'inventory.read' },
      { route: 'counts', label: 'Inventarios Físicos', icon: 'documento', permission: 'inventory.read' },
      { route: 'suppliers', label: 'Proveedores', icon: 'proveedores', permission: 'suppliers.read' },
      { route: 'purchaseOrders', label: 'Órdenes de Compra', icon: 'ordenes', permission: 'purchases.read' },
      { route: 'customers', label: 'Clientes', icon: 'clientes', permission: 'customers.read' },
    ],
  },
  {
    category: 'FINANZAS',
    items: [
      { route: 'incomes', label: 'Ingresos', icon: 'dinero', permission: 'finance.income.read' },
      { route: 'expenses', label: 'Gastos', icon: 'gastos', permission: 'finance.expenses.read' },
      { route: 'budgets', label: 'Presupuestos', icon: 'documento', permission: 'finance.budgets.read' },
    ],
  },
  {
    category: 'NEGOCIO',
    items: [
      { route: 'leads', label: 'CRM / Leads', icon: 'objetivo', permission: 'crm.read' },
      { route: 'boms', label: 'Listas BOM', icon: 'fabrica', permission: 'production.read' },
      { route: 'productionOrders', label: 'Órdenes Producción', icon: 'fabrica', permission: 'production.read' },
    ],
  },
  {
    category: 'ADMINISTRACIÓN',
    items: [
      { route: 'branches', label: 'Sucursales', icon: 'ubicacion', permission: 'branches.read' },
      { route: 'roles', label: 'Roles y Permisos', icon: 'escudo', permission: 'roles.read' },
      { route: 'audit', label: 'Auditoría', icon: 'ver', permission: 'audit.read' },
    ],
  },
];

/** Sección exclusiva del Super Admin de plataforma (va arriba del menú). */
export const PLATFORM_CATEGORY = {
  category: 'PLATAFORMA',
  items: [{ route: 'companies', label: 'Empresas', icon: 'empresa', permission: null }],
};

const ALL_CATEGORIES = [PLATFORM_CATEGORY, ...MENU_CATEGORIES];

const COLLAPSED_STORAGE_KEY = 'fai.menu.collapsed';

/** Secciones del menú que el usuario colapsó (sólo web; sin storage => todas expandidas). */
function loadCollapsedSections() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const saved = JSON.parse(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? Object.fromEntries(saved.map((name) => [name, false])) : {};
  } catch {
    return {};
  }
}

function saveCollapsedSections(expanded) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const collapsed = Object.keys(expanded).filter((name) => expanded[name] === false);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    /* almacenamiento bloqueado: se conserva sólo en memoria */
  }
}

export const MENU = MENU_CATEGORIES.map((cat) => ({
  section: cat.category,
  items: cat.items,
}));

export default function Layout({ children }) {
  const { session, logout, can, isPlatformAdmin, hasCompany } = useAuth();
  const { route, go, back, canGoBack, homeRoute } = useNav();
  const { width } = useWindowDimensions();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  // Todas expandidas por defecto; se recuerdan las que el usuario colapsó.
  const [expandedCategories, setExpandedCategories] = useState(loadCollapsedSections);
  const drawerTranslateX = useRef(new Animated.Value(-288)).current;

  const { isMobile, isTablet } = getResponsiveLayout(width);
  const drawerWidth = Math.min(288, width * 0.86);
  const { company, user, role, branch } = session || {};
  const displayName = [user?.name, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Usuario';
  const companyName = company?.name || (isPlatformAdmin ? 'Plataforma FAI' : 'FAI Solution ERP');
  const roleName = role?.label || role?.code || 'Usuario';
  const isSidebarCollapsed = isTablet || collapsed;

  // Super Admin sin empresa: sólo la sección Plataforma.
  const visibleCategories = [
    ...(isPlatformAdmin ? [PLATFORM_CATEGORY] : []),
    ...(hasCompany ? MENU_CATEGORIES : []),
  ];
  const filteredCategories = visibleCategories.map((category) => ({
    ...category,
    items: category.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((category) => category.items.length > 0);

  const currentItem = ALL_CATEGORIES.flatMap((category) => category.items).find((item) => item.route === route.name);
  const currentCategory = ALL_CATEGORIES.find((category) => category.items.some((item) => item.route === route.name));
  const breadcrumbs = ['FAI Solution ERP', ...(currentCategory ? [currentCategory.category] : [])];

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    drawerTranslateX.setValue(-drawerWidth);
    Animated.timing(drawerTranslateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerTranslateX, drawerWidth, mobileDrawerOpen]);

  const closeMobileDrawer = () => {
    Animated.timing(drawerTranslateX, {
      toValue: -drawerWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMobileDrawerOpen(false);
    });
  };

  const handleNavigate = (routeName) => {
    go(routeName);
    if (mobileDrawerOpen) closeMobileDrawer();
  };

  const toggleCategory = (category) => {
    setExpandedCategories((current) => {
      const next = { ...current, [category]: current[category] === false };
      saveCollapsedSections(next);
      return next;
    });
  };

  const renderNavSection = (category) => {
    const isExpanded = isSidebarCollapsed || expandedCategories[category.category] !== false;
    return (
      <View key={category.category} style={styles.navCategory}>
        {!isSidebarCollapsed ? (
          <Pressable
            onPress={() => toggleCategory(category.category)}
            style={styles.navCategoryToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            <Text style={styles.navCategoryTitle}>{category.category}</Text>
            <TTIcon name={isExpanded ? 'chevronAbajo' : 'flechaDerecha'} size={16} color={COLORS.sidebarTextMuted} />
          </Pressable>
        ) : null}
        {isExpanded ? category.items.map((item) => {
          const isActive = route.name === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => handleNavigate(item.route)}
              style={({ hovered }) => [
                styles.navItem,
                isSidebarCollapsed && styles.navItemCollapsed,
                isActive && styles.navItemActive,
                hovered && !isActive && styles.navItemHovered,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <TTIcon
                name={item.icon}
                size={20}
                color={isActive ? COLORS.sidebarActiveIndicator : COLORS.sidebarText}
              />
              {!isSidebarCollapsed ? (
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        }) : null}
      </View>
    );
  };

  const renderHelpLinks = (iconsOnly = false) => (
    <View style={[styles.helpLinks, iconsOnly && styles.helpLinksCollapsed]}>
      <Pressable disabled style={styles.helpLink} accessibilityState={{ disabled: true }}>
        <TTIcon name="documento" size={18} color={COLORS.sidebarTextMuted} />
        {!iconsOnly ? <Text style={styles.helpText}>Guía de usuario</Text> : null}
      </Pressable>
      <Pressable disabled style={styles.helpLink} accessibilityState={{ disabled: true }}>
        <TTIcon name="ayuda" size={18} color={COLORS.sidebarTextMuted} />
        {!iconsOnly ? <Text style={styles.helpText}>Soporte</Text> : null}
      </Pressable>
    </View>
  );

  const renderProfileCard = (compact = false) => (
    <Pressable
      style={[styles.profileCard, compact && styles.profileCardCollapsed]}
      onPress={() => setUserMenuOpen((open) => !open)}
      accessibilityLabel="Abrir menú de usuario"
    >
      <TTAvatar name={displayName} size="md" color={COLORS.sidebarText} />
      {!compact ? (
        <View style={styles.profileMeta}>
          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || roleName}</Text>
        </View>
      ) : null}
      {!compact ? <TTIcon name="chevronAbajo" size={16} color={COLORS.sidebarTextMuted} /> : null}
    </Pressable>
  );

  return (
    <View style={styles.shell}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        {isMobile ? (
          <>
            <FaiLogo size="md" variant="dark" showTag={false} />
            <View style={styles.mobileHeaderActions}>
              <Pressable onPress={() => setUserMenuOpen((open) => !open)} accessibilityLabel="Abrir menú de usuario">
                <TTAvatar name={displayName} size="sm" color={COLORS.sidebarText} />
              </Pressable>
              <Pressable style={styles.mobileMenuButton} onPress={() => setMobileDrawerOpen(true)} accessibilityLabel="Abrir navegación">
                <TTIcon name="menu" size={20} color={COLORS.sidebarText} />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerDesktopLeft}>
              {canGoBack && route.name !== homeRoute ? (
                <Pressable style={styles.backBtn} onPress={back}>
                  <View style={styles.backBtnContent}>
                    <TTIcon name="flechaIzquierda" size={15} color={COLORS.primary} />
                    <Text style={styles.backBtnText}>Volver</Text>
                  </View>
                </Pressable>
              ) : null}
              <View style={styles.headerTitles}>
                <Text style={styles.screenTitle} numberOfLines={1}>{currentItem?.label || 'Dashboard'}</Text>
                <Text style={styles.breadcrumbText} numberOfLines={1}>{breadcrumbs.join('  /  ')}</Text>
              </View>
            </View>
            <View style={styles.headerDesktopRight}>
              <TTSearch
                value={globalSearch}
                onChangeText={setGlobalSearch}
                placeholder="Buscar en FAI Solution ERP…"
                style={styles.globalSearch}
              />
              <View style={styles.companyHeader}>
                <Text style={styles.companyHeaderLabel}>EMPRESA</Text>
                <Text style={styles.companyHeaderName} numberOfLines={1}>{companyName}</Text>
                {branch ? <Text style={styles.companyHeaderBranch} numberOfLines={1}>{branch.name}</Text> : null}
              </View>
              <Pressable style={styles.languageSelector} disabled accessibilityLabel="Idioma: español">
                <Text style={styles.languageText}>ES</Text>
                <TTIcon name="chevronAbajo" size={14} color={COLORS.textMuted} />
              </Pressable>
              <Pressable style={styles.headerAvatar} onPress={() => setUserMenuOpen((open) => !open)} accessibilityLabel="Abrir menú de usuario">
                <TTAvatar name={displayName} size="sm" color={COLORS.accentText} />
              </Pressable>
            </View>
          </>
        )}
      </View>

      {userMenuOpen ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setUserMenuOpen(false)}>
          <Pressable style={styles.menuBackdrop} onPress={() => setUserMenuOpen(false)}>
            <View style={styles.userDropdown}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>{displayName}</Text>
                <Text style={styles.dropdownSub}>{user?.email}</Text>
                <Text style={styles.dropdownRole}>Rol: {roleName}</Text>
              </View>
              {isPlatformAdmin ? (
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setUserMenuOpen(false);
                    go('companies');
                  }}
                >
                  <View style={styles.dropdownItemContent}>
                    <TTIcon name="empresa" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.dropdownItemText}>Empresas</Text>
                  </View>
                </Pressable>
              ) : null}
              {hasCompany ? (
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setUserMenuOpen(false);
                    go('home');
                  }}
                >
                  <View style={styles.dropdownItemContent}>
                    <TTIcon name="dashboard" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.dropdownItemText}>Dashboard</Text>
                  </View>
                </Pressable>
              ) : null}
              {hasCompany && can('users.read') ? (
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setUserMenuOpen(false);
                    go('users');
                  }}
                >
                  <View style={styles.dropdownItemContent}>
                    <TTIcon name="configuracion" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.dropdownItemText}>Configuración</Text>
                  </View>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.dropdownItem, styles.dropdownLogout]}
                onPress={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}

      <View style={[styles.body, isMobile && styles.bodyMobile]}>
        {!isMobile ? (
          <View style={[styles.sidebar, isSidebarCollapsed && styles.sidebarCollapsed]}>
            <View style={styles.sidebarHeader}>
              {isSidebarCollapsed ? (
                <FaiLogoIcon size={28} />
              ) : (
                <View style={styles.brandIdentity}>
                  <FaiLogo size="md" variant="dark" />
                  <Text style={styles.sidebarCompanyName} numberOfLines={1}>{companyName}</Text>
                </View>
              )}
              {!isTablet ? (
                <Pressable style={styles.collapseButton} onPress={() => setCollapsed((value) => !value)} accessibilityLabel={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
                  <TTIcon name={isSidebarCollapsed ? 'flechaDerecha' : 'flechaIzquierda'} size={18} color={COLORS.sidebarText} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
              {filteredCategories.map(renderNavSection)}
            </ScrollView>
            <View style={styles.sidebarFooter}>
              {renderProfileCard(isSidebarCollapsed)}
              {renderHelpLinks(isSidebarCollapsed)}
            </View>
          </View>
        ) : null}

        {isMobile && mobileDrawerOpen ? (
          <Modal transparent visible animationType="none" onRequestClose={closeMobileDrawer}>
            <View style={styles.drawerBackdrop}>
              <Animated.View style={[styles.mobileDrawer, { transform: [{ translateX: drawerTranslateX }] }]}>
                <View style={styles.drawerHeader}>
                  <View style={styles.brandIdentity}>
                    <FaiLogo size="md" variant="dark" />
                    <Text style={styles.sidebarCompanyName} numberOfLines={1}>{companyName}</Text>
                  </View>
                  <Pressable onPress={closeMobileDrawer} accessibilityLabel="Cerrar navegación">
                    <TTIcon name="cerrar" size={20} color={COLORS.sidebarText} />
                  </Pressable>
                </View>
                <ScrollView style={styles.drawerBody}>
                  {filteredCategories.map(renderNavSection)}
                </ScrollView>
                <View style={styles.sidebarFooter}>
                  {renderProfileCard()}
                  {renderHelpLinks()}
                </View>
              </Animated.View>
              <Pressable style={styles.drawerOverlay} onPress={closeMobileDrawer} />
            </View>
          </Modal>
        ) : null}

        <ScrollView style={styles.content} contentContainerStyle={[styles.contentInner, isMobile && styles.contentInnerMobile]}>
          <View style={styles.contentPanel}>{children}</View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 100,
  },
  headerMobile: {
    minHeight: 64,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.sidebarBg,
    borderBottomColor: COLORS.primaryDark,
  },
  mobileHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mobileMenuButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sidebarActiveBg,
  },
  mobileMenuIcon: { color: COLORS.sidebarText, fontSize: 19 },
  headerDesktopLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerTitles: { minWidth: 0, gap: 2 },
  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize['2xl'] + 2,
    lineHeight: 31,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  breadcrumbText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.fontSize.xs, fontFamily: TYPOGRAPHY.fontFamily.ui },
  headerDesktopRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  companyHeader: { maxWidth: 160, gap: 2 },
  companyHeaderLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: TYPOGRAPHY.fontWeight.bold, fontFamily: TYPOGRAPHY.fontFamily.display },
  companyHeaderName: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, fontFamily: TYPOGRAPHY.fontFamily.ui },
  companyHeaderBranch: { color: COLORS.textMuted, fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.ui },
  languageSelector: {
    minWidth: 50,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  languageText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  languageChevron: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.fontSize.sm },
  collapseButton: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sidebarActiveBg,
  },
  collapseButtonText: { color: COLORS.sidebarText, fontSize: 20, lineHeight: 23 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.trendDownBg,
  },
  globalSearch: { width: 220, maxWidth: 220 },
  backBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.background },
  backBtnContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  backBtnText: { color: COLORS.primary, fontSize: TYPOGRAPHY.fontSize.xs + 1, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 84, paddingHorizontal: SPACING.md },
  userDropdown: {
    width: 260,
    maxWidth: '100%',
    padding: SPACING.sm,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.md,
  },
  dropdownHeader: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 2 },
  dropdownTitle: { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.fontWeight.bold, fontSize: TYPOGRAPHY.fontSize.sm },
  dropdownSub: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.fontSize.xs },
  dropdownRole: { color: COLORS.accentText, fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 4 },
  dropdownItem: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md - 2, borderRadius: RADIUS.md },
  dropdownItemContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dropdownItemText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium },
  dropdownLogout: { backgroundColor: COLORS.trendDownBg, marginTop: SPACING.xs },
  logoutText: { color: COLORS.error, fontWeight: TYPOGRAPHY.fontWeight.semibold, fontSize: TYPOGRAPHY.fontSize.sm },
  body: { flex: 1, flexDirection: 'row' },
  bodyMobile: { flexDirection: 'column' },
  sidebar: {
    width: 240,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: 'rgba(245, 238, 219, 0.12)',
  },
  sidebarCollapsed: { width: 72, alignItems: 'center' },
  sidebarHeader: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  brandIdentity: { flex: 1, minWidth: 0, gap: 5 },
  sidebarCompanyName: { color: COLORS.sidebarTextMuted, fontSize: TYPOGRAPHY.fontSize.xs, fontFamily: TYPOGRAPHY.fontFamily.ui },
  sidebarNav: { flex: 1, paddingHorizontal: SPACING.xs },
  navCategory: { marginBottom: SPACING.md },
  navCategoryToggle: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  navCategoryTitle: {
    flex: 1,
    color: COLORS.sidebarTextMuted,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  navCategoryChevron: { color: COLORS.sidebarTextMuted, fontSize: TYPOGRAPHY.fontSize.lg },
  navItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.sidebarBg,
    borderRadius: RADIUS.md,
  },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  navItemActive: { backgroundColor: COLORS.sidebarActiveBg, borderLeftColor: COLORS.sidebarActiveIndicator },
  navItemHovered: { backgroundColor: COLORS.sidebarActiveBg },
  navIcon: { width: 20, color: COLORS.sidebarText, textAlign: 'center', fontSize: 17 },
  navIconActive: { color: COLORS.sidebarActiveIndicator },
  navLabel: { flex: 1, color: COLORS.sidebarText, fontSize: TYPOGRAPHY.fontSize.sm, fontFamily: TYPOGRAPHY.fontFamily.ui, fontWeight: TYPOGRAPHY.fontWeight.medium },
  navLabelActive: { color: COLORS.sidebarText, fontWeight: TYPOGRAPHY.fontWeight.bold },
  sidebarFooter: { gap: SPACING.sm, paddingHorizontal: SPACING.xs, paddingTop: SPACING.md },
  profileCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.sidebarActiveBg,
  },
  profileCardCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  profileMeta: { flex: 1, minWidth: 0, gap: 2 },
  profileName: { color: COLORS.sidebarText, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, fontFamily: TYPOGRAPHY.fontFamily.ui },
  profileEmail: { color: COLORS.sidebarTextMuted, fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.ui },
  profileChevron: { color: COLORS.sidebarTextMuted, fontSize: TYPOGRAPHY.fontSize.md },
  helpLinks: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(18, 23, 15, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 238, 219, 0.08)',
  },
  helpLinksCollapsed: { alignItems: 'center' },
  helpLink: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.sm },
  helpIcon: { width: 18, color: COLORS.sidebarTextMuted, textAlign: 'center', fontSize: TYPOGRAPHY.fontSize.sm },
  helpText: { color: COLORS.sidebarTextMuted, fontSize: TYPOGRAPHY.fontSize.xs, fontFamily: TYPOGRAPHY.fontFamily.ui },
  content: { flex: 1, backgroundColor: COLORS.background },
  contentInner: { flexGrow: 1, padding: SPACING.xl },
  contentInnerMobile: { padding: SPACING.md },
  contentPanel: {
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  drawerBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.backdrop },
  mobileDrawer: { width: 288, maxWidth: '86%', height: '100%', backgroundColor: COLORS.sidebarBg, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md },
  drawerOverlay: { flex: 1 },
  drawerHeader: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sidebarActiveBg,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  closeDrawerText: { color: COLORS.sidebarText, fontSize: 20, padding: SPACING.xs },
});