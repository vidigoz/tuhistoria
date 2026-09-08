# Destino Medieval

Generador de fichas de personaje medieval (nombre, oficio, sopa, esposa, muerte irónica) usando la API de Claude, con el estilo narrativo de Tempoverso.

La API key **nunca** viaja al navegador: el frontend llama a una Netlify Function, y esa función es la única que habla con `api.anthropic.com`, usando la key guardada como variable de entorno.

## Estructura

```
destino-medieval/
├── netlify.toml                        # config de Netlify (publish + functions)
├── package.json
├── .env.example                        # plantilla, sin la key real
├── public/
│   └── index.html                      # frontend (HTML/CSS/JS puro)
└── netlify/
    └── functions/
        └── generar-destino.js          # función serverless que llama a Claude
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

## 3. Configurar tu API key en local

```bash
cp .env.example .env
```

Edita `.env` y pon tu key real de Anthropic (la consigues en [console.anthropic.com](https://console.anthropic.com) → API Keys):

```
ANTHROPIC_API_KEY=sk-ant-tu-key-real
```

`.env` ya está en `.gitignore`, así que no se sube a GitHub por accidente.

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
4. Antes de desplegar (o justo después), ve a **Site settings → Environment variables** y agrega:
   - Key: `ANTHROPIC_API_KEY`
   - Value: tu key real
5. Deploy site.

Cada vez que hagas `git push`, Netlify vuelve a desplegar automáticamente.

## Notas

- El modelo usado es `claude-sonnet-4-6`, definido en `netlify/functions/generar-destino.js`.
- El prompt del sistema (el "carácter" del Escribano) también vive ahí — edítalo directamente si quieres ajustar el tono o el humor.
- Si más adelante quieres que el generador evite repetir oficios/nombres ya usados (cruzando contra tu base de Notion), se puede agregar como un paso extra dentro de la función.
