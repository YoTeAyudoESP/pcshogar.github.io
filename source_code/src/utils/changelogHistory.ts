export interface ChangelogEntry {
  version: string;
  releaseNotes: string;
}

export const changelogHistory: ChangelogEntry[] = [
  {
    version: '2.4.3',
    releaseNotes: `Novedades v2.4.3:
- 📄 Corrección en Cuadro de Amortización: Acotamiento estricto de la carencia al Mes 1, garantizando que el capital se amortice normalmente a partir del Mes 2 sin generar tablas infinitas de 1200 meses.`
  },
  {
    version: '2.4.2',
    releaseNotes: `Novedades v2.4.2:
- 📄 Corrección en Edición de Préstamos: Guardado permanente del estado de carencia (1ª cuota solo intereses) y preservación del importe personalizado de la última cuota al editar.`
  },
  {
    version: '2.4.1',
    releaseNotes: `Novedades v2.4.1:
- 🔢 Precisión Bancaria: Soporte de hasta 4 decimales en campos TIN (%) y TAE (%) (ej. 6,7913%).
- 📄 Atribución de Carencia: Registro exacto del interés pagado en la 1ª cuota de carencia en el cuadro de amortización.
- 📅 Edición Flexible de Préstamos: Carga de plazo en meses al editar y vista previa en vivo de la Fecha Estimada de Finalización.`
  },
  {
    version: '2.4.0',
    releaseNotes: `Novedades v2.4.0:
- 📊 Simulador de Proyección: Cálculo de disponible a 31 Dic incluyendo huchas financiadas por múltiples fuentes.
- 🐷 Historial de Huchas: Asignación explícita de descripciones en ajustes automáticos de saldo para evitar falsas aportaciones manuales.
- 📄 Préstamos y Amortización: Opción de primera cuota solo intereses (periodo de carencia) desglosada correctamente en el cuadro de amortización.`
  },
  {
    version: '2.3.9',
    releaseNotes: `Novedades v2.3.9:
- 📅 Precisión en Estado de Ingresos Fijos: Corregida la insignia "Atrasado" en ingresos fijos configurados para computar en el mes siguiente. Ahora evalúan la fecha real del calendario (hoy) evitando falsas alertas al navegar a meses futuros.`
  },
  {
    version: '2.3.8',
    releaseNotes: `Novedades v2.3.8:
- 🐷 Gastos Fijos Financiados por Huchas: Cálculo inteligente del disponible del mes. Los gastos fijos respaldados por huchas no reducen el disponible mensual salvo por la diferencia si la hucha cuenta con cobertura parcial.`
  },
  {
    version: '2.3.7',
    releaseNotes: `Novedades v2.3.7:
- 📄 Cuotas Especiales en Préstamos: Opción directa para configurar importes personalizados en la primera y/o última cuota del préstamo.
- 📊 Porcentajes (%) en Barras de Progreso: Indicadores visuales de avance porcentual en las 3 barras de la tarjeta de préstamo (Progreso Global, Capital Principal e Intereses).`
  },
  {
    version: '2.3.6',
    releaseNotes: `Novedades v2.3.6:
- 🏦 Edición de Préstamos en Ventana Modal Flotante: Formulario de edición y creación de préstamos centrado en pantalla sin desplazamientos.
- 📐 Campo TAE y Selector de Importe: Añadida la casilla TAE y selector para indicar si el importe introducido es Capital Solicitado o Coste Total de Cuotas.
- 📊 3 Barras de Progreso y Cuadro de Amortización Interactivo: Desglose visual de Capital vs Intereses y cuadro completo mes a mes adaptado a móviles Android sin ningún scroll horizontal.`
  },
  {
    version: '2.3.5',
    releaseNotes: `Novedades v2.3.5:
- 🎯 Reducción flexible de desajuste negativo: Ahora el widget de alerta de desajustes permite restar el saldo sobrante directamente del Disponible del Mes (además de o en lugar de las huchas), facilitando la corrección inmediata con un solo clic.
- ⚙️ Optimización en la ejecución del instalador de Windows para un cierre fluido sin bloqueos.`
  },
  {
    version: '2.3.4',
    releaseNotes: `Novedades v2.3.4:
- 🛡️ Integridad de Datos y Protección de Registros: Eliminada la eliminación automática silenciosa al iniciar la app. Todas las transacciones registradas se conservan de forma íntegra.
- ⚡ Estabilidad en Sincronización Nube y Saldos: Eliminados bucles de avisos emergentes de mantenimiento y corrección de descuadres acumulativos en saldos de tarjetas de crédito.`
  },
  {
    version: '2.3.3',
    releaseNotes: `Novedades v2.3.3:
- ⚡ Optimización de Informes PDF Anuales: Compresión de imágenes JPEG y gestión eficiente de memoria RAM durante la generación de PDFs para evitar cierres inesperados al procesar grandes volúmenes de datos (>500 movimientos).
- 💡 Banner Informativo en Desglose del Disponible (i): Añadida tarjeta explicativa profesional en el desglose del disponible que aclara cómo la app calcula el presupuesto combinando movimientos reales y estimaciones fijas del período.`
  },
  {
    version: '2.3.2',
    releaseNotes: `Novedades v2.3.2:
- 🎯 Sincronización del Disponible Vivo en Alerta de Saldos: La alerta de desajuste utiliza ahora el disponible real dinámico del Dashboard (contemplando el ajuste manual activo y descontando los gastos transcurridos durante el mes), eliminando falsos avisos de descuadre.`
  },
  {
    version: '2.3.1',
    releaseNotes: `Novedades v2.3.1:
- 🎯 Alerta de Descuadre de Saldos Ajustada: La alerta del Dashboard respeta ahora el disponible manual del mes configurado por el usuario (MonthOverride), eliminando descuadres fantasma y mostrando un desglose 100% coherente con la pantalla principal.`
  },
  {
    version: '2.3.0',
    releaseNotes: `Novedades v2.3.0:
- 🛡️ Aislamiento Total de Archivos por Economía: Cada economía creada asigna ahora su propio archivo independiente de sincronización (/pcshogar_<id>.json), evitando cruces de datos entre distintas economías.
- 🧹 Auto-Saneamiento e Integridad al Arrancar: La app detecta y purga automáticamente registros huérfanos o duplicados de antiguas sincronizaciones y notifica de forma transparente al usuario si requirió optimización.
- 📱 Vista de Ajuste de Saldo 100% Responsiva: Historiales y remanentes adaptados a formato de tarjetas apiladas para móvil, eliminando por completo el desplazamiento horizontal.`
  },
  {
    version: '2.2.9',
    releaseNotes: `Novedades v2.2.9:
- 💳 Barra de Uso de Tarjeta con Retención: La barra de porcentaje de uso ahora contempla la deuda retenida del ciclo anterior, reflejando el 100% de ocupación si el disponible actual es 0€.
- 📱 Simulador de Préstamos Responsivo: Interfaz del simulador optimizada para pantallas de móvil (smartphones), apilando campos de entrada y resultados verticalmente sin desbordamiento lateral.`
  },
  {
    version: '2.2.8',
    releaseNotes: `Novedades v2.2.8:
- 💳 Retención de disponible en tarjetas: Nueva opción por tarjeta ("Mantener crédito retenido del ciclo anterior hasta el día de pago") para evitar liberar saldo antes de abonar la deuda.
- 🧮 Simulador de Préstamos y Compras a Plazos: Nuevo botón en el Dashboard para calcular cuotas, intereses y tablas de amortización (Francés) con opción de "Convertir en Préstamo Real".
- ⚠️ Alerta Inteligente de Límite de Tarjeta: Aviso rojo preventivo en los formularios de gastos si un importe supera el crédito disponible actual de la tarjeta.`
  },
  {
    version: '2.2.7',
    releaseNotes: `Novedades v2.2.7:
- 📊 Corrección en Dashboard e Informes: Asignación mensual exacta para devoluciones y gastos basada en el mes en curso.`
  },
  {
    version: '1.9.4',
    releaseNotes: `Novedades 1.9.4:
- Mejora de UI: El porcentaje de uso de las tarjetas de crédito ahora tiene en cuenta el capital de los préstamos asociados.
- Responsive UI: Diseño mejorado en el formulario de creación/edición de préstamos para pantallas pequeñas.
- UX: Modales mejorados sin scroll interno y con foco automático en la parte superior para evitar doble scroll en dispositivos.`
  },
    

  {
    version: '1.9.1',
    releaseNotes: `Novedades 1.9.1:
- Huchas: Soporte para financiar gastos fijos desde huchas.
- Préstamos y Financiación: Calculadora bidireccional (puedes introducir TAE y te calcula la comisión).
- Dashboard: Alerta visual para gastos fijos atrasados o pendientes de confirmación.`
  },
    {
        version: '1.9.0',
        releaseNotes: `Novedades v1.9.0:
- 🛠 Se han redondeado todos los importes a 2 decimales en toda la app.
- 🚀 Sugerencias Inteligentes: Avisos de pagos de gastos fijos pendientes o próximos.
- 💳 Se han filtrado los ingresos pendientes de las sumas de las cuentas.
- 🏦 Nueva funcionalidad: Financiar Gastos Fijos usando el saldo de tus Huchas.
- 📅 Movimientos pendientes se arrastran ahora al día 1 del mes nuevo.`
    },
    {
        version: '1.8.6',
        releaseNotes: `Novedades v1.8.6:
- 🛠 Solucionado error interno donde los gastos en carteras de efectivo se sumaban a Gastos Cuentas en el panel superior.`
    },
  {
    version: '1.8.5',
    releaseNotes: `Novedades v1.8.5:
- 🚀 Las casillas de "Gastos Cuentas", "Gastos Tarjetas" y "Gastos Efectivo" del panel resumen ahora cuadran 1:1 con la suma directa de la lista de gastos de abajo.
- 💳 Se agrupan los gastos de tarjetas de débito correctamente en la casilla de Tarjetas en vez de Cuentas.`
  },
  {
    version: '1.8.4',
    releaseNotes: `Novedades v1.8.4:
- 🚀 El informativo de gastos en el Dashboard ahora refleja los gastos reales brutos del mes natural.
- 🛠 Solucionado error donde el ajuste de descuadre hacia el "Disponible" no sumaba el importe.
- ⚙️ Nueva sección de gestión de descuadres en Ajustes de Saldo con botón para restaurar la alerta.`
  },
  {
    version: '1.8.3',
    releaseNotes: `Novedades v1.8.3:
- 🚀 Restablecida la funcionalidad de edición y eliminación de ingresos y gastos pendientes.
- 💳 Los gastos financiados ahora se indican claramente y liberan el crédito mensual correctamente.
- 📅 Ajustes de Gastos Tarjeta/Banco ahora reflejan la fecha real independientemente del periodo.
- 🛠 Removida 'Financiación de Huchas' del ingreso disponible para evitar confusión.
- ✅ Solucionado error donde Gastos Efectivo mostraba 0.0€.`
  },
  {
    version: '1.8.2',
    releaseNotes: `Novedades v1.8.2:
- 🐞 Corrección en el cálculo de totales del dashboard.`
  },
  {
    version: '1.8.0',
    releaseNotes: `Novedades v1.8.0:
- 🎉 Restaurada y mejorada la versión con Préstamos Avanzados y Financiación de Tarjetas.
- 🛠 Interfaz del Desajuste de Balance corregida para Android.
- 💰 Opción de Disponible Libre incorporada.
- 💲 Símbolo de moneda corregido en entradas numéricas.`
  },
  {
    version: '1.6.5',
    releaseNotes: `Novedades v1.6.5:
- 📁 Integración total con Google Drive: Ahora puedes explorar y seleccionar la carpeta exacta donde guardar tus datos, usando una interfaz idéntica a la de Dropbox.
- 🎨 Interfaz unificada: Los formularios de ingresos y gastos se han rediseñado para compartir la misma estructura visual en la selección de opciones (puntual/fijo, cobrado/pendiente).`
  },
  {
    version: '1.6.4',
    releaseNotes: `Novedades v1.6.4:
- Solucionado error en el descuadre y arrastre automático de gastos de meses anteriores. Los gastos pendientes de meses anteriores ahora se mueven automáticamente al día 1 del mes actual (con la etiqueta [Atrasado]). Esto ajusta tu disponible real de forma perfecta y hace que tus saldos cuadren.
- Validaciones de reparto mejoradas: Ahora el widget de desajuste controla que no introduzcas cifras incorrectas, impidiéndote repartir más dinero del que realmente tienes o exigiéndote cuadrar exactamente el déficit antes de permitirte ajustar huchas.`
  },
  {
    version: '1.6.1',
    releaseNotes: `Novedades v1.6.1:
- 🐞 Solución de errores: Corregido el listado de gastos puntuales pendientes para que no se sumen a los saldos de la tarjeta de crédito hasta ser confirmados.`
  },
  {
    version: '1.6.0',
    releaseNotes: `Novedades v1.6.0:
- 🔄 Sincronización en tiempo real mejorada con Dropbox.
- ⚙️ Correcciones en el manejo de gastos puntuales pendientes.
- 📊 Alertas mejoradas de superávit y déficit en el dashboard.`
  },
  {
    version: '1.4.5',
    releaseNotes: `Novedades v1.4.5:
- 🔗 Vinculación de préstamos: Conecta préstamos con gastos fijos para amortizar la deuda de manera automática al pagar tus cuotas.
- ⚠️ Validaciones robustas: Avisos y bloqueos en transferencias y formularios de ingresos/gastos si no hay cuentas o préstamos configurados.
- 🔄 Amortización inteligente: Desactivación automática del gasto fijo mensual al saldar completamente el préstamo.`
  },
  {
    version: '1.4.3',
    releaseNotes: `Novedades v1.4.3:
- 🔒 Corrección en el bloqueo de pantalla: Solucionado un problema en Android y Web donde pulsar en 'Bloquear / Salir' causaba que la pantalla se quedase en blanco y no mostrase el teclado para reintroducir el PIN.
- 🔑 Edición de perfil mejorada: Corregido el botón 'Cambiar PIN' en los perfiles principal y secundarios, que anteriormente no mostraba los campos de entrada de PIN cuando el perfil ya tenía un PIN configurado.`
  },
  {
    version: '1.4.2',
    releaseNotes: `Novedades v1.4.2:
- 🎨 Personalización de perfiles: Cambia tu nombre de usuario y elige entre 8 gradientes premium o sube tu propia foto de perfil.
- 🔗 Compartición avanzada de entornos: Los usuarios ahora son propietarios de sus entornos creados y pueden elegir con quién compartirlos de forma posterior a su creación en los ajustes.
- 🔑 Pantalla de bloqueo mejorada: Ahora muestra de forma clara el avatar y el nombre del usuario al pedir el PIN, y destaca visualmente el botón de cambio de usuario.
- 👤 Menú de usuario superior: Sustituido el botón de bloqueo por un avatar interactivo con desplegable y accesos rápidos para editar perfil, gestionar entornos y cerrar sesión.`
  },
  {
    version: '1.4.1',
    releaseNotes: `Novedades v1.4.1:
- 🔒 PIN de seguridad: Protege tus datos locales y perfiles con un PIN de acceso opcional.
- 🏦 Multi-economía: Crea y gestiona múltiples entornos independientes de base de datos.
- 🔄 Sincronización por entorno: Configura enlaces de Dropbox independientes por cada base de datos.
- 📊 Dashboard dinámico: Visualiza de forma rápida la economía activa y cambia de entorno con un click.
- 🐛 Fix PDF Android: Corregido el cierre inesperado al generar o compartir informes en dispositivos Xiaomi, POCO y Redmi.
- 🐛 Fixes de estabilidad: Corregido el estado de conexión a Dropbox al iniciar sin conexión y el bloqueo del teclado tras eliminar un entorno.`
  },
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
