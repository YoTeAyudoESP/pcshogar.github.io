const fs = require('fs');
const glob = require('glob');
const path = require('path');

const srcPath = path.join(process.cwd(), 'src');
const files = glob.sync('**/*.tsx', { cwd: srcPath, absolute: true });

const dictionary = [
    'Gestión y Ajustes', 'Ingresos', 'Gastos', 'Ahorros', 'Préstamos', 'Tarjetas y Cuentas', 
    'Saldo disponible:', 'Saldo en huchas:', 'Total ahorrado:', 'Acciones Pendientes', 
    'Actividad y Evolución (Último Año)', 'Dinero libre actual', 'Disponible', 'Añadir Gasto', 
    'Añadir Ingreso', 'Nueva Transferencia', 'Nuevo Préstamo', 'Nueva Cuenta', 'Configuración del Sistema', 
    'Idioma', 'Moneda Principal', 'Tema Visual', 'Conexión y Sincronización en la Nube', 'Desconectado', 
    'Conectado', 'Cambiar', 'Guardar', 'Cancelar', 'Cerrar', 'Eliminar', 'Editar', 'Ver Reporte', 
    'Ajustes', 'Buscar...', 'Fecha', 'Categoría', 'Concepto', 'Cantidad', 'Estado', 'Pagado', 
    'Pendiente', 'Cobrado', 'No hay transacciones'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    dictionary.forEach(word => {
        // Match >Word<
        const reg1 = new RegExp('>( *?)(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')( *?)<', 'g');
        if (reg1.test(content)) {
            content = content.replace(reg1, '>$1{t(\'$2\')}$3<');
            changed = true;
        }
        
        // Match placeholder="Word"
        const reg2 = new RegExp('placeholder=([\"\'])(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')([\"\'])', 'g');
        if (reg2.test(content)) {
            content = content.replace(reg2, 'placeholder={t(\'$2\')}');
            changed = true;
        }
    });

    if (changed) {
        // 1. Add import
        if (!content.includes('useTranslation')) {
            const fileDir = path.dirname(file);
            let relativePath = path.relative(fileDir, path.join(srcPath, 'hooks', 'useTranslation'));
            relativePath = relativePath.replace(/\\/g, '/');
            if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
            const importStmt = 'import { useTranslation } from \'' + relativePath + '\';\n';
            
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLastImport + 1) + importStmt + content.slice(endOfLastImport + 1);
            } else {
                content = importStmt + content;
            }
        }
        
        // 2. Add const { t } = useTranslation(); inside the component
        const compRegex = /(const [A-Z][a-zA-Z0-9_]+:?\s*(?:React\.FC<.*?>)?\s*=\s*\([^\)]*\)\s*=>\s*\{)|(export default function [A-Z][a-zA-Z0-9_]+\s*\([^\)]*\)\s*\{)/;
        const match = content.match(compRegex);
        
        if (match && !content.includes('const { t } = useTranslation();')) {
            const index = match.index + match[0].length;
            content = content.slice(0, index) + '\n    const { t } = useTranslation();' + content.slice(index);
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log('Translated', file);
    }
});
