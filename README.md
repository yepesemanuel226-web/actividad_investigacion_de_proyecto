# EcoCert 360

**Plataforma digital de gestión ambiental para la certificación ISO 14001:2015**

> Asignatura: Gestión de Proyectos Tecnológicos  
> Integrantes: Emanuel Orozco · Vanelly Ariza · Yimileth Manga  
> Fecha: noviembre de 2026

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 |
| Backend / CMS | Payload CMS 4 |
| Base de datos | PostgreSQL (Supabase) |
| Autenticación | Payload Auth (email + contraseña) |

---

## Requisitos previos

- Node.js ≥ 20
- pnpm ≥ 9

---

## Instalación

```bash
pnpm install
```

---

## Configuración

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

Variables requeridas en `.env`:

```env
# PostgreSQL (Supabase u otro proveedor)
DATABASE_URL=postgresql://usuario:contraseña@host:5432/postgres

# Secret de Payload (mínimo 32 caracteres, cámbialo en producción)
PAYLOAD_SECRET=cambia-esto-en-produccion

# URL pública del sitio
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Desarrollo

```bash
pnpm dev
```

Abre **http://localhost:3000** en el navegador.  
El panel de administración de Payload está en **http://localhost:3000/admin**.

---

## Seed de datos de ejemplo

Después de registrarte y activar tu organización, puedes cargar datos de demo:

```bash
node scripts/seed.mjs
```

Esto crea en la organización **EcoVerde S.A.S.**:

- 5 aspectos ambientales (2 Alta, 1 Media, 1 Baja, 1 Pendiente)
- 4 requisitos legales (1 por vencer en 10 días)
- 3 no conformidades en distintos estados
- 2 incidentes

> **Nota:** Las auditorías del seed requieren que primero exista un usuario en la organización. Regístrate, activa la org desde `/admin` y vuelve a correr el seed.

---

## Producción

```bash
pnpm run build
pnpm start
```

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| **Administrador** | Todo (solo asignable desde `/admin`) |
| **Alta dirección** | Panel, Objetivos, Auditorías, NC, Incidentes, Reportes |
| **Responsable ambiental** | Todo excepto Usuarios y Parámetros |
| **Auditor** | Panel, Aspectos, Legales, Auditorías, NC, Reportes |
| **Colaborador** | Panel, Incidentes, Capacitación |
| **Proveedor** | Panel, Evidencias |

Los roles **Administrador** y **Alta dirección** no se pueden seleccionar en el registro público — solo el superadmin los asigna desde `/admin`.

---

## Flujo de registro

1. Ir a **http://localhost:3000** → "Regístrate"
2. Usar un **correo corporativo** (ej. `nombre@empresa.com`)  
   - Correos personales (Gmail, Hotmail, Outlook) quedan como Colaborador y no pueden crear organización
3. Aceptar la política de tratamiento de datos
4. La organización queda en estado **Pendiente de aprobación**
5. El superadmin la activa en **http://localhost:3000/admin → Organizations**

---

## Reglas de negocio implementadas

| ID | Regla |
|---|---|
| RN-01 | Significancia = severidad × frecuencia × alcance. Alta ≥ 60, Media ≥ 27, Baja < 27 |
| RN-02 | Si faltan datos, el aspecto queda en estado "Pendiente de revisión" |
| RN-03 | Alertas de requisitos por vencer a 30, 15 y 7 días (sin duplicados por 24h) |
| RN-04 | Auditor marca "No cumple" → se crea automáticamente una NC Detectada |
| RN-05 | Objetivo solo pasa a "En aprobación" si tiene todos los campos y al menos una acción |
| RN-06 | Solo Alta Dirección puede aprobar un objetivo |
| RN-07 | Objetivo Activo vencido sin meta → pasa automáticamente a Desviado |
| RN-08 | Hallazgo crítico → NC nace en Escalada; hallazgo normal → NC Detectada |
| RN-09 | Solo el Auditor puede cerrar una NC o devolverla a análisis |
| RN-10 | NC En ejecución con plazo correctivo vencido → pasa automáticamente a Vencida |
| RN-12 | Toda creación, edición y cambio de estado queda en la bitácora |
| RN-13 | Correo duplicado rechazado con mensaje claro |
| RN-14 | Exportación CSV disponible en todas las tablas, filtrada por organización |

---

## Módulos del sistema (PDF sección 2)

| Módulo | Pantallas | Estado |
|---|---|---|
| Acceso y organizaciones | P01–P03, P24 | ✅ |
| Aspectos e impactos | P06–P08 | ✅ |
| Requisitos legales | P09–P10 | ✅ |
| Objetivos y planes | P11–P13 | ✅ |
| Auditorías y no conformidades | P14–P18 | ✅ |
| Incidentes y emergencias | P19–P20 | ✅ |
| Capacitación y competencia | P21 | ✅ |
| Evidencias de proveedores | P22 | ✅ |
| Indicadores y exportación | P23 | ✅ |
| Notificaciones | P05 | ✅ |
| Usuarios y roles | P24 | ✅ |
| Parámetros del sistema | P25 | ✅ |
| Trazabilidad (bitácora) | automática | ✅ |

---

## Estructura del proyecto

```
src/
  app/
    (frontend)/          # UI de la aplicación (SPA)
      EcoCertApp.tsx     # Componente principal (~3500 líneas)
      page.tsx           # Punto de entrada
      styles.css         # Tailwind CSS v4
    (payload)/           # Panel de administración Payload (no modificar)
  actions/
    ecocert.ts           # 35+ server actions conectadas a Payload
  collections/
    EcoCert.ts           # 13 colecciones: Organizations, Users, Aspects...
    Admins.ts            # Colección de administradores del panel
  payload.config.ts      # Configuración de Payload + PostgreSQL
scripts/
  seed.mjs               # Datos de ejemplo para demo
```

---

## Casos de prueba (PDF sección 14)

| CP | Caso | Resultado esperado |
|---|---|---|
| CP-01 | Registrar correo ya existente | Error "Este correo ya está registrado" |
| CP-02 | Usuario org B intenta ver datos org A | No aparece ningún dato ajeno |
| CP-03 | Aspecto sev 4 · frec 5 · alc 3 | Significancia 60 → nivel Alta |
| CP-04 | Aspecto sin frecuencia | Guardado como Pendiente + notificación |
| CP-05 | Auditor marca "No cumple" | NC Detectada creada automáticamente |
| CP-06 | Enviar objetivo sin acciones | Botón deshabilitado |
| CP-07 | Alta Dirección aprueba → registrar avance hasta meta | Pasa a Activo → Cumplido |
| CP-08 | Objetivo vence sin meta | Pasa automáticamente a Desviado |
| CP-09 | Auditor programa auditoría | Aparece en lista |
| CP-10 | Hallazgo crítico | NC nace en Escalada |
| CP-11 | Auditor marca acción ineficaz | NC vuelve a En análisis |
| CP-12 | Colaborador abre requisitos legales | Pantalla "Acceso restringido" |
| CP-13 | Proveedor sube evidencia | Guardada, Resp. Ambiental recibe aviso |
| CP-14 | Exportar reporte NC | Descarga CSV con filas de su org |
| CP-15 | Pantalla a 390 px | Barra inferior, tablas → tarjetas |
| CP-16 | Cambiar estado de objetivo | Registro en bitácora |
