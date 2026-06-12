export interface ChangelogEntry {
  version: string;
  releaseNotes: string;
}

export const changelogHistory: ChangelogEntry[] = [
  {
    version: '1.4.0',
    releaseNotes: `Novedades v1.4.0:
- Informes PDF Profesionales: Corregido el problema de corte de contenido en los informes. Ahora las secciones (Resumen de Saldos, Desglose por Categorías, Metas de Ahorro y Mayores Gastos) se organizan en páginas independientes para evitar desbordes y cortes.
- Numeración Dinámica: Añadida numeración secuencial 'Página X de Y' en todos los informes.
- Agrupación Inteligente: Las categorías adicionales se agrupan automáticamente bajo 'Otras categorías' en la primera página para un formato más limpio y profesional.`
  },
  {
    version: '1.3.12',
    releaseNotes: `Novedades v1.3.12:
- Corrección de cierre/cuelgue en informes PDF: Optimizada la memoria de renderizado en Android para evitar que la aplicación se minimice o cierre al generar informes con muchas transacciones (reducción de escala y liberación forzada de recursos gráficos).`
  },
  {
    version: '1.3.11',
    releaseNotes: `Novedades v1.3.11:
- Informes PDF en Android: Implementada la función de compartir nativa en lugar del guardado tradicional. Ahora puedes generar informes de PDF en cualquier versión de Android y compartirlos directamente por WhatsApp, guardarlos en Google Drive, o guardarlos localmente sin necesidad de configurar permisos manuales de almacenamiento.`
  },
  {
    version: '1.3.10',
    releaseNotes: `Novedades v1.3.10:
- Ventana de Huchas mejorada: Se ha extraído la ventana superpuesta de financiación de huchas del contenedor con scroll. Ahora se posiciona de manera fija sobre toda la pantalla sin recortarse ni verse afectada por el scroll del formulario principal.`
  },
  {
    version: '1.3.9',
    releaseNotes: `Novedades v1.3.9:
- Historial acumulativo: Ahora verás los cambios de todas las versiones que te saltes al actualizar.
- Sincronización en la nube: Corregido el saldo bancario al confirmar gastos fijos modificados en Dropbox/Drive.
- Botón Atrás de Android: Arreglado el retroceso en huchas y ajustes para evitar desmontajes accidentales.
- Área segura en móviles: Ajustado el encabezado de huchas para que no sea tapado por la barra de estado.
- Textos limpios: Eliminado el término 'Superior' en los formularios de ingresos.`
  },
  {
    version: '1.3.8',
    releaseNotes: `Novedades v1.3.8:
- Interfaz táctil premium para Huchas: Selector a pantalla completa adaptado para móviles, con inputs grandes y botones 'Máx' rápidos.
- Visualización con diseño de tarjetas: El modal de novedades ahora decora los cambios como tarjetas independientes con iconos de check.
- Banner de periodo en movimientos fijos: Añadido un aviso informativo que muestra claramente qué mes se está auditando y cómo cambiarlo.
- Gráficas con gastos brutos: El gráfico de evolución anual en el Dashboard ahora muestra el gasto real bruto consolidado de las arcas.`
  },
  {
    version: '1.3.4',
    releaseNotes: `Novedades v1.3.4:
- Mejoras de Sincronización: Optimización en la subida automática a la nube (Dropbox y Google Drive).
- Optimización de Rendimiento: Reducción del tiempo de carga inicial y refinado en transacciones locales.
- Correcciones en Categorías: Arreglado un bug visual al asignar iconos personalizados a categorías de gastos.`
  },
  {
    version: '1.3.0',
    releaseNotes: `Novedades v1.3.0:
- Soporte Multi-dispositivo: Se ha mejorado la sincronización automática en segundo plano al abrir y cerrar la app.
- Pestaña de Gestión y Ajustes: Nueva estructura interna simplificada con navegación táctil mejorada.
- Historial de Devoluciones: Posibilidad de revertir o registrar retornos parciales sobre gastos existentes.`
  },
  {
    version: '1.2.5',
    releaseNotes: `Novedades v1.2.5:
- Gestión Premium de Huchas: Implementada la vinculación directa de huchas con objetivos de ahorro.
- Filtro Mensual de Gráficas: Ahora las gráficas se actualizan inmediatamente al cambiar de mes desde el selector superior.`
  }
];

/**
 * Compara dos versiones semánticas (SemVer).
 * Retorna:
 *   - un número positivo si v1 > v2
 *   - un número negativo si v1 < v2
 *   - 0 si v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 !== val2) {
      return val1 - val2;
    }
  }
  return 0;
}
