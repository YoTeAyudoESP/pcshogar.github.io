const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.ts', 'utf8');

// The keys to inject:
const en_keys = {
    'Remanente mes anterior:': 'Previous month remnant:',
    'Cuentas y Tarjetas': 'Cards & Accounts',
    'Huchas': 'Savings Jars',
    'Movimientos Fijos': 'Fixed Movements',
    'Categorías': 'Categories',
    'Ajustes Saldo': 'Balance Adjustments',
    'Aplicación': 'Application',
    'Gestión de Usuarios': 'User Management',
    'Acerca de': 'About',
    'Gasto': 'Expense',
    'Nuevo Gasto': 'New Expense',
    'Ingreso': 'Income',
    'Nuevo Ingreso': 'New Income',
    'Devolución': 'Refund',
    'Nueva Devolución': 'New Refund',
    'Ahorrar': 'Save',
    'Traspaso': 'Transfer',
    'Transferencia': 'Transfer',
    'Informe': 'Report',
    'Informe PDF': 'PDF Report',
    'Evolución': 'Evolution',
};

const fr_keys = {
    'Remanente mes anterior:': 'Reste du mois précédent :',
    'Cuentas y Tarjetas': 'Comptes et Cartes',
    'Huchas': 'Tirelires',
    'Movimientos Fijos': 'Mouvements fixes',
    'Categorías': 'Catégories',
    'Ajustes Saldo': 'Ajustements de solde',
    'Aplicación': 'Application',
    'Gestión de Usuarios': 'Gestion des Utilisateurs',
    'Acerca de': 'À propos',
    'Gasto': 'Dépense',
    'Nuevo Gasto': 'Nouvelle Dépense',
    'Ingreso': 'Revenu',
    'Nuevo Ingreso': 'Nouveau Revenu',
    'Devolución': 'Remboursement',
    'Nueva Devolución': 'Nouveau Remboursement',
    'Ahorrar': 'Épargner',
    'Traspaso': 'Transfert',
    'Transferencia': 'Transfert',
    'Informe': 'Rapport',
    'Informe PDF': 'Rapport PDF',
    'Evolución': 'Évolution',
};

const de_keys = {
    'Remanente mes anterior:': 'Restbetrag Vormonat:',
    'Cuentas y Tarjetas': 'Konten und Karten',
    'Huchas': 'Spardosen',
    'Movimientos Fijos': 'Feste Bewegungen',
    'Categorías': 'Kategorien',
    'Ajustes Saldo': 'Saldoanpassungen',
    'Aplicación': 'Anwendung',
    'Gestión de Usuarios': 'Benutzerverwaltung',
    'Acerca de': 'Über',
    'Gasto': 'Ausgabe',
    'Nuevo Gasto': 'Neue Ausgabe',
    'Ingreso': 'Einnahme',
    'Nuevo Ingreso': 'Neue Einnahme',
    'Devolución': 'Rückerstattung',
    'Nueva Devolución': 'Neue Rückerstattung',
    'Ahorrar': 'Sparen',
    'Traspaso': 'Übertragung',
    'Transferencia': 'Überweisung',
    'Informe': 'Bericht',
    'Informe PDF': 'PDF-Bericht',
    'Evolución': 'Entwicklung',
};

const it_keys = {
    'Remanente mes anterior:': 'Rimanenza mese precedente:',
    'Cuentas y Tarjetas': 'Conti e Carte',
    'Huchas': 'Salvadanaio',
    'Movimientos Fijos': 'Movimenti fissi',
    'Categorías': 'Categorie',
    'Ajustes Saldo': 'Regolazioni Saldo',
    'Aplicación': 'Applicazione',
    'Gestión de Usuarios': 'Gestione Utenti',
    'Acerca de': 'Info',
    'Gasto': 'Spesa',
    'Nuevo Gasto': 'Nuova Spesa',
    'Ingreso': 'Entrata',
    'Nuevo Ingreso': 'Nuova Entrata',
    'Devolución': 'Rimborso',
    'Nueva Devolución': 'Nuovo Rimborso',
    'Ahorrar': 'Risparmiare',
    'Traspaso': 'Trasferimento',
    'Transferencia': 'Bonifico',
    'Informe': 'Report',
    'Informe PDF': 'Report PDF',
    'Evolución': 'Evoluzione',
};

const pt_keys = {
    'Remanente mes anterior:': 'Restante do mês anterior:',
    'Cuentas y Tarjetas': 'Contas e Cartões',
    'Huchas': 'Mealheiros',
    'Movimientos Fijos': 'Movimentos fixos',
    'Categorías': 'Categorias',
    'Ajustes Saldo': 'Ajustes de Saldo',
    'Aplicación': 'Aplicação',
    'Gestión de Usuarios': 'Gestão de Utilizadores',
    'Acerca de': 'Sobre',
    'Gasto': 'Despesa',
    'Nuevo Gasto': 'Nova Despesa',
    'Ingreso': 'Receita',
    'Nuevo Ingreso': 'Nova Receita',
    'Devolución': 'Reembolso',
    'Nueva Devolución': 'Novo Reembolso',
    'Ahorrar': 'Poupar',
    'Traspaso': 'Transferência',
    'Transferencia': 'Transferência',
    'Informe': 'Relatório',
    'Informe PDF': 'Relatório PDF',
    'Evolución': 'Evolução',
};

function injectDictionary(lang, keys) {
    const langKey = "    " + lang + ": {";
    let injection = "";
    for(const k in keys) {
        injection += "        '" + k + "': '" + keys[k] + "',\n";
    }
    content = content.replace(langKey, langKey + "\n" + injection);
}

injectDictionary('en', en_keys);
injectDictionary('fr', fr_keys);
injectDictionary('de', de_keys);
injectDictionary('it', it_keys);
injectDictionary('pt', pt_keys);

fs.writeFileSync('src/utils/i18n.ts', content, 'utf8');
