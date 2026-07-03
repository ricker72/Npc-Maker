<div align="center">

<!-- Animated SVG Title -->
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=40&duration=3000&pause=500&color=00C2FF&center=true&vCenter=true&width=600&height=80&lines=NPC+MAKER+PRO+V2.7" alt="Título animado" />

<!-- Badges -->
<p>
  <a href="https://github.com/ricker72/npc-maker/releases">
    <img src="https://img.shields.io/badge/version-2.7-blue.svg?style=flat-square&logo=appveyor" alt="Versión">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="Licencia">
  </a>
  <a href="https://github.com/ricker72/npc-maker/actions">
    <img src="https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square&logo=github" alt="Build">
  </a>
  <a href="https://github.com/ricker72/npc-maker/stargazers">
    <img src="https://img.shields.io/github/stars/ricker72/npc-maker?style=social" alt="Estrellas">
  </a>
  <img src="https://img.shields.io/badge/🎨-animado-ff69b4?style=flat-square" alt="Animado">
</p>

<p>
  <img src="https://img.shields.io/badge/🔥-Herramienta%20Definitiva-FF6B00?style=for-the-badge&logo=undertale&logoColor=white" alt="Herramienta Definitiva">
  <img src="https://img.shields.io/badge/🌍-3%20Idiomas-00C2FF?style=for-the-badge" alt="Multilenguaje">
  <img src="https://img.shields.io/badge/🤖-IA%20Integrada-9146FF?style=for-the-badge&logo=openai&logoColor=white" alt="IA Integrada">
</p>

<br/>
<i>El editor multifuncional más completo para NPCs de OpenTibia 12+</i>
<br/>
<sub>⚡ Soporte especial para Canary/Crystal Server</sub>

</div>

---

## 📖 Tabla de Contenidos

