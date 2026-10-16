import type { LoaderFunctionArgs } from 'react-router';
import { Link, redirect } from 'react-router';
import styles from './styles.module.css';

export function meta() {
  return [{ title: 'CSV Import Doctor | CSV de productos Shopify' }];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.has('shop')) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="page-title">
        <p className={styles.eyebrow}>CSV Import Doctor</p>
        <h1 id="page-title" className={styles.heading}>Revisa tu CSV de productos antes de importarlo</h1>
        <p className={styles.intro}>
          Detecta problemas habituales y revisa cambios propuestos. El análisis se realiza en tu navegador;
          la app no importa productos ni garantiza que Shopify acepte el archivo.
        </p>

        <a className={styles.primaryLink} href="https://admin.shopify.com/apps">
          Abrir Shopify Admin
        </a>
        <p className={styles.installNote}>
          Instala y abre CSV Import Doctor desde Shopify Admin. La instalación se inicia en Shopify y esta página
          no pide el dominio de tu tienda.
        </p>

        <ul className={styles.features}>
          <li>
            <h2>Diagnóstico preventivo</h2>
            <p>Consulta incidencias con su explicación, ubicación y enlace a la documentación de Shopify.</p>
          </li>
          <li>
            <h2>Reparaciones revisables</h2>
            <p>Elige qué cambios aplicar, comprueba la vista previa y deshazlos antes de exportar.</p>
          </li>
          <li>
            <h2>CSV en tu dispositivo</h2>
            <p>El archivo se analiza localmente y la app no lo sube al servidor.</p>
          </li>
        </ul>

        <Link className={styles.privacyLink} to="/privacy">Consulta la política de privacidad</Link>
      </section>
    </main>
  );
}
