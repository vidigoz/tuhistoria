# Destino Medieval

Generador de fichas de personaje medieval (nombre, oficio, sopa, esposa, muerte irónica) usando la API de Claude, con el estilo narrativo de Tempoverso.

La API key **nunca** viaja al navegador: el frontend llama a una Netlify Function, y esa función es la única que habla con `api.anthropic.com`, usando la key guardada como variable de entorno.

## Estructura

```
destino-medieval/
├── netlify.toml                        # config de Netlify (publish + functions)
├── package.json
├── public/
│   └── index.html                      # frontend (HTML/CSS/JS puro)
└── netlify/
    └── functions/
        └── generar-destino.mjs         # función serverless (v2) que llama a Claude
```

## 1. Abrir en VS Code

```bash
cd destino-medieval
code .
```

## 2. Instalar dependencias

Necesitas Node.js instalado. Luego:

```bash
npm install
```

Esto instala `netlify-cli` como dependencia de desarrollo (para correr el sitio localmente con funciones incluidas).

## 3. Credenciales de Claude

En Netlify **no necesitas ninguna API key**: el AI Gateway inyecta las credenciales de Anthropic en el runtime de las funciones automáticamente. Importante: no definas tú mismo `ANTHROPIC_API_KEY` en las variables de entorno del proyecto, porque Netlify deja de inyectar las suyas si ya existe una.

Para desarrollo local, vincula la carpeta al proyecto de Netlify (`npx netlify link`) y el CLI te pasa las mismas credenciales. Si prefieres usar una key propia solo en local, ponla en un archivo `.env` (ya está en `.gitignore`, así que no se sube a GitHub por accidente):

```
ANTHROPIC_API_KEY=tu-key-de-anthropic
```

## 4. Correr en local

```bash
npx netlify dev
```

Esto levanta el sitio (normalmente en `http://localhost:8888`) con la función serverless funcionando y leyendo `.env` automáticamente.

## 5. Subir a GitHub

```bash
git init
git add .
git commit -m "Primer commit: Destino Medieval"
gh repo create destino-medieval --private --source=. --push
```

(O crea el repo manualmente en github.com y usa `git remote add origin <url>` + `git push`.)

Si no tienes `gh` (GitHub CLI), simplemente crea el repo vacío en GitHub y sigue las instrucciones que te da para un repo existente.

## 6. Desplegar en Netlify

1. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Conecta tu cuenta de GitHub y elige el repo `destino-medieval`.
3. Netlify detecta `netlify.toml` automáticamente (publish: `public`, functions: `netlify/functions`) — no necesitas tocar el build command.
4. Deploy site. No hay variables de entorno que configurar: el AI Gateway se encarga de las credenciales de Claude (requiere al menos un deploy de producción para activarse).

Cada vez que hagas `git push`, Netlify vuelve a desplegar automáticamente.

## Notas

- El modelo usado es `claude-sonnet-5`, definido en `netlify/functions/generar-destino.mjs`.
- El prompt del sistema (el "carácter" del Escribano) también vive ahí — edítalo directamente si quieres ajustar el tono o el humor.
- Si más adelante quieres que el generador evite repetir oficios/nombres ya usados (cruzando contra tu base de Notion), se puede agregar como un paso extra dentro de la función.
