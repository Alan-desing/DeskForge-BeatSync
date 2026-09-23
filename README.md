# DeskForge + BeatSync

> Suite de productividad de escritorio con reproductor musical interactivo construida con Electron, Vite, Node.js y Web Audio API.

## Descripción General

DeskForge + BeatSync es una aplicación de escritorio multiplataforma (enfocada en Windows) que combina herramientas de productividad personal con un reproductor musical avanzado.

## Tecnologías Utilizadas

- **Electron**: Proceso Main y Preload con IPC seguro (`contextIsolation: true`, `nodeIntegration: false`).
- **Vite**: Bundle y Dev Server para el proceso Renderer.
- **Howler.js**: Gestión y reproducción de audio.
- **Web Audio API**: Procesamiento y visualizaciones en tiempo real.
- **electron-builder**: Empaquetado de instaladores `.exe` para Windows (target NSIS).
- **pnpm**: Gestor de paquetes.

## Cómo iniciar el proyecto

Para ejecutar el proyecto en entorno de desarrollo desde una instalación limpia:

```bash
# 1. Instalar dependencias con pnpm
pnpm install

# 2. Iniciar el servidor de desarrollo y Electron
pnpm dev
```

Para generar la compilación de producción del instalador de Windows:

```bash
pnpm build
```

## Estado actual del proyecto

Actualmente el proyecto se encuentra en **FASE 0 — Estructura Principal**.

## Qué debería verse al iniciar

Al ejecutar `pnpm dev`, se abrirá una ventana de Electron (1200x800) mostrando la interfaz base con un panel indicando:
- Título: **DeskForge + BeatSync**
- Subtítulo: *Donde el código y la música se sincronizan*
- Tarjeta de estado: **FASE 0 — Estructura Base**
- Indicador verde de IPC: `IPC seguro activo (Ping: pong)`

## Prueba rápida

1. Abrir la terminal en la raíz del proyecto.
2. Ejecutar `pnpm dev`.
3. Comprobar que la ventana de la aplicación abre sin errores.
4. Verificar que el badge indique `IPC seguro activo (Ping: pong)`.
