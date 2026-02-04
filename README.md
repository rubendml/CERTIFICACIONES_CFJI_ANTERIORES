# Certificaciones CFJI

## 1) Crear proyecto en Supabase
1. Crear un proyecto en https://supabase.com.
2. En el panel del proyecto, abrir **SQL Editor** y ejecutar el contenido de [supabase/schema.sql](supabase/schema.sql).
3. Copiar las credenciales:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2) Variables de entorno
Crear un archivo `.env` basado en [.env.example](.env.example) con los valores del proyecto.

## 3) Preparar y cargar datos
Generar el CSV desde el Excel (incluye la columna **Tratamiento** para doctor/doctora):

- Ejecutar el script [scripts/prepare_data.py](scripts/prepare_data.py).

Cargar a Supabase:

- Ejecutar [scripts/load_to_supabase.py](scripts/load_to_supabase.py).

## 4) Configurar el sitio
1. Copiar [web/config.example.js](web/config.example.js) a `web/config.js`.
2. Completar `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
3. Actualizar `CERT_CONFIG` con:
   - `directora` (cambia anualmente)
   - `oficio` y `oficioFecha`
   - `ciudad` y `tratamiento` si aplica
4. Colocar la plantilla PDF en [web/templates/certificado_base.pdf](web/templates/certificado_base.pdf).
   - Puedes reemplazar ese archivo si cambia el diseño.
5. Ajustar posiciones en `CERT_CONFIG.layout` si necesitas alinear el texto exactamente con la plantilla.

## 5) Uso
Abrir [web/index.html](web/index.html) en el navegador. Permite buscar por cédula o nombre y descargar el PDF de certificación.

## Notas
- La carga usa el `registro_hash` como clave única para evitar duplicados.
- El sitio usa la clave anónima y la tabla tiene política de lectura (RLS habilitado).