- [✨ Características Principales](#-características-principales)
- [🌍 Sistema Multilenguaje](#-sistema-multilenguaje)
- [🧠 Script Creator con IA](#-script-creator-con-ia)
- [🔧 Auto-corrección de Scripts](#-auto-corrección-de-scripts)
- [👹 Monster Editor & Bestiario](#-monster-editor--bestiario)
- [📦 Instalación](#-instalación)
- [🖼️ Capturas de Pantalla](#-capturas-de-pantalla)
- [🚀 Roadmap](#-roadmap)
- [📄 Licencia](#-licencia)
- [🙏 Agradecimientos](#-agradecimientos)

---

## ✨ Características Principales

<table align="center">
  <tr>
    <td align="center">🌍</td>
    <td><strong>Sistema completo de 3 idiomas</strong><br/>Español, English, Português con selector dinámico</td>
  </tr>
  <tr>
    <td align="center">🧠</td>
    <td><strong>Script Creator con IA</strong><br/>Genera NPCs automáticamente con un prompt</td>
  </tr>
  <tr>
    <td align="center">🔧</td>
    <td><strong>Auto-corrección de scripts</strong><br/>Edita quests, storages, actions, movements…</td>
  </tr>
  <tr>
    <td align="center">👹</td>
    <td><strong>Monster Editor y Bestiario</strong><br/>Crea y edita monstruos con preview visual</td>
  </tr>
  <tr>
    <td align="center">🧩</td>
    <td><strong>Arquitectura extensible</strong><br/>Más herramientas en cada versión</td>
  </tr>
</table>

---

## 🌍 Sistema Multilenguaje

Desde el primer arranque, el asistente de configuración te permite elegir tu idioma.  
Puedes cambiarlo en cualquier momento desde el botón del **header**.

- **Arquitectura React Context** → `useTranslation()` con fallback automático al inglés.
- **Traducción verificada**: los 3 diccionarios contienen exactamente **259 claves**.
- **Cobertura 100%**: de las 225 claves usadas en código (incluyendo las dinámicas del selector de tipo de script), **0 quedaron sin traducir**.

---

## 🧠 Script Creator con IA

Diseñado para ahorrarte horas de trabajo.  
Combina un **panel único** con una **preview real** del NPC generada a partir de los mismos datos del editor.

- **Prompt libre**: describe el NPC que quieres y la IA hará el resto.
- **Clave de API gratuita** de uso ilimitado (puedes reemplazarla por la tuya).
- Generación instantánea de scripts listos para tu datapack.

<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-9146FF?style=for-the-badge&logo=openai&logoColor=white" alt="AI Powered">
</p>

---

## 🔧 Auto-corrección de Scripts

Funciones avanzadas para mantener tus scripts siempre en orden:

- ✅ Verificación de **quests**, **storages**, **actions**, **movements**, etc.
- ✅ Incluye documentación para integrar directamente en tu datapack preferido.
- ✅ Capas de edición rápida sin salir de la herramienta.

---

## 👹 Monster Editor & Bestiario

Rediseñado completamente con un estilo visual impactante:

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>Looktype</strong></td>
      <td align="center"><strong>Stats</strong></td>
      <td align="center"><strong>Beastiario</strong></td>
    </tr>
    <tr>
      <td align="center">Marco dorado centrado</td>
      <td align="center">Grid de 4 estadísticas oficiales</td>
      <td align="center">Tarjetas con diseño fiel al juego</td>
    </tr>
    <tr>
      <td colspan="3" align="center">
        🔴 <strong>HEALTH</strong> &nbsp;&nbsp; 
        🟢 <strong>EXPERIENCE</strong> &nbsp;&nbsp; 
        ⚪ <strong>ATTACK</strong> &nbsp;&nbsp; 
        ⚪ <strong>DEFENSE</strong>
      </td>
    </tr>
  </table>
</div>

- **Attack real** derivado del daño de los ataques parseados; si no existe el dato, muestra **“—”** en lugar de inventar valores.
- **Librería visual** tipo bestiario: nombre dorado, tags de familia/raza y preview completa.

---

## 📦 Instalación

Elige la opción que prefieras:

| Método | Instrucción |
|--------|-------------|
| **Instalador automático** | Ejecuta el archivo `build-installer` |
| **Versión compilada** | Descarga desde [Releases](https://github.com/ricker72/npc-maker/releases) |
| **Actions** | Obtén la última build desde [Actions](https://github.com/ricker72/npc-maker/actions) |

---

## 🖼️ Capturas de Pantalla

<!-- Puedes reemplazar estos placeholders con enlaces reales a tus imágenes -->
<p align="center">
  <img width="1324" height="871" alt="Screenshot_3" src="https://github.com/user-attachments/assets/b28c5125-7528-4b58-adf5-33d87b68bbd4" />

  <img width="1919" height="1015" alt="Screenshot_2" src="https://github.com/user-attachments/assets/15e5ca86-9296-4b4d-b377-8084b53cd9e0" />

<img width="1919" height="1018" alt="Screenshot_4" src="https://github.com/user-attachments/assets/a119e839-9c37-4ebc-95f1-eccae45fb5fb" />

<img width="1919" height="1017" alt="Screenshot_5" src="https://github.com/user-attachments/assets/c4aa6034-f859-4a70-bcc9-ed1664ff3d22" />

<img width="1919" height="1020" alt="Screenshot_6" src="https://github.com/user-attachments/assets/dc76052e-d706-4649-ae0a-67e9a830b852" />

<img width="1919" height="1021" alt="Screenshot_9" src="https://github.com/user-attachments/assets/8001c033-14f3-4a8b-841b-5e647545b5e5" />

<img width="1919" height="1018" alt="Screenshot_11" src="https://github.com/user-attachments/assets/96bc82ed-bff7-4b80-98a2-adcb97685595" />

<img width="1919" height="1016" alt="Screenshot_12" src="https://github.com/user-attachments/assets/083f00b1-6b3c-445a-8273-2a498b230011" />

</p>

---

## 🚀 Roadmap

NPC MAKER PRO evoluciona constantemente. Cada nueva versión incluirá:

- [ ] Más herramientas de edición masiva
- [ ] Compatibilidad extendida con más forks de TFS
- [ ] Temas visuales personalizables
- [ ] Exportación directa a formatos OTX/Canary

> ¿Tienes una idea? **¡Abre un issue!**

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**.  
Consulta el archivo [LICENSE](LICENSE) para más detalles.

[![Licencia](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

---

## 🙏 Agradecimientos

Gracias a la increíble **comunidad OpenTibia**, en especial:

- **Canary/Crystal Server**
- **OpenTibia BR**
- **Todos los colaboradores y testers**

---

<div align="center">

### ⭐ ¡Si te gusta el proyecto, no olvides darle una estrella!

[![GitHub stars](https://img.shields.io/github/stars/ricker72/npc-maker?style=social)](https://github.com/ricker72/npc-maker/stargazers)

<br/>
<sub>Hecho con ❤️ por <a href="https://github.com/ricker72">Ricker</a></sub>

</div>