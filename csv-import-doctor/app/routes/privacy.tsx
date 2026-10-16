export function meta() {
  return [{ title: 'Privacidad | CSV Import Doctor' }];
}

export default function Privacy() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#202223' }}>
      <h1>Privacidad de CSV Import Doctor</h1>
      <p role="note"><strong>Documento de desarrollo:</strong> antes de distribuir la app hay que completar los datos del responsable, el contacto, el alojamiento y los plazos de conservación indicados al final.</p>

      <h2>Qué datos procesa la app</h2>
      <p>El contenido del CSV (incluidas sus celdas y encabezados) se analiza en el navegador mediante un Web Worker. CSV Import Doctor no sube, guarda ni registra el archivo, sus filas, las incidencias ni las reparaciones. El contenido permanece en la memoria de la pestaña mientras se usa el flujo y las descargas se generan en el navegador.</p>
      <p>Para autenticar la instalación, la integración oficial de Shopify guarda datos de sesión en la base de datos del servidor: tienda, identificador de sesión, estado y vencimiento, permisos concedidos, tokens de acceso y renovación, y, cuando Shopify los proporciona, identificador, nombre, correo electrónico, idioma y atributos de la cuenta del usuario. Estos datos se usan para autenticación y gestión de la instalación.</p>

      <h2>Acceso a datos de la tienda</h2>
      <p>La configuración actual no solicita permisos de Admin API y la app no consulta ni modifica productos, variantes, inventario, pedidos o clientes. Las solicitudes de cumplimiento de Shopify se autentican; si Shopify solicita borrar los datos de una tienda, se eliminan sus sesiones guardadas. La app no mantiene datos de clientes, pedidos ni archivos CSV que requieran exportación o borrado.</p>

      <h2>Uso, comunicación y conservación</h2>
      <p>Los datos de sesión se utilizan solo para autenticar y mantener la instalación. No se usan para publicidad, venta de datos ni analítica de uso. Shopify procesa el inicio de sesión y la plataforma donde se aloje la app procesa las solicitudes y la base de datos de sesiones. No se ha configurado un proveedor de analítica de contenido.</p>
      <p>Al desinstalar la app se borran las sesiones de esa tienda; Shopify también envía posteriormente una solicitud de redacción de datos de tienda. Antes de distribuir, se debe documentar y configurar la retención de registros y copias de seguridad del proveedor de alojamiento. CSV Import Doctor no define todavía esa política de infraestructura.</p>

      <h2>Contacto y datos pendientes antes de distribución</h2>
      <ul>
        <li>Responsable legal del servicio y domicilio: pendiente de confirmar.</li>
        <li>Correo de privacidad y soporte: pendiente de confirmar.</li>
        <li>Proveedor, ubicación y transferencias de datos del alojamiento: pendientes de confirmar.</li>
        <li>Retención de registros y copias de seguridad: pendiente de confirmar.</li>
      </ul>
      <p>Esta página describe la implementación actual del proyecto y no sustituye una revisión legal. Se debe completar y enlazar desde la ficha de Shopify antes de publicar o distribuir la app.</p>
    </main>
  );
}
