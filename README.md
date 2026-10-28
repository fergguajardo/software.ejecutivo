# Software Ejecutivo

Aplicación: https://fergguajardo.github.io/software.ejecutivo/

## Activar el guardado en Supabase

Proyecto: `kqnfrsnictmpkfzhqvny`.

1. Abrir el proyecto nuevo en Supabase.
2. Entrar en **SQL Editor → New query**.
3. Copiar todo el contenido de [`supabase/setup.sql`](supabase/setup.sql) y pulsar **Run**. Este script crea la tabla y las políticas de acceso; no contiene contraseñas.
4. Entrar en **Authentication → Users → Add user → Create new user**. Crear una cuenta con correo y contraseña, y marcar la confirmación del correo si se ofrece esa opción. La cuenta de otro proyecto Supabase no se traslada automáticamente a este.
5. Abrir la aplicación e ingresar con esa cuenta. Esperar el estado **Guardado en Supabase** antes de cerrar.
6. Cambiar el título de una tarjeta, esperar la confirmación y recargar. Para comprobar otro dispositivo, ingresar con la misma cuenta.

La clave pública incluida en la aplicación está diseñada para uso en el navegador. No agregar claves secretas ni contraseñas al repositorio.

## Comportamiento del guardado

- Los cambios se envían automáticamente después de una pausa breve de edición.
- La tabla `public.kairos_state` guarda un espacio por usuario. Las políticas de acceso permiten leer y modificar únicamente la fila propia.
- La copia local sirve como respaldo temporal. Si no hay conexión, la interfaz muestra cambios pendientes y reintenta; la confirmación de la nube aparece únicamente después de una respuesta exitosa.
- Si otro dispositivo guardó una versión distinta, se detiene la escritura y se ofrece descargar los cambios pendientes antes de cargar la nube.
- El primer acceso conserva la demo local para esa cuenta. Una cuenta diferente empieza con un espacio independiente; no se hereda la información de otra cuenta.
- Los cambios pendientes se conservan mientras el navegador mantenga su almacenamiento. Si se borra antes de sincronizar, pueden perderse.
- Esta configuración no comparte datos entre cuentas de consultores y ejecutivos. Los espacios de equipo requieren definir permisos adicionales.

## Archivos

- `index.html`: aplicación e identidad visual incorporada.
- `assets/kairos-cloud.js`: autenticación y guardado automático.
- `supabase/setup.sql`: tabla y permisos del proyecto nuevo.

La biblioteca de Supabase y las fuentes requieren conexión a internet.
