# patatalabs.io

Sitio de [Patata Labs](https://patatalabs.io). Una sola página, estática, sin
dependencias ni paso de build.

```
wrangler.jsonc                                              configuración de Workers
public/                                                     lo único que se sirve
  index.html
  _headers                                                  seguridad y caché
  css/  tokens.css · base.css · components.css · styles.css sistema de diseño
        site.css                                            maquetación y movimiento
  js/   site.js                                             sesión de terminal e idioma
        constellation.js                                    sin usar
        hairline/  kernel.js · fichero.js                   figura Hairline, tal cual sale de la skill
                   host.js                                  la monta en la home
```

## Desarrollo

No hace falta instalar nada. Abrir `public/index.html` en el navegador, o
servirlo:

```bash
python3 -m http.server 8000 --directory public
```

Requiere salida a `fonts.googleapis.com` para Schibsted Grotesk, JetBrains Mono
y Fragment Mono.

La figura del fichero se carga como módulo, y los navegadores no cargan módulos
desde `file://`: para verla en local hay que servir la carpeta, no abrir el
archivo.

## La figura

`$ patata retrieve` muestra un fichero de biblioteca archivado por significado:
los cajones más cercanos a la consulta se abren, el más próximo más que ninguno.
Está hecha con [Hairline](https://github.com/lucasmarkes/hairline), de Lucas
Marques, bajo licencia MIT: el aviso va en `public/js/hairline/LICENSE`.
`kernel.js` y `fichero.js` se copian sin cambios; `host.js` hace en la página lo
que el banco de pruebas del paquete hace en la suya —montarla, traducir la
lectura y dar una sola vuelta del recorrido cuando la sesión la imprime—.
El tema sale de las variables públicas `--hairline-*`, fijadas en `site.css`
con los tokens del sistema.

## Despliegue

Cloudflare Workers con static assets, conectado a este repositorio mediante
Workers Builds. Cada push a `main` publica.

La configuración está en `wrangler.jsonc`: no hay script de Worker ni comando de
build, sólo `assets.directory` apuntando a `public/`. `public/_headers` define la
política de seguridad de contenido y la caché; Workers lo interpreta y no lo
sirve como archivo.

Despliegue manual, si hiciera falta:

```bash
npx wrangler deploy
```

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
