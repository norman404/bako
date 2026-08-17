# Copias de seguridad de la base de datos

Bako permite exportar y restaurar la base SQLite desde **Configuración → Base de datos**.

## Qué incluye

La copia contiene los datos almacenados en `bako.db`: productos, ventas, turnos, configuraciones, impresoras y demás tablas de Bako.

No incluye archivos externos referenciados por la base de datos.

## Exportar

La exportación crea un snapshot consistente de SQLite, incluso cuando la base está activa o utiliza WAL. El archivo se guarda con un nombre similar a:

```text
bako-backup-20260324-1530.sqlite
```

Puede copiarse a una USB, Google Drive u otro medio.

## Restaurar

Antes de reemplazar la base actual, Bako crea automáticamente una copia de seguridad interna. El archivo seleccionado se valida como SQLite y se comprueba su integridad y compatibilidad con las migraciones de Bako.

Después de una restauración exitosa, Bako se reinicia para reabrir la conexión y ejecutar migraciones pendientes.

Las bases de versiones anteriores compatibles pueden migrarse hacia adelante. Las bases creadas por una versión más nueva se rechazan.

## Ubicación

La ruta mostrada en Configuración es la ubicación real de `bako.db` dentro del directorio de configuración de la aplicación. No se debe editar manualmente mientras Bako está abierto.
