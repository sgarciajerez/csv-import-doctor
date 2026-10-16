export function MerchantGuide() {
  return (
    <s-page heading="Guía rápida">
      <s-section heading="Qué hace CSV Import Doctor">
        <s-paragraph>
          Analiza archivos CSV de productos, muestra problemas y recomendaciones, y permite revisar algunas reparaciones de espacios.
          No importa ni modifica productos en Shopify. Un resultado sin incidencias no garantiza que Shopify acepte el archivo;
          la importación también depende de la tienda y de su estado.
        </s-paragraph>
        <s-paragraph>
          El archivo se analiza en este navegador mediante un Web Worker. No se envían sus celdas a Shopify ni al servidor de la app.
          Consulta también la <s-link href="/privacy" target="_blank">página de privacidad</s-link>.
        </s-paragraph>
      </s-section>

      <s-section heading="Analizar y revisar">
        <s-ordered-list>
          <s-list-item>
            Elige <strong>Crear productos</strong> para un CSV de creación o <strong>Actualizar productos</strong> para un archivo que Shopify vaya a usar para actualizar productos existentes.
            En el modo de actualización, Shopify puede sobrescribir datos y tratar las celdas vacías según la opción de sobrescritura.
          </s-list-item>
          <s-list-item>Selecciona un CSV y espera a que termine el análisis local. Si el separador es ambiguo, confirma cuál corresponde al archivo.</s-list-item>
          <s-list-item>
            Revisa cada incidencia, su fila o columna, la explicación y la fuente de Shopify con la versión del perfil utilizada.
            Los errores de estructura, los avisos de compatibilidad y las recomendaciones tienen efectos distintos.
          </s-list-item>
          <s-list-item>
            Si se proponen reparaciones, selecciona solo las que hayas revisado. Puedes deshacer la última aplicación; después, la app vuelve a analizar el resultado.
          </s-list-item>
          <s-list-item>Descarga el CSV revisado para importarlo tú desde Shopify. El informe JSON contiene diagnósticos y reparaciones, no una copia completa del CSV.</s-list-item>
        </s-ordered-list>
      </s-section>

      <s-section heading="Límites y casos especiales">
        <s-unordered-list>
          <s-list-item>El navegador analiza hasta 20 MB y 100.000 filas. Shopify limita los CSV de productos a 15 MB; los archivos de más de 15 MB no se pueden importar aunque el análisis local termine.</s-list-item>
          <s-list-item>Para inventario de varias ubicaciones, usa el formato CSV de inventario de Shopify; el CSV de productos no valida ese esquema.</s-list-item>
          <s-list-item>La app revisa el formato de las URL de imagen localmente, pero no las solicita ni comprueba que existan o sean públicamente accesibles.</s-list-item>
          <s-list-item>Las columnas desconocidas y sus valores se conservan. La app no completa datos de producto ni cambia valores sin que selecciones una reparación.</s-list-item>
        </s-unordered-list>
        <s-paragraph>
          Conserva una copia del original. Antes de una actualización importante, revisa el CSV exportado y el efecto de sobrescritura en Shopify.
        </s-paragraph>
      </s-section>

      <s-section heading="Preguntas frecuentes">
        <s-unordered-list>
          <s-list-item>
            <strong>¿La app importa el CSV en Shopify?</strong> No. Descarga el archivo revisado y súbelo desde el importador de Shopify.
          </s-list-item>
          <s-list-item>
            <strong>¿Un análisis sin incidencias garantiza que la importación funcione?</strong> No. El resultado depende también de la configuración y los datos de la tienda; revisa cualquier aviso y confirma el resultado en Shopify.
          </s-list-item>
          <s-list-item>
            <strong>¿Se envía mi archivo al servidor?</strong> No. El análisis y las reparaciones se hacen en el navegador. El servidor sí conserva datos técnicos de la sesión de Shopify; consulta la página de privacidad para ver cuáles.
          </s-list-item>
          <s-list-item>
            <strong>¿Puedo analizar un CSV de más de 15 MB?</strong> Sí, hasta el límite local de 20 MB y 100.000 filas, pero Shopify no acepta para importar un CSV de productos que supere 15 MB.
          </s-list-item>
          <s-list-item>
            <strong>¿Puedo validar el inventario de varias ubicaciones?</strong> No con el CSV de productos. Usa el formato de CSV de inventario de Shopify, que tiene un esquema distinto.
          </s-list-item>
          <s-list-item>
            <strong>¿Qué debo comprobar antes de actualizar productos?</strong> Conserva el original, confirma la opción de sobrescritura en Shopify y revisa los valores del CSV exportado, especialmente las celdas vacías.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section>
        <s-button variant="tertiary" onClick={() => window.history.back()}>Volver al analizador</s-button>
      </s-section>
    </s-page>
  );
}
