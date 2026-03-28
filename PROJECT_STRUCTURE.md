# Nossa Paróquia Online - Admin Panel Frontend

Complete React + TypeScript frontend project for the parish management panel.

## Project Overview

This is a fully functional admin panel for "Nossa Paróquia Online" built with:
- React 18 + TypeScript
- Vite (dev server with HMR)
- TailwindCSS + Tailwind CSS Vite plugin
- React Router v7 for navigation
- Axios for API calls
- Lucide React for icons
- Riverpod-inspired state management (using React Context)

## Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── ConfirmDialog.tsx    # Confirmation modal for destructive actions
│   ├── DataTable.tsx        # Generic data table with pagination & search
│   ├── Layout.tsx           # Main layout with sidebar & topbar
│   ├── Modal.tsx            # Generic modal wrapper
│   └── ProtectedRoute.tsx   # Route guard for authenticated pages
├── contexts/            # React context providers
│   └── AuthContext.tsx   # Authentication state & methods
├── lib/                 # Utility functions & API setup
│   └── api.ts           # Axios instance with auth interceptor
├── pages/               # Page components (one per route)
│   ├── Dashboard.tsx     # Home dashboard with metrics
│   ├── Events.tsx        # Manage parish events
│   ├── Financial.tsx     # Financial transactions (income/expense)
│   ├── Login.tsx         # Login page
│   └── Parishioners.tsx  # Manage parishioners (fiéis)
├── types/               # TypeScript interfaces
│   └── index.ts         # All API types & state types
├── App.tsx              # Route definitions
├── index.css            # Global styles with TailwindCSS theme
└── main.tsx             # React app entry point
```

## Key Features

### Authentication
- Login with email & password
- Sanctum Bearer token storage in localStorage
- Automatic token injection in all API requests
- Permission-based access control
- Role support: "sacerdote" (priest) has all permissions, "secretaria" (secretary) has selective permissions

### Pages

1. **Dashboard** (`/`)
   - Parishioner count
   - Upcoming events count
   - Monthly income/expense summary
   - Tithe comparison (this month vs last month)
   - Recent parishioners & upcoming events preview

2. **Parishioners** (`/paroquianos`)
   - List all parishioners with pagination
   - Search by name/email
   - Create new parishioner
   - Edit parishioner details (name, email, phone, CPF, birth date, gender, address, city, state)
   - Delete parishioners
   - Permission-based visibility

3. **Events** (`/eventos`)
   - List all parish events
   - Search & pagination
   - Create new event (title, description, date/time, location, type, max participants)
   - Edit event details
   - Delete events
   - Shows event type (missa, celebração, encontro, retiro, festa, outro)

4. **Financial** (`/financeiro`)
   - List all financial transactions
   - Filter income vs expense
   - Create transaction (type, amount, description, date, category, payment method, reference)
   - Edit transactions
   - Delete transactions
   - Categories: dízimo, oferta, doação, evento, manutenção, salário, conta, outros
   - Payment methods: dinheiro, PIX, cartão, boleto, transferência

### Components

- **DataTable**: Reusable table component with:
  - Sortable columns
  - Search/filter
  - Pagination controls
  - Action buttons (view, edit, delete)
  - Responsive design

- **Modal**: Generic modal wrapper with sizing (sm/md/lg)
- **ConfirmDialog**: For confirming destructive actions
- **Layout**: Master layout with:
  - Responsive sidebar (collapsible on mobile)
  - Top navigation bar with user menu
  - Logout functionality

## API Integration

All API calls go to `/api/v1` with Bearer token authentication.

### Endpoints Used
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `GET /parish-admin/permissions` - Check user permissions & parish role
- `GET /parish-admin/dashboard` - Dashboard metrics
- `GET/POST /parish-admin/parishioners` - Parishioner CRUD
- `GET/PUT/DELETE /parish-admin/parishioners/{id}`
- `GET/POST /parish-admin/events` - Event CRUD
- `GET/PUT/DELETE /parish-admin/events/{id}`
- `GET/POST /parish-admin/financial-transactions` - Financial CRUD
- `GET/PUT/DELETE /parish-admin/financial-transactions/{id}`

## Styling

- **Color Scheme**: 
  - Primary: `#1565C0` (deep blue)
  - Accent: `#D4AF37` (gold)
  - Grays: Standard Tailwind grays

- **Typography**: System fonts (Segoe UI, Roboto, sans-serif)
- **Responsive**: Mobile-first design with Tailwind breakpoints (sm, md, lg, xl, 2xl)
- **Icons**: Lucide React (18x18 default size)

## Configuration Files

- `vite.config.ts` - Vite build config with React & TailwindCSS plugins, API proxy
- `tsconfig.app.json` - TypeScript config with path alias `@/*` → `src/*`
- `index.html` - HTML entry point
- `.gitignore` - Excludes node_modules, dist, .local files

## Development

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit
```

## Browser Support

- Modern browsers with ES2023 support
- Responsive design works on mobile (375px+) through desktop (1920px+)

## Authentication Flow

1. User logs in with email/password
2. Backend returns `{user, token}`
3. Token stored in localStorage as `auth_token`
4. On page reload, app checks localStorage and calls `/auth/me`
5. If user has parish admin permissions, fetch `/parish-admin/permissions`
6. User is authenticated and permissions are loaded
7. If no permissions or API 401, user is logged out

## Permission System

```typescript
// Sacerdote (Priest) - Full access
hasPermission('any.permission') // Always true

// Secretária (Secretary) - Selective access
hasPermission('parishioners.index')
hasPermission('parishioners.create')
hasPermission('parishioners.update')
hasPermission('parishioners.delete')
// ... etc for events and financial-transactions
```

## Language

All UI strings are in Portuguese (pt-BR), matching the backend and user base.
