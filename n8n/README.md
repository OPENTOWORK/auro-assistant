# Auro × n8n × Google × Supabase

Integración local para sincronizar **Gmail** y **Google Calendar** con las tablas que consume Auro.

| Recurso | URL / valor |
|---------|-------------|
| n8n local | http://localhost:5678 |
| OAuth Redirect (Google) | `http://localhost:5678/rest/oauth2-credential/callback` |
| Workflows | `n8n/workflows/auro-gmail-to-supabase.json` |
| | `n8n/workflows/auro-calendar-to-supabase.json` |
| Migración SQL | `supabase/migrations/20260802180000_auro_core_schema.sql` |

---

## 0. Tablas en Supabase

Desde la raíz del proyecto:

```bash
npm run db:migrate
```

Comprobar:

```bash
npm run db:verify
```

Debe mostrar `REST important_emails OK` y `REST calendar_events OK`.

Alternativa manual: pegar el SQL en [Supabase SQL Editor](https://supabase.com/dashboard/project/heuwcacbbloxycglbbew/sql/new).

---

## 1. Terminar credencial Google OAuth2 en n8n

### Google Cloud (ya hecho en tu caso)

- Proyecto **Auro**
- APIs: Gmail + Calendar
- Cliente OAuth **n8n Auro Google** (Web application)
- Redirect URI autorizada:

  ```
  http://localhost:5678/rest/oauth2-credential/callback
  ```

### En n8n

1. Abre http://localhost:5678 → **Credentials** → **Add credential**.
2. Busca **Google OAuth2 API** (para Gmail) o crea también **Google Calendar OAuth2 API** (Calendar puede usar la misma cuenta Google).
3. Rellena:
   - **Client ID** → el de Google Cloud (no lo pegues en el repo)
   - **Client Secret** → el de Google Cloud (solo en n8n)
4. En **Scope** (si el formulario lo pide), añade en una línea o separados por espacio:

   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/calendar.readonly
   ```

5. Pulsa **Sign in with Google** / **Connect my account**.
6. Autoriza con `carlosgarciacano87@gmail.com`.
7. Guarda la credencial como **Auro Google OAuth2**.

> **Gmail Trigger** usa credencial tipo Gmail OAuth2.  
> **Google Calendar** usa credencial tipo Google Calendar OAuth2 (mismo Client ID/Secret, distinto tipo de nodo).

Repite el paso 2 con **Google Calendar OAuth2 API** si n8n no deja reutilizar la misma credencial en el nodo Calendar.

---

## 2. Credencial Postgres (Supabase) en n8n

Automático (lee `DATABASE_URL` de `.env.local`, sin pegar secretos a mano):

```bash
npm run setup:n8n-postgres
```

Comprueba en http://localhost:5678/home/credentials → **Auro Supabase Postgres**.

Manual (alternativa):

   | Campo | Ejemplo |
   |-------|---------|
   | Host | `aws-0-eu-west-1.pooler.supabase.com` |
   | Database | `postgres` |
   | User | `postgres.heuwcacbbloxycglbbew` |
   | Password | tu contraseña de BD Supabase |
   | Port | `5432` |
   | SSL | `require` / activado |

5. **Test connection** → Save.

No necesitas pegar el **service role key** en n8n si usas Postgres directo. El service role solo hace falta en la app Auro (`.env.local`, ya configurado).

---

## 3. Importar workflows

Automático (asigna Gmail, Calendar y Postgres):

```bash
npm run setup:n8n-workflows
```

Manual (alternativa):

1. n8n → **Workflows** → **Import from file**.
2. Importa los JSON de `n8n/workflows/`.
3. Asigna credenciales en los nodos con ⚠.

### Gmail — solo destacados (estrella)

Gmail **no usa n8n** (el workflow importaba correos incorrectos). Sincroniza con:

```bash
npm run sync:google
```

Solo entran emails con estrella en Gmail (`is:starred` + etiqueta `STARRED`).

### Calendar — ventana de tiempo

El nodo **Eventos próximos 14d** trae eventos desde ahora hasta +14 días. Puedes cambiar `days: 14` a `7` en el campo *Time Max* del nodo.

---

## 4. Probar

### A) Google OAuth

- Credencial Google en n8n muestra **Connected** / cuenta verde.
- Si falla `redirect_uri_mismatch`: la URI en Google Cloud debe ser **exactamente** la de n8n (incluye `http`, puerto `5678`, sin barra final).

### B) Workflow Gmail

1. Marca un email de prueba como **importante** o **destacado** en Gmail (y déjalo no leído).
2. Abre **Auro — Gmail → Supabase** → **Execute workflow** (o activa el workflow).
3. Revisa ejecución: nodos en verde, filas upserted ≥ 1.

### C) Workflow Calendar

1. Abre **Auro — Calendar → Supabase** → **Execute workflow**.
2. Debe listar eventos de los próximos 14 días y hacer upsert.

### D) Datos en Supabase

SQL Editor:

```sql
SELECT subject, sender, gmail_id, received_at
FROM important_emails
ORDER BY received_at DESC
LIMIT 10;

SELECT title, start_at, end_at, google_event_id
FROM calendar_events
ORDER BY start_at ASC
LIMIT 10;
```

### E) Panel Auro

1. `npm run dev` → http://localhost:3000
2. Despliega **Gmails importantes** y **Calendario de Google** en el sidebar.
3. Recarga: deben aparecer datos reales (sin mocks).

---

## 5. Activar en producción local

Cuando las pruebas manuales funcionen:

1. Activa **Auro — Gmail → Supabase** (poll cada minuto).
2. Activa **Auro — Calendar → Supabase** (cada 15 min).

---

## 6. Duplicados

| Tabla | Clave única | Comportamiento |
|-------|-------------|----------------|
| `important_emails` | `gmail_id` | Upsert Postgres |
| `calendar_events` | `google_event_id` | Upsert Postgres |

---

## 7. Arrancar n8n (referencia)

```bash
npx n8n start
```

Abre http://localhost:5678

---

## ⚠️ Regenerar Client Secret (obligatorio)

Como el **Client Secret** de Google se mostró en pantalla durante la configuración:

1. Google Cloud → **APIs & Services → Credentials → n8n Auro Google**.
2. **Reset client secret** / crear secret nuevo.
3. Copia el secret nuevo **solo** en n8n (credenciales Google OAuth2 y Calendar).
4. **No** lo subas a git ni lo pegues en `.env.local` de Auro (la app Next.js no lo necesita).

El Client ID puede quedarse igual; solo actualiza el secret en n8n y vuelve a **Sign in with Google** si la credencial deja de funcionar.
