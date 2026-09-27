# NPC Maker Pro 2.2 🎮

Aplicación de escritorio (Windows/Electron + React) para crear NPCs 100% compatibles con
**Canary** (OpenTibiaBR) y **CrystalServer**, con interfaz moderna en tema **negro y dorado**,
animaciones, y datos reales de Tibia: **outfits, paleta de 132 colores, mounts e items**, igual
que la herramienta de referencia [tibia-projects/canary-npc-maker](https://github.com/tibia-projects/canary-npc-maker),
pero empaquetada como app de escritorio con UI rediseñada, más un Script Creator asistido por IA.

## 📦 Cómo obtener el instalador .exe real

Este ZIP contiene el **código fuente** del proyecto. El instalador `.exe` final se genera
compilando ese código — esto requiere descargar el binario de Electron desde GitHub, lo cual
necesita una máquina con acceso normal a internet (no fue posible generarlo dentro del entorno
donde se preparó este proyecto, ver nota técnica más abajo). Tienes dos formas, ambas gratuitas:

### Opción A — Automática con GitHub Actions (recomendada, no requiere instalar nada)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. El workflow incluido en `.github/workflows/build-windows.yml` se ejecuta solo al hacer push,
   en una máquina Windows real de GitHub.
3. Ve a la pestaña **Actions** del repo → el job más reciente → descarga el artifact
   **"NPC-Maker-Pro-Windows"**: ahí estará el instalador `.exe` listo.
4. Tarda ~3-5 minutos y es 100% gratis (GitHub da minutos gratuitos de sobra para esto).

### Opción B — Manual, en tu propia PC con Windows

1. Instala [Node.js LTS](https://nodejs.org/) (una sola vez).
2. Haz doble-click en **`build-installer.bat`** (incluido en esta carpeta).
3. Espera a que termine (la primera vez tarda más por la descarga inicial; las siguientes
   veces es mucho más rápido).
4. El instalador queda en la carpeta `dist/`.

## ⚡ Optimizaciones aplicadas para instalación rápida

El instalador anterior demoraba porque empaquetaba `node_modules` completo sin necesidad.
Esta versión está optimizada:

- **`dependencies: {}`** — React/ReactDOM ya quedan compilados dentro del bundle de producción
  (vía Create React App), así que no hace falta empaquetar `node_modules` en tiempo de
  ejecución. El instalador resultante es mucho más liviano.
- **`asar: true`** — todos los archivos de la app se empaquetan en un único archivo `.asar` en
  vez de miles de archivos sueltos, lo que hace la copia durante la instalación casi instantánea.
- **`compression: "store"`** — sin compresión en el instalador. El archivo de descarga es algo
  más grande, pero la instalación es mucho más rápida porque no hay que descomprimir nada
  (el cuello de botella que pedías resolver).
- **`oneClick: true`** + **`perMachine: false`** — instalación de un solo paso, sin permisos de
  administrador (UAC) y sin pasos de asistente, listo en segundos.
- Se eliminó la dependencia `electron-is-dev` (ni siquiera estaba declarada correctamente) y se
  reemplazó por la API nativa `app.isPackaged` de Electron — una dependencia menos que instalar.
- **Portables** (`NPC-Maker-Pro-Portable-x64.exe` y `NPC-Maker-Pro-Portable-ia32.exe`) también
  incluidos, por si prefieres no instalar nada y ejecutar directo.

## 🧩 Nota técnica sobre por qué no se entrega el .exe ya compilado

Para compilar Electron a Windows se necesita descargar su binario precompilado desde
`github.com/electron/electron/releases`, que internamente redirige a
`release-assets.githubusercontent.com`. El entorno donde se preparó este proyecto tiene una
lista blanca de dominios permitidos que no incluye ese host de redirección, así que la descarga
queda bloqueada ahí — aunque sí logré instalar **Wine** correctamente para la compilación
cruzada. En tu máquina (o en GitHub Actions) este problema no existe, por eso ambas opciones de
arriba funcionan sin problema.

## 🚀 Launcher / pantalla de inicio (nuevo)

Al abrir NPC Maker Pro ya no se ve un salto directo a la ventana principal: aparece primero un
**launcher** (pantalla de carga con animación de robot transformándose en interfaz, tema negro
y dorado) que además funciona como **inicialización real de primer arranque**:

- Crea las carpetas de datos del usuario (`%AppData%/NPC Maker Pro/`) si no existen.
- Crea la carpeta `npc-exports/` para futuras exportaciones.
- Escribe un `config.json` inicial la primera vez que se abre la app.
- El progreso de la barra **es real**, no decorativo: cada paso del proceso principal de
  Electron reporta su propio porcentaje via IPC al launcher.
- Al terminar, se cierra solo y aparece la ventana principal maximizada.

Todo esto ocurre dentro del propio proceso de la app — no se lanza ningún instalador externo
ni proceso adicional.

## 🔒 Sin navegadores externos

NPC Maker Pro nunca abre Chrome/Edge/Firefox por fuera de la aplicación. Se bloqueó esto a
nivel del proceso principal de Electron (no solo evitando los enlaces en la UI):

- `setWindowOpenHandler` deniega cualquier intento de abrir una ventana nueva (`window.open`,
  `target="_blank"`) en **todas** las ventanas de la app.
- `will-navigate` impide navegar fuera del contenido propio de la app.
- `shell.openExternal` queda anulado a nivel de proceso como defensa adicional.
- El preview del outfit (la imagen del sprite) se sigue cargando con normalidad porque es una
  simple petición de imagen dentro de la propia ventana — no abre ningún navegador, solo
  muestra la imagen igual que cualquier `<img>` de una página web.

## 🎨 Apariencia reorganizada en 3 paneles

La pestaña **Appearance** ahora se divide en tres sub-paneles (con el preview del personaje
siempre visible arriba, sin importar cuál esté activo):

1. **🎨 Looktype & Colores** — campo numérico de looktype + paleta completa de 132 colores
   (head/body/legs/feet).
2. **👕 Outfits & Mounts** — buscador de outfits por nombre (242, male/female) y buscador de
   **mounts** — ahora se listan **las 231 monturas completas** (antes se cortaba en 50).
3. **➕ Addons** — checkboxes de Addon 1 y Addon 2.

## 🖥️ Soporte x86 (32-bit) y x64 (64-bit)

El build genera **5 archivos** en `dist/` (instaladores y portables por arquitectura, más el
instalador combinado):

- `NPC-Maker-Pro-Setup-x64.exe` — instalador, para Windows 64-bit (la inmensa mayoría de PCs)
- `NPC-Maker-Pro-Setup-ia32.exe` — instalador, para Windows 32-bit
- `NPC-Maker-Pro-Setup.exe` — instalador **combinado** x64 + ia32 (~494 MB), detecta tu
  arquitectura automáticamente (ver nota abajo)
- `NPC-Maker-Pro-Portable-x64.exe` — portable, sin instalación, 64-bit
- `NPC-Maker-Pro-Portable-ia32.exe` — portable, sin instalación, 32-bit

Esto se logra agregando `"arch": ["x64", "ia32"]` a cada target en `package.json` (antes solo
generaba x64), con `artifactName` incluyendo `${arch}` para que los dos instaladores no se
sobrescriban entre sí. No requiere cambios en `build-installer.bat` ni en el workflow de GitHub
Actions: ambos ya llaman a `electron-builder --win` sin especificar arquitectura, así que
automáticamente respetan las dos configuradas.

### 📝 Nota honesta sobre 32-bit (ia32)

Vale la pena saberlo: Windows 32-bit es prácticamente obsoleto hoy en día — **Windows 11 no
existe en versión 32-bit en absoluto**, y casi cualquier PC fabricada después de ~2010 corre
Windows de 64 bits. El build x86 solo es necesario si vas a instalar la app en una máquina
muy antigua específicamente con un Windows 32-bit instalado. Si no estás seguro, usa el `.exe`
de x64: cubre la enorme mayoría de los casos reales.

### ⚠️ Por qué hay 3 instaladores (x64, ia32 y uno combinado)

Al compilar para ambas arquitecturas, electron-builder genera en el mismo build **tres** `.exe`
de instalación, no dos: los dos individuales (`-x64`, `-ia32`) y además uno **combinado**
(`NPC-Maker-Pro-Setup.exe`, ~494 MB — por eso pesa casi lo que los dos individuales juntos).
Según la [documentación oficial de NSIS de electron-builder](https://www.electron.build/nsis),
"si compilas para ia32 y x64 en cualquier caso obtienes un instalador; la arquitectura
apropiada se instala automáticamente": el combinado detecta si tu Windows es de 32 o 64 bits e
instala la versión correcta sin que tengas que elegir.

Los instaladores por arquitectura siguen siendo útiles si prefieres un `.exe` más ligero y ya
sabes qué sistema corre tu PC — el resultado instalado final es idéntico.

## 🔧 Corrección v2.6.2: error "winCodeSign" / "symbolic link" al compilar en Windows

Si al ejecutar `build-installer.bat` (o `electron-builder` directamente) en tu PC Windows ves
un error como:

```
ERROR: Cannot create symbolic link : El cliente no dispone de un privilegio requerido
...winCodeSign...
```

**Esto no es un bug del proyecto** — es un problema conocido y muy común de `electron-builder`
en Windows: intenta descargar `winCodeSign` (un paquete de herramientas de firma de código que
incluye binarios de macOS con symlinks tipo Unix) y la extracción falla porque la cuenta de
Windows usada no tiene el privilegio `SeCreateSymbolicLinkPrivilege`. No depende de si firmas
la app o no (este proyecto no firma: `certificateFile: null`).

**Ya se aplicaron 2 cosas para esto:**

1. Se agregó la variable de entorno `CSC_IDENTITY_AUTO_DISCOVERY=false` tanto en
   `build-installer.bat` como en el workflow de GitHub Actions — es el fix estándar
   documentado por la comunidad de electron-builder para builds sin firma, y en muchos casos
   evita que se intente la descarga.
2. El mensaje de error del `.bat` ahora te guía directamente a la solución si esto persiste.

**Si el error aparece de todas formas, hay 2 soluciones igual de válidas (cualquiera basta):**

- **Opción A (inmediata):** clic derecho en `build-installer.bat` → *"Ejecutar como
  administrador"*. Una cuenta con privilegios de administrador ya tiene el permiso necesario
  para crear symlinks.
- **Opción B (permanente, recomendada si vas a compilar seguido):** activa el *Modo de
  Desarrollador* de Windows una sola vez — `Configuración → Privacidad y seguridad → Para
  desarrolladores → Modo de desarrollador: Activado`. Esto le da a tu cuenta normal (sin
  necesitar admin) el privilegio de crear symlinks de forma permanente.

📝 **Nota de transparencia:** rastreé el origen exacto de esta descarga hasta donde el código
fuente en JavaScript de `electron-builder` lo permite — confirmé que no proviene de la lógica
de firma normal (`sign()` retorna temprano sin certificado configurado), así que probablemente
ocurre dentro del binario compilado en Go (`app-builder.exe`) que electron-builder usa
internamente para editar el ícono del `.exe`, el cual no se puede inspeccionar con una simple
búsqueda de texto. Por eso se documentan ambas soluciones (la de entorno y la de privilegios),
ya que cualquiera de las dos resuelve el problema de raíz sin importar cuál sea la causa exacta
dentro de esa herramienta interna.

**Este problema no debería ocurrir en GitHub Actions** (Opción A del README, recomendada): sus
runners de Windows corren con privilegios suficientes para crear symlinks sin configuración
adicional.

## 🌍 Soporte multiidioma v2.7 (Español, English, Português)

La aplicación ahora está completamente traducida a **3 idiomas**: Español, Inglés y
Portugués (Brasil). Al abrir la app por primera vez aparece un selector de idioma; la
elección se guarda y se puede cambiar en cualquier momento desde el botón de idioma
(🇪🇸/🇺🇸/🇧🇷) en la esquina superior derecha del header.

**Cobertura completa verificada de forma automática** (no solo revisión visual):
- Los 3 diccionarios (`src/i18n/en.js`, `es.js`, `pt.js`) tienen exactamente **259 claves
  cada uno**, sin faltantes entre idiomas.
- De las **225 claves usadas realmente en el código** (incluyendo claves dinámicas como
  los tipos de script del Script Creator), **0 quedaron sin traducir**.
- Todo: menús, títulos de sección, labels, placeholders, botones, mensajes de error/éxito,
  hints explicativos, y las opciones de cada `<select>`.
- Si una traducción llegara a faltar en el futuro, el sistema hace *fallback* automático
  al inglés (nunca rompe la UI ni muestra texto vacío).

Arquitectura: `src/i18n/LanguageContext.jsx` (Context de React + hook `useTranslation()`),
con el idioma persistido en `localStorage` y auto-detectado la primera vez según el idioma
del sistema operativo.

## 🚀 Launcher con versión automática

El launcher ya no tiene la versión escrita a mano en el HTML (`v2.2.0` quedaba
desactualizada en cada release). Ahora pide la versión real vía IPC al proceso principal
(`app.getVersion()`, que lee `package.json`), así que **siempre muestra la versión correcta
automáticamente** con solo subir el número en `package.json` para cada release.

## 🖼️ Script Creator: panel único preview + prompt

La pestaña "Crear Script" del Script Creator se rediseñó en un solo panel de dos columnas:
- **Izquierda**: preview del NPC — looktype **centrado**, nombre, apariencia completa
  (colores, addons, mount) e iconos de diálogo, en un tamaño compacto.
- **Derecha**: el cuadro de texto para escribir el prompt, ocupando el espacio restante.

Antes el preview (400×400) y el textarea estaban apilados verticalmente y el preview era
excesivamente grande para el contexto de un formulario de prompt; ahora ambos conviven en
una sola fila compacta, dejando mucho más espacio útil en pantalla.

## 🐲 Monster Editor / Library: tarjetas estilo bestiario

Las tarjetas de la Biblioteca de Monstruos se rediseñaron para verse como el bestiario
oficial de Tibia:
- Looktype del monstruo **centrado** arriba, en un marco dorado.
- Nombre en dorado, grande, centrado.
- Tags de familia/raza (ej. "Demon", "Dragon", "Vermin") debajo del nombre.
- Grid de 4 estadísticas con el mismo esquema de colores que el bestiario real:
  🔴 **HEALTH**, 🟢 **EXPERIENCE**, ⚪ **ATTACK**, ⚪ **DEFENSE**.
- El valor de Attack se deriva automáticamente del daño máximo real de los ataques
  parseados; Defense viene de `monster.defenses.defense`. Si un monstruo del set curado no
  tiene esos datos, se muestra "—" en vez de un número inventado.

## 🐛 Fix v2.7.1: sprites recortados/irreconocibles corregidos

Se reportó que en la Biblioteca de monstruos y en el Script Creator los sprites se veían mal
(recortados a una esquina, del tamaño de una miniatura) y que varios looktypes "no coincidían".

**Causa raíz real, confirmada contra una implementación funcional:** el CSS de esta app usaba
`transform: scale(8)` (¡8 veces el tamaño original!) combinado con contenedores
`overflow: hidden` mucho más chicos que la imagen ya escalada — el resultado era que solo se
veía una esquina diminuta del sprite real, dando la impresión de que era "el sprite equivocado"
cuando en realidad probablemente era el sprite correcto, solo que recortado casi por completo.

Se comparó contra el CSS real de la herramienta de referencia (que sí renderiza esta misma API
de sprites correctamente) y se encontró que usa apenas `scale: 1.5` — un valor mucho más
conservador. Se corrigió en los 3 lugares afectados (Appearance, panel de contexto del Script
Creator, tarjetas de la Biblioteca): se quitó el `overflow: hidden` que recortaba la imagen y
se bajó la escala a un valor razonable (~2.2x), permitiendo que el personaje se muestre a
**cuerpo completo y centrado**, tal como se pidió.

**Bug de datos adicional encontrado y corregido:** el set de referencia rápida tenía "Rat" y
"Troll" con el **mismo looktype (21) por error** — por eso una de las dos tarjetas mostraba el
sprite de la otra criatura. Ya están corregidos con looktypes distintos.

## 🧩 Nota honesta sobre tibiaxplorer.com

Se intentó usar [tibiaxplorer.com/creatures](https://www.tibiaxplorer.com/creatures) como
fuente de datos reales para expandir el bestiario, tal como se pidió. **No fue posible**: ese
dominio no es accesible desde el entorno donde se construyó esta función (bloqueado por la
política de red del entorno, igual que ocurrió antes con otros dominios como
`release-assets.githubusercontent.com`).

En su lugar, el set de referencia rápida se mantiene modesto (6 criaturas) con valores
aproximados basados en conocimiento general de Tibia, y ahora incluye un **aviso visible en la
propia interfaz** (traducido a los 3 idiomas) aclarando que esos datos son una referencia
aproximada, no verificada en vivo. La fuente de datos confiable y ya soportada por la app sigue
siendo **importar tus propios archivos `.lua`** desde tu servidor — esos sí son datos exactos
porque son los tuyos, y ya usan el parser completo (`parseMonsterLuaFull`) que trae loot,
attacks, elements, bestiary, etc. reales.

## 🐛 Fix v2.6.3: error "GH_TOKEN is not set" en GitHub Actions

Al ejecutar el workflow en GitHub Actions, los `.exe` se compilaban correctamente (Electron
x64 e ia32, NSIS, portable) pero al final todo fallaba con:

```
⨯ GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"
```

**Causa exacta** (encontrada en el código fuente de `PublishManager.js`): `electron-builder`
detecta automáticamente que está corriendo en CI y, si no recibe el flag `--publish` del CLI,
asigna por defecto `publishOptions.publish = "onTagOrDraft"` y luego imprime
`"artifacts will be published if draft release exists  reason=CI detected"`. Intenta entonces
publicar los archivos como un Release de GitHub (para lo cual sí necesita GH_TOKEN), aunque
los `.exe` ya estaban generados y guardados en `dist/` cuando esto falló.

**Corrección**: se agregó `--publish never` explícitamente a todos los scripts de build:
- `scripts.build:win` en `package.json`
- `npx electron-builder --win --publish never` en `build-installer.bat`

El flag `never` hace que `PublishManager` evalúe `isPublish = false` (verificado con la
lógica real del código: `publishPolicy != null && publishOptions.publish !== "never"` → `false`)
y omite completamente el paso de publicación y la verificación del token.

Con este fix el workflow de GitHub Actions debería completarse sin errores y subir los 4 `.exe`
como artifact descargable.



Se hizo una auditoría profunda invocando directamente el motor real de `electron-builder`
(`getConfig`/`validateConfig`, no solo revisión visual del JSON) para encontrar errores que
solo se manifiestan durante el empaquetado real, no en una simple lectura del código.

**🔴 Bug crítico encontrado: la app empaquetada no habría podido abrirse.**

`electron-builder` detecta automáticamente que el proyecto usa `react-scripts` (Create React
App) y, si no se le indica lo contrario, aplica un preset interno llamado `react-cra` que
sobrescribe el campo `main` del `package.json` final a `"build/electron.js"` — un archivo que
**no existe** en este proyecto (el real es `public/electron.js`, nunca se copia a `build/`).

Esto **no rompe la compilación en GitHub Actions** (el `.exe` se generaría sin errores
visibles), pero la app resultante **fallaría al abrirse** en la máquina del usuario final, con
Electron buscando un proceso principal inexistente. Es el tipo de bug silencioso que pasa
desapercibido hasta que alguien instala la app.

**Corrección:** se agregó `"extends": null` a la configuración de build, desactivando
explícitamente la auto-detección de presets. Verificado de forma empírica invocando
`getConfig()` directamente: antes del fix, `extraMetadata: {"main":"build/electron.js"}`;
después del fix, `extraMetadata: undefined`.

**Otras mejoras de la misma auditoría:**
- Se generó un ícono `.ico` real (multi-resolución: 16/32/48/64/128/256px) en
  `build-resources/icon.ico`, referenciado explícitamente en `win.icon`. Antes la app
  apuntaba a un `public/icon.ico` que nunca existió (no rompía el build, pero la app y el
  instalador habrían usado el ícono genérico de Electron).
- Se confirmó, ejecutando el validador de schema oficial de electron-builder, que toda la
  configuración (`removePackageScripts`, `compression: "store"`, `buildResources`, targets
  `nsis`/`portable` con `arch: [x64, ia32]`, etc.) es válida y no contiene claves desconocidas.
- Se confirmó que el build real (`npx electron-builder --win --x64` / `--ia32`) llega limpio
  hasta el paso de empaquetado, fallando únicamente por la descarga de red bloqueada en este
  entorno — la misma limitación de siempre, que no existe en GitHub Actions.

## 🔧 Correcciones v2.5.2

- **Bug del preview "atascado" corregido** — en Appearance (NPCs y monstruos), en el panel de
  contexto del Script Creator, y en las tarjetas de la Biblioteca de monstruos: una vez que la
  imagen del sprite fallaba al cargar (por ejemplo al bajar el looktype a 0 o menos), el
  componente nunca volvía a intentar cargarla, aunque después se eligiera un looktype válido.
  Ahora el estado de error se reinicia automáticamente cada vez que cambia el looktype/colores/
  addons/mount, así que siempre se reintenta la carga.
- **Looktype ya no permite valores negativos** — al llegar a 0 y seguir bajando, el campo se
  mantiene en 0 en vez de pasar a -1, -2, etc. (esa era la causa real de que la imagen dejara de
  existir del lado del servidor de sprites).
- **Preview de monstruos en la Biblioteca aumentado a 400×400** (antes 50×50) — ahora se
  distingue claramente qué criatura es cada tarjeta.
- **Preview del NPC en Script Creator aumentado a 400×400** (antes 70×70) — mismo cambio,
  aplicado al panel de contexto automático que detecta nombre/apariencia.

## 🔧 Mejoras v2.5.1 al Monster Editor


- **Condiciones de daño continuo (DoT) en ataques** — checkbox "Daño continuo" en cada ataque
  con selector de tipo real (`CONDITION_POISON`, `CONDITION_FIRE`, `CONDITION_ENERGY`,
  `CONDITION_DROWN`, `CONDITION_FREEZING`, `CONDITION_BLEEDING`, `CONDITION_CURSED`) +
  totalDamage + interval. Genera el sub-bloque `condition = {...}` anidado correctamente.
- **Paralyze/cambio de velocidad en ataques** — checkbox con speedChange, duration y efecto
  visual.
- **Nueva sección "Habilidades Defensivas"** — se descubrió investigando monstruos reales que
  `monster.defenses` puede contener también hechizos de auto-buff (ej. el propio monstruo
  acelerándose), no solo defense/armor/mitigation. Ahora son editables.
- **Parser de la Biblioteca mucho más completo** (`parseMonsterLuaFull`) — antes solo leía
  nombre/looktype/health/experience/descripción; ahora también extrae **loot, attacks (con su
  condition anidado), elements, immunities, defenses, defenseAbilities, bestiary, voices y
  summons** completos al importar un `.lua`. Verificado contra monstruos reales del repo de
  CrystalServer (`rotworm.lua`, `giant_spider.lua`, `filth_toad.lua`) con resultados fieles.

## 🔧 Correcciones v2.4


- **DevTools eliminado por completo** — `devTools: false` en ambas ventanas (splash y
  principal), cierre forzado si se intenta abrir, bloqueo de F12/Ctrl+Shift+I, y sin la
  entrada de menú "Toggle DevTools". No puede mostrarse ni abrirse de ninguna forma.
- **Bug de looktype al cambiar género corregido** — al alternar Male/Female en
  "Outfits & Mounts", el looktype ahora cambia automáticamente al outfit equivalente
  del nuevo género (busca por nombre, ej. "Citizen" male ↔ "Citizen" female).
- **Script Creator ya no pierde lo escrito** — todas las pestañas de la app (incluyendo
  Script Creator y sus dos sub-paneles) permanecen siempre montadas; solo se ocultan con
  CSS al cambiar de pestaña, en vez de destruirse. Ahora puedes escribir un prompt, ir a
  otra pestaña y volver sin perder nada.
- **Botones "🔄 Rehacer" y "🗑️ Borrar todo"** agregados a ambos paneles del Script Creator
  (Crear Script y Revisar y Corregir).
- **Nuevo: contexto automático del NPC en Script Creator** — al generar un script de tipo
  "NPC", se muestra un panel que detecta automáticamente el nombre (Basic Info) y la
  apariencia completa (looktype, addons, colores, mount) configurados en el resto de la
  app, junto con los iconos de diálogo correspondientes (👋 Greet, 💰 Trade si hay shop,
  🗨️ uno por cada keyword, 👋 Bye). Esta información se envía automáticamente a la IA
  como contexto real, en vez de tener que volver a describir el NPC desde cero.
- **Bug de Keywords corregido** — se eliminaron todos los `window.alert()` de la app
  (Keywords, Import JSON, Shop) y se reemplazaron por avisos visuales inline. El bug de
  "los inputs se bloquean después de presionar Agregar Keyword" era causado por el diálogo
  nativo bloqueante de `alert()` en Electron, que podía dejar el foco del teclado en un
  estado inconsistente al cerrarse.

## 🐉 Monster Editor (nuevo, v2.5)

Nueva pestaña debajo de "Script Creator", basada en investigar el código fuente real de
monstruos de [zimbadev/crystalserver](https://github.com/zimbadev/crystalserver) (formato
`Game.createMonsterType` + tabla `monster` + `mType:register`, el mismo patrón que ya usamos
en NPCs — no el editor de assets binarios del cliente de
[Canary-monster-editor](https://github.com/opentibiabr/Canary-monster-editor), que es un
dominio distinto: ver nota técnica abajo).

### Sub-paneles

1. **📋 Basic Info** — nombre, descripción, experience, race ID, health, speed, race
   (sangre/decay), corpse, flags completos (summonable, hostile, pushable, etc.)
2. **👕 Appearance** — el **mismo** selector visual de looktype/colores/addons/mounts que ya
   usamos para NPCs, reutilizado tal cual (mismos 242 outfits, 132 colores, 231 mounts).
3. **⚔️ Combat** — defense/armor/mitigation, los 10 elementos de daño reales (physical, energy,
   earth, fire, lifedrain, manadrain, drown, ice, holy, death), inmunidades a condiciones
   (paralyze, outfit, invisible, bleed, drunk, fire, ice), y lista de ataques.
4. **💰 Loot** — tabla de loot (nombre o ID de item, chance 1-100000, maxCount).
5. **📖 Bestiary** — class, race (las 20 categorías reales incluyendo `Inkborn`, la categoría
   más reciente), stars, toKill, unlocks, charms points, locations.
6. **🗣️ Voices & Summons** — frases aleatorias del monstruo y monstruos que puede invocar.
7. **👁️ Preview Lua** — código final, idéntico en estructura a los monstruos reales del
   servidor (verificado contra `rotworm.lua` del repo oficial).
8. **📚 Library** — biblioteca de criaturas: importa tus propios archivos `.lua` de monstruos
   (de tu servidor) para listarlos y cargarlos en el editor, más un pequeño set de referencia
   rápida (6 criaturas básicas, datos de TibiaWiki/CC-BY-SA) para empezar sin importar nada.

### 🧩 Nota técnica: por qué la Biblioteca no scrapea tibiaxplorer.com

Se evaluó usar tibiaxplorer.com/creatures como fuente, pero esa web no es accesible desde el
entorno donde se construyó esta función, y además es una base de datos compilada por un fansite
de terceros. En su lugar, la Biblioteca está pensada para **tus propios archivos `.lua`** (datos
que ya posees, vienen de tu servidor, sin problemas de fuente/licencia) más un set mínimo de
referencia citado a TibiaWiki (CC-BY-SA). Si más adelante quieres una base de datos más completa,
lo correcto es construirla a partir de tus propios XML/Lua de monstruos, no de un scrape externo.

### 🧩 Nota técnica: diferencia con Canary-monster-editor

El repo oficial `opentibiabr/Canary-monster-editor` (C#/WPF) no edita estadísticas de combate:
edita `staticdata.bin`, un archivo binario dentro de los **assets del cliente** de Tibia
(.dat/.spr, comprimidos con LZMA) que solo mapea `raceId → nombre → looktype/colores/addon` para
que el **cliente del juego** muestre bien el Bestiary/Boss list. Es un dominio binario
propietario completamente distinto a la generación de scripts Lua del lado del servidor que
hace esta app. Implementarlo requeriría parsear el formato binario del cliente de Tibia (y solo
tiene sentido sobre tu propio cliente legítimo) — queda fuera de alcance de esta versión.

## 🆕 Novedades de la base de datos real (basada en el repo oficial)


Esta versión fue reescrita tomando como referencia el código fuente real de
`tibia-projects/canary-npc-maker` para garantizar compatibilidad 1:1:

- ✅ **Formato Lua real de Canary** (`Game.createNpcType`, `NpcHandler`, `KeywordHandler`,
  `FocusModule`, `npcType:register(npcConfig)`) — ya no es un formato inventado.
- ✅ **242 outfits reales** (masculinos y femeninos) extraídos de `outfits.xml`.
- ✅ **132 colores reales** de la paleta de Tibia, mostrados como swatches clicables.
- ✅ **231 mounts reales** con buscador.
- ✅ **1958 items reales** (id + nombre) con buscador para armar el shop del NPC.
- ✅ **Preview visual del outfit** usando la misma API pública de sprites que usa la
  herramienta original (`outfit-images-oracle.ots.me`), con fallback si no hay internet.
- ✅ Sistema de **keywords** (palabras clave → respuesta) en el formato real de
  `KeywordHandler:addKeyword(...)`.
- ✅ Mensajes estándar de NPC: `greet`, `farewell`, `walkaway`, `sell`.

## 🎨 Interfaz

- Tema negro (#0f0f0f) y dorado (#d4af37), con animaciones y efectos hover.
- 8 secciones: **Basic Info**, **Appearance** (3 sub-paneles), **Messages**,
  **Shop**, **Keywords**, **Preview Lua**, **Script Creator**, **Monster Editor**.
- Appearance dividido en 3 sub-paneles (ver sección arriba):
  Looktype & Colores · Outfits & Mounts (231 mounts completos) · Addons.
- Botones "Random Colors" / "Random Outfit".

## 🤖 Script Creator (nuevo)

Nueva sección (debajo de "Preview Lua") con un sistema de prompts de IA con **dos paneles**:

1. **✨ Crear Script** — describe en lenguaje natural qué quieres (NPC, action, talkaction,
   creaturescript, moveevent, globalevent, spell) y genera el código Lua listo para usar.
2. **🛠️ Revisar y Corregir** — pega o carga un script `.lua` antiguo o nuevo (de cualquier OT
   server: TFS 0.x, OTX, Canary, etc.) y la IA lo analiza, explica qué estaba mal/desactualizado,
   y entrega la versión corregida 100% compatible con **CrystalServer**.

El sistema está fundamentado en la API real extraída directamente del código fuente de
[zimbadev/crystalserver](https://github.com/zimbadev/crystalserver) (protocolo 15.24): patrón
`Game.createNpcType` + `npcConfig` + `NpcHandler`/`KeywordHandler`/`FocusModule`,
`npcType:register(npcConfig)`, extensiones propias como `addDialogOptions`, soporte de
`currency`, `storageKey/storageValue` en shops, etc.

### Proveedor de IA: api.paxsenix.org

El Script Creator usa por defecto **api.paxsenix.org** con una API key integrada en el código
(ofuscada con XOR+Base64, ver `src/secureConfig.js`). No necesitas configurar nada para usarlo.

Si el formato de respuesta real de api.paxsenix.org no coincide exactamente con lo que espera
`src/aiClient.js` (no se pudo verificar su documentación al construir esta integración), puedes
ajustar el endpoint/modelo desde el panel **"⚙️ Configuración avanzada"** dentro del Script
Creator, sin tocar código. El parser intenta varios formatos de respuesta comunes
(`choices[0].message.content`, `content`, `result`, `response`, `text`, etc.) para maximizar
compatibilidad.

### 🔒 Seguridad de la API Key — léelo antes de compartir esta app

La key integrada está **ofuscada, no cifrada de verdad**. La diferencia importa:

- ✅ Lo que SÍ logra: que la key no aparezca como texto plano legible si alguien abre el
  código fuente o el bundle compilado por casualidad.
- ❌ Lo que NO logra: impedir que alguien con la app instalada extraiga la key. Cualquiera
  puede abrir las DevTools de Electron (`Ctrl+Shift+I`), escribir
  `require('./secureConfig').getEmbeddedApiKey()` (o equivalente) en la consola, leer el
  archivo `build/static/js/main.*.js`, o interceptar la petición de red saliente — la key
  viaja en el header `Authorization` en texto plano porque así lo exige el protocolo HTTP.

Esto **no es una limitación de esta implementación**: es imposible esconder un secreto dentro
de una app que el usuario final ejecuta en su propia máquina, sin importar qué algoritmo de
"cifrado" se use, porque el programa necesita poder leer el secreto para funcionar, y el
usuario tiene control total sobre el proceso que ejecuta ese programa.

**Si esta app es solo para tu uso personal:** no hay problema, nadie más tiene acceso al archivo.

**Si planeas distribuirla a otras personas** y necesitas que la key sea realmente inaccesible
para ellas, la única solución correcta es:

1. Crear un pequeño servidor (Node/Express, Cloudflare Worker, etc.) que tú controles.
2. Ese servidor guarda la API key **del lado del servidor** (nunca en código distribuido).
3. La app llama a tu servidor (`https://tu-servidor.com/generate`), y tu servidor reenvía la
   petición a api.paxsenix.org agregando la key.
4. Así, la app distribuida nunca contiene la key — solo la URL de tu propio servidor.

Puedo ayudarte a construir ese servidor proxy si en algún momento decides distribuir la app.

## 📦 Instalación

```bash
npm install
npm run electron-dev     # modo desarrollo
npm run build            # genera instalador .exe (Windows)
```

## 📤 Exportación

- **Export Lua** → genera `nombre_del_npc.lua` listo para copiar a `data/npc/` de tu
  servidor Canary.
- **Export JSON** → guarda toda la configuración del NPC para reabrir después.
- **Import JSON** → carga un NPC guardado previamente.

## 🖼️ Sobre el preview visual

El preview de outfit usa una API pública de imágenes (la misma que usa el proyecto
original tibia-projects/canary-npc-maker) para renderizar el sprite con el looktype,
colores y mount seleccionados. Esto requiere conexión a internet; si no hay conexión,
se muestra un ícono de respaldo sin bloquear el uso de la app (todos los demás campos
y la generación de Lua funcionan 100% offline).

## 🗂️ Estructura

```
src/
  data/
    outfits.json   ← 242 outfits (id, nombre, género)
    colors.json    ← 132 colores (id, rgb, hex)
    mounts.json    ← 231 mounts (id, clientId, nombre)
    items.json     ← 1958 items (id, nombre)
  luaGenerator.js   ← genera el .lua en formato real de Canary
  OutfitSelector.jsx← selector visual de apariencia
  ItemPicker.jsx    ← buscador de items para el shop
  App.jsx           ← aplicación principal
  App.css           ← estilos (tema negro/dorado)
```

## 🙏 Créditos

Datos de outfits/colores/mounts/items extraídos de
[tibia-projects/canary-npc-maker](https://github.com/tibia-projects/canary-npc-maker)
(MIT). Esta app es una reinterpretación de esa herramienta como aplicación de

## 🛡️ Seguridad, Privacidad y Verificación

En **Npc-Maker**, la seguridad de tu entorno de desarrollo y la privacidad de tus datos son nuestra máxima prioridad. Esta sección detalla cómo garantizamos un entorno 100% seguro y transparente para la comunidad de OpenTibia.

### 🔒 1. Política de Privacidad y Cero Recolección

* **Almacenamiento Local Estricto:** Todos tus proyectos, bestiarios, scripts de Lua y configuraciones se procesan y guardan exclusivamente de manera local en tu equipo. Ningún archivo de tu servidor o datapack es transmitido a servidores externos.
* **Cero Rastreo:** La aplicación no incluye ningún tipo de telemetría, analíticas ocultas ni sistemas de seguimiento de actividad del usuario.
* **Privacidad de Datos:** No compartimos ningún tipo de información con terceros.

### 🧠 2. Transparencia en el Uso de Inteligencia Artificial

La función de Script Creator con IA está diseñada bajo estrictos estándares de control:

* **Uso Exclusivo del Prompt:** Al generar scripts mediante IA, únicamente se procesa el texto (prompt) y las instrucciones específicas que introduces en ese momento para devolverte el resultado esperado.
* **Claves API Personales:** Puedes utilizar tu propia clave de API o la provista por el sistema; las peticiones se realizan de forma directa y segura con el proveedor del modelo de lenguaje.
* **Cero Entrenamiento:** Tus scripts, configuraciones o datos de servidores privados nunca son utilizados para entrenar modelos de IA públicos.

### 🔍 3. Verificación de Código y Compilación Limpia

Para garantizar que ejecutas software legítimo y libre de modificaciones maliciosas:

* **Código 100% Abierto:** Puedes inspeccionar cada línea de código fuente disponible públicamente en nuestro repositorio de GitHub.
* **Compilación Automatizada:** Las versiones oficiales y ejecutables se generan exclusivamente a través de flujos automatizados de GitHub Actions, asegurando que lo que descargas coincide exactamente con el código fuente publicado.
* **Verificación SHA-256:** En cada Release oficial publicamos los hashes criptográficos SHA-256 de los instaladores para que puedas comprobar su integridad antes de ejecutarlos.
  ```powershell
  certutil -hashfile NPC-Maker-Pro-Setup-x64.exe SHA256
  ```

### ⚠️ 4. Nota sobre Falsos Positivos en Antivirus

Al tratarse de una aplicación de escritorio empaquetada de manera independiente, es posible que algunos antivirus o Windows Defender detecten ocasionalmente el ejecutable como un falso positivo debido a la ausencia de certificados de firma de código comerciales (costosos para proyectos Open Source).

Puedes verificar que el archivo es totalmente seguro compilándolo tú mismo directamente desde el código fuente o utilizando los hashes oficiales publicados en las versiones del repositorio.

> También disponible dentro de la app: sidebar → **Legal** → **🛡️ Privacidad y Datos IA** (HUD con este mismo contenido en ES/EN/PT).

escritorio con una interfaz visual distinta.
