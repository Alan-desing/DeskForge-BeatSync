# 🟢 Guía de Configuración para Integración con Spotify

Para integrar **Spotify** en **DeskForge + BeatSync**, necesitarás registrar una aplicación gratuita en el **Portal de Desarrolladores de Spotify** y obtener un **Client ID**.

---

## 📋 Pasos para Obtener tu Client ID de Spotify

### 1. Iniciar sesión en Spotify Developer Dashboard
1. Abre tu navegador e ingresa a: **[https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)**
2. Inicia sesión con tu cuenta de Spotify.

### 2. Crear una Aplicación
1. Haz clic en el botón **"Create App"** (Crear Aplicación).
2. Rellena los datos básicos:
   - **App Name**: `DeskForge BeatSync`
   - **App Description**: `Desktop workspace and music sync`
   - **Redirect URIs**: Añade exactamente la siguiente URL:
     ```text
     http://127.0.0.1:8888/callback
     ```
   - **Which API/SDKs are you planning to use?**: Selecciona **Web API** y **Web Playback SDK**.
3. Acepta los términos de servicio y haz clic en **Save**.

### 3. Copiar el Client ID
1. En el panel de tu nueva aplicación en Spotify Dashboard, ve a la pestaña **Settings** (Configuración).
2. Verás un campo llamado **Client ID** (un código alfanumérico largo, por ejemplo: `a1b2c3d4e5f6...`).
3. Copia ese **Client ID**.

---

## 🔑 Cómo usar tu Client ID en DeskForge + BeatSync

Tienes dos opciones muy sencillas:

### Opción A: Desde la propia Aplicación (Recomendado)
1. Abre **DeskForge + BeatSync**.
2. Ve al módulo **Reproductor**.
3. Haz clic en el botón **"Conectar Spotify"**.
4. Pega tu **Client ID** en la ventana/campo de configuración y haz clic en **Guardar y Conectar**.

### Opción B: Crear un archivo `.env` en la raíz del proyecto
Crea un archivo llamado `.env` en la carpeta raíz del proyecto con la siguiente línea:
```env
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
```

---

> ℹ️ **Nota sobre reproducción en tiempo real**: Spotify Web Playback SDK requiere una cuenta **Spotify Premium** para transmitir audio completo directamente en el reproductor web. Si usas una cuenta Free, podrás ver tu perfil, buscar canciones y gestionar la reproducción en tus dispositivos mediante la Spotify Web API.
