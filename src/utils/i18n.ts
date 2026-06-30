export type LanguageCode = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';

export const translations: Record<LanguageCode, Record<string, string>> = {
    es: {
        'settings.title': 'Ajustes',
        'settings.language': 'Idioma',
        'settings.currency': 'Moneda Principal',
        'settings.theme': 'Tema Visual',
        'dashboard.title': 'Dashboard',
        'dashboard.balance': 'Balance',
        'dashboard.expenses': 'Gastos',
        'dashboard.incomes': 'Ingresos',
        'dashboard.savings': 'Ahorros',
        'app.loading': 'Cargando...',
    },
    en: {
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.currency': 'Main Currency',
        'settings.theme': 'Visual Theme',
        'dashboard.title': 'Dashboard',
        'dashboard.balance': 'Balance',
        'dashboard.expenses': 'Expenses',
        'dashboard.incomes': 'Incomes',
        'dashboard.savings': 'Savings',
        'app.loading': 'Loading...',
    },
    fr: {
        'settings.title': 'Paramètres',
        'settings.language': 'Langue',
        'settings.currency': 'Devise Principale',
        'settings.theme': 'Thème Visuel',
        'dashboard.title': 'Tableau de bord',
        'dashboard.balance': 'Solde',
        'dashboard.expenses': 'Dépenses',
        'dashboard.incomes': 'Revenus',
        'dashboard.savings': 'Économies',
        'app.loading': 'Chargement...',
    },
    de: {
        'settings.title': 'Einstellungen',
        'settings.language': 'Sprache',
        'settings.currency': 'Hauptwährung',
        'settings.theme': 'Visuelles Thema',
        'dashboard.title': 'Armaturenbrett',
        'dashboard.balance': 'Gleichgewicht',
        'dashboard.expenses': 'Ausgaben',
        'dashboard.incomes': 'Einkommen',
        'dashboard.savings': 'Ersparnisse',
        'app.loading': 'Laden...',
    },
    it: {
        'settings.title': 'Impostazioni',
        'settings.language': 'Lingua',
        'settings.currency': 'Valuta Principale',
        'settings.theme': 'Tema Visivo',
        'dashboard.title': 'Pannello di controllo',
        'dashboard.balance': 'Equilibrio',
        'dashboard.expenses': 'Spese',
        'dashboard.incomes': 'Reddito',
        'dashboard.savings': 'Risparmio',
        'app.loading': 'Caricamento...',
    },
    pt: {
        'settings.title': 'Configurações',
        'settings.language': 'Idioma',
        'settings.currency': 'Moeda Principal',
        'settings.theme': 'Tema Visual',
        'dashboard.title': 'Painel',
        'dashboard.balance': 'Saldo',
        'dashboard.expenses': 'Despesas',
        'dashboard.incomes': 'Rendimentos',
        'dashboard.savings': 'Poupança',
        'app.loading': 'Carregando...',
    }
};

export function getTranslation(lang: string, key: string): string {
    const code = (lang as LanguageCode) || 'es';
    const dict = translations[code] || translations['es'];
    return dict[key] || translations['es'][key] || key;
}
