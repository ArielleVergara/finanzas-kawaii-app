# 🌸 Finanzas Kawaii App ✨

Una aplicación web de gestión financiera personal y del hogar con un diseño bonito, intuitivo y con temática **Kawaii**. Diseñada para hacer del control de presupuestos, gastos, ingresos y metas de ahorro una experiencia visualmente agradable y sencilla.

---

## ✨ Características Principales

- **Dashboard Financiero**: Resumen en tiempo real de tu balance total, ingresos del mes, gastos y estado de tus tarjetas.
- **Gestión de Gastos e Ingresos**: Registra transacciones fijas, variables o distribuidas en cuotas con categorías personalizables.
- **Tarjetas de Crédito y Cuentas Bancarias**: Control de límites, fechas de cierre, vencimiento de resúmenes y seguimiento de cuotas pendientes.
- **Calendario Financiero Interactivo**: Visualiza tus próximos vencimientos, ingresos programados y gastos diarios en un formato de calendario kawaii.
- **Metas de Ahorro**: Define objetivos de ahorro, registra progresos y celebra tus logros con animaciones de confeti.
- **Analíticas y Estadísticas**: Gráficos interactivos de distribución de gastos, tendencias mensuales y comparativas (impulsado por Recharts).
- **Importador desde Excel**: Carga masiva de movimientos desde hojas de cálculo (`.xlsx`).
- **Seguridad Integrada**: Autenticación con JWT, cifrado de contraseñas con bcrypt y opción de bloqueo rápido mediante PIN de seguridad.

---

## 🛠️ Tecnologías Utilizadas

### **Frontend**
- **[React](https://react.dev/)** + **[Vite](https://vitejs.dev/)** - Interfaz de usuario rápida y reactiva.
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilos personalizados con paleta pastel e interfaz kawaii.
- **[Recharts](https://recharts.org/)** - Visualización de datos financieros mediante gráficos dinámicos.
- **[Lucide React](https://lucide.dev/)** - Iconografía moderna y limpia.
- **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)** - Efectos visuales de celebración.

### **Backend**
- **[Node.js](https://nodejs.org/)** + **[Express](https://expressjs.com/)** - API REST para la gestión de datos.
- **[SQLite3](https://www.sqlite.org/)** - Base de datos liviana orientada a almacenamiento local.
- **[JSON Web Tokens (JWT)](https://jwt.io/)** & **[bcryptjs](https://www.npmjs.com/package/bcryptjs)** - Manejo de sesiones y seguridad de usuarios.
- **Helmet & Express Rate Limit** - Protección y sanitización contra peticiones abusivas.

---

## 🚀 Instalación y Configuración Local

Sigue estos pasos para ejecutar el proyecto en tu máquina local:

### 1. Clonar el repositorio
```bash
git clone https://github.com/ArielleVergara/finanzas-kawaii-app.git
cd finanzas-kawaii-app
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=tu_clave_secreta_jwt_aqui
DATABASE_PATH=./data/kawaii_finances.db
```

### 4. Iniciar la aplicación
Ejecuta el servidor backend y el cliente frontend de manera simultánea:
```bash
npm run dev
```

La aplicación estará disponible en:
- **Frontend (Vite):** `http://localhost:5173`
- **Backend (Express):** `http://localhost:5000`

---

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor y el cliente al mismo tiempo.
- `npm run server`: Ejecuta solo el servidor backend (`Node.js`).
- `npm run client`: Ejecuta solo el cliente frontend (`Vite`).
- `npm run build`: Compila la aplicación frontend para producción.
- `npm run preview`: Previsualiza la compilación de producción localmente.

---

## 📁 Estructura del Proyecto

```text
finanzas-kawaii-app/
├── data/              # Base de datos SQLite local (excluida del control de versiones)
├── server/            # Servidor Express, rutas, middleware y configuración DB
│   ├── db/            # Conexión SQLite y esquemas de base de datos
│   ├── middleware/    # Autenticación, sanitización y limitador de peticiones
│   └── routes/        # Endpoints API (gastos, ingresos, analíticas, etc.)
├── src/               # Código fuente Frontend (React)
│   ├── components/    # Componentes UI (Dashboard, Calendario, Gestores)
│   ├── context/       # Contextos globales (Auth, Data, Security)
│   └── utils/         # Funciones auxiliares y de seguridad
├── index.html         # Archivo HTML principal
├── tailwind.config.js # Configuración de estilos Tailwind
└── vite.config.js     # Configuración de bundler Vite
```

---

## 🔒 Privacidad y Datos

Tus datos financieros se almacenan de manera **local** en tu equipo mediante una base de datos SQLite. Ningún dato bancario ni personal se sube a servidores de terceros ni se rastrea.
