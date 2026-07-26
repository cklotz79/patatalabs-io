# patatalabs.io

Sitio de [Patata Labs](https://patatalabs.io). Una sola página, estática, sin
dependencias ni paso de build.

```
index.html
css/  tokens.css · base.css · components.css · styles.css   sistema de diseño
      site.css                                              maquetación y movimiento
js/   site.js                                               sesión de terminal e idioma
      constellation.js                                      sin usar
```

## Desarrollo

No hace falta instalar nada. Abrir `index.html` en el navegador, o servirlo:

```bash
python3 -m http.server 8000
```

Requiere salida a `fonts.googleapis.com` para Schibsted Grotesk, JetBrains Mono
y Fragment Mono.

## Despliegue

Cloudflare Pages, conectado a este repositorio. Cada push a `main` publica.

| Ajuste | Valor |
| --- | --- |
| Framework preset | None |
| Build command | *(vacío)* |
| Build output directory | `/` |
| Root directory | `/` |

No hay comando de build ni directorio de salida: el repositorio se sirve tal
cual. `_headers` define la política de seguridad de contenido y la caché.

## Idioma

Español por defecto, inglés en atributos `data-en` que se intercambian con el
selector de la cabecera. La elección se recuerda en `localStorage` y se puede
forzar con `?lang=en`. Sin JavaScript, la página se lee entera en español.

## Diseño

Construido con el sistema de diseño de Patata Labs v1.0: tinta sobre papel,
filetes de 1px, cero radios, cero sombras, una sola señal. Los cuatro primeros
archivos de `css/` son copia del sistema y no se editan aquí — los cambios se
hacen en el sistema y se copian.

El movimiento sigue las reglas del sistema y no las convenciones habituales de
web: el texto entra tecleado en mono o por corte seco, nunca con fundidos, y las
transiciones son barridos de filete de 240ms. Con `prefers-reduced-motion` todo
aparece de una vez.

---

© 2026 Patata Labs. Todos los derechos reservados.
