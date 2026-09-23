export const i18n = {
  t: (key: string) => {
    const translations: Record<string, string> = {
      login: 'Iniciar sesión',
      dashboard: 'Dashboard vacío',
      welcome: 'Bienvenido(a)',
      company: 'Empresa'
    };

    return translations[key] ?? key;
  }
};
