<div align="center">

# 🌿 EcoCert 360

**Plataforma digital de gestión ambiental para la certificación ISO 14001:2015**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Payload CMS](https://img.shields.io/badge/Payload-4.0-blue?logo=payload)](https://payloadcms.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

[🌐 Ver aplicación](https://actividad-investigacion-de-proyecto.vercel.app) · [📋 Credenciales de demo](./CREDENCIALES.md)

</div>

---

## 📌 Descripción

EcoCert 360 centraliza la gestión del Sistema de Gestión Ambiental (SGA) de una organización, cubriendo los capítulos de Planificación, Apoyo, Operación, Evaluación del desempeño y Mejora de la norma ISO 14001:2015. Elimina el uso de hojas de cálculo dispersas y ofrece trazabilidad completa, alertas automáticas y reportes exportables.

**Asignatura:** Gestión de Proyectos Tecnológicos  
**Integrantes:** Emanuel Orozco · Vanelly Ariza · Yimileth Manga  
**Fecha:** Noviembre 2026

---

## 🚀 Demo en vivo

```
https://actividad-investigacion-de-proyecto.vercel.app
```

### 👥 Usuarios de prueba — contraseña universal: `Demo1234!`

| Rol | Correo |
|---|---|
| Administrador | `admin@ecoverde.co` |
| Alta Dirección | `direccion@ecoverde.co` |
| Responsable Ambiental | `ambiental@ecoverde.co` |
| Auditor | `auditor@ecoverde.co` |
| Colaborador | `colaborador@ecoverde.co` |
| Proveedor | `proveedor@ecoverde.co` |

> Ver [CREDENCIALES.md](./CREDENCIALES.md) para más detalle sobre cada rol y los datos precargados.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 |
| **Backend / CMS** | Payload CMS 4 |
| **Base de datos** | PostgreSQL (Supabase) |
| **Autenticación** | Payload Auth (email + contraseña) |
| **Deploy** | Vercel |
| **App móvil** | PWA instalable (Chrome → "Agregar a pantalla de inicio") |

---

## 📱 Módulos implementados

| Módulo | Pantallas | Descripción |
|---|---|---|
| Acceso y organizaciones | P01–P03, P24 | Registro, login, recuperar contraseña, usuarios |
| Aspectos e impactos | P06–P08 | Registro, cálculo de significancia, detalle |
| Requisitos legales | P09–P10 | Matriz legal, evaluación de cumplimiento |
| Objetivos y planes | P11–P13 | Metas SMART, aprobación, seguimiento de avances |
| Auditorías y NC | P14–P18 | Programación, hallazgos, no conformidades, línea de tiempo |
| Incidentes y emergencias | P19–P20 | Reporte y seguimiento |
| Capacitación | P21 | Registro y evaluación de competencia |
| Evidencias | P22 | Carga por proveedores, revisión por responsable |
| Indicadores | P23 | KPIs, gráficos, exportar CSV |
| Usuarios y roles | P24 | Gestión de accesos |
| Parámetros | P25 | Umbrales de significancia y alertas |

---

## 👥 Roles de usuario

| Rol | Descripción |
|---|---|
| **Administrador** | Acceso completo al sistema |
| **Alta Dirección** | Aprueba objetivos, gestiona NC escaladas |
| **Responsable Ambiental** | Gestiona aspectos, requisitos, objetivos, auditorías |
| **Auditor** | Evalúa requisitos, registra hallazgos, verifica NC |
| **Colaborador** | Reporta incidentes, ve sus capacitaciones |
| **Proveedor** | Sube evidencias de cumplimiento |

> Los roles **Administrador** y **Alta Dirección** solo se asignan desde `/admin`.  
> El registro público infiere el rol según el dominio del correo.

---

## ⚙️ Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Significancia = severidad × frecuencia × alcance. Alta ≥ 60, Media ≥ 27, Baja < 27 |
| RN-02 | Aspecto incompleto → estado "Pendiente de revisión" |
| RN-03 | Alertas de requisitos por vencer a 30, 15 y 7 días (sin duplicados) |
| RN-04 | "No cumple" en requisito → NC Detectada automática |
| RN-05 | Objetivo necesita plan completo para enviarse a aprobación |
| RN-06 | Solo Alta Dirección aprueba objetivos |
| RN-07 | Objetivo vencido sin meta → Desviado automático |
| RN-08 | Hallazgo crítico → NC Escalada; normal → NC Detectada |
| RN-09 | Solo el Auditor cierra una NC o la devuelve a análisis |
| RN-10 | Acción correctiva vencida → NC pasa a Vencida |
| RN-12 | Bitácora automática de toda creación, edición y cambio de estado |
| RN-14 | Exportar CSV disponible en todas las tablas |

---

## 🏗️ Instalación local

### Requisitos
- Node.js ≥ 20
- pnpm ≥ 9

### Pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL de PostgreSQL/Supabase

# 3. Iniciar servidor de desarrollo
pnpm dev
```

Abre **http://localhost:3000**

### Variables de entorno requeridas

```env
DATABASE_URL=postgresql://usuario:contraseña@host:5432/postgres
PAYLOAD_SECRET=clave-secreta-minimo-32-caracteres
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🌱 Seed de datos de ejemplo

Después de registrarte y tener al menos un usuario en la BD:

```bash
node scripts/seed-prod.mjs
```

Carga 5 aspectos, 4 requisitos legales, 5 objetivos, 3 auditorías, 4 no conformidades, 3 incidentes y 3 capacitaciones en la primera organización activa.

---

## 📦 Producción

```bash
pnpm run build
pnpm start
```

---

## 🗂️ Estructura del proyecto

```
src/
├── app/
│   ├── (frontend)/          # UI de la aplicación (SPA React)
│   │   ├── EcoCertApp.tsx   # Componente principal (~4400 líneas)
│   │   ├── page.tsx
│   │   └── styles.css
│   └── (payload)/           # Panel admin Payload (no modificar)
├── actions/
│   └── ecocert.ts           # 35+ server actions → Payload/PostgreSQL
├── collections/
│   └── EcoCert.ts           # 13 colecciones Payload
└── payload.config.ts        # Config Payload + PostgreSQL adapter

public/
├── manifest.json            # PWA manifest
├── sw.js                    # Service Worker
└── icons/                   # Íconos PWA (72px → 512px)

scripts/
└── seed-prod.mjs            # Script de datos de ejemplo
```

---

## ✅ Casos de prueba (sección 14 del documento)

| CP | Escenario | Resultado esperado |
|---|---|---|
| CP-01 | Registrar correo ya existente | Error "Este correo ya está registrado" |
| CP-02 | Usuario org B ve datos org A | No aparece ningún dato ajeno |
| CP-03 | Aspecto sev:4 · frec:5 · alc:3 | Significancia 60 → Alta |
| CP-04 | Aspecto sin frecuencia | Pendiente de revisión + notificación |
| CP-05 | Auditor marca "No cumple" | NC Detectada creada automáticamente |
| CP-06 | Objetivo sin acciones en plan | Botón "Enviar a aprobación" deshabilitado |
| CP-07 | Alta Dir. aprueba → avance hasta meta | Activo → Cumplido |
| CP-08 | Objetivo vence sin meta | Desviado automático |
| CP-09 | Auditor programa auditoría | Aparece en lista y responsable notificado |
| CP-10 | Hallazgo crítico | NC nace Escalada + alerta Alta Dirección |
| CP-11 | Auditor marca acción ineficaz | NC vuelve a En análisis |
| CP-12 | Colaborador abre requisitos legales | Pantalla "Acceso restringido" |
| CP-13 | Proveedor sube evidencia | Guardada + Resp. Ambiental notificado |
| CP-14 | Exportar reporte NC | CSV con filas de su organización |
| CP-15 | Pantalla a 390 px | Barra inferior, tablas → tarjetas |
| CP-16 | Cambiar estado de objetivo | Registro en bitácora con usuario y fecha |

---

## 📄 Licencia

Proyecto académico — Gestión de Proyectos Tecnológicos · 2026
