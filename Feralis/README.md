# Feralis Frontend Application

React + TypeScript + Vite frontend for the Feralis Manufacturing Platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to Feralis backend API (running on `http://localhost:3000` by default)

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── api/               # API client and backend communication
│   │   └── client.ts      # Axios-based API client
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   │   ├── Login.tsx
│   │   │   ├── MFAVerification.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── common/        # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── layout/        # Layout components
│   │   │   └── MainLayout.tsx
│   │   ├── portal/        # Customer portal components
│   │   └── analytics/     # Analytics components
│   ├── contexts/          # State management (Zustand stores)
│   │   └── auth.ts        # Authentication store
│   ├── hooks/             # Custom React hooks
│   ├── router/            # React Router configuration
│   │   └── index.tsx
│   ├── styles/            # Global styles
│   │   └── index.css      # Tailwind CSS + custom styles
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   └── index.ts
│   ├── App.tsx            # Root component
│   └── main.tsx           # Application entry point
├── .env                   # Environment variables
├── .env.example           # Environment template
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite build configuration
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory (use `.env.example` as template):

```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000

# Application Configuration
VITE_APP_NAME=Feralis Manufacturing Platform
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PORTAL=true
VITE_ENABLE_REAL_TIME_UPDATES=true

# Session Configuration
VITE_SESSION_TIMEOUT=900000
VITE_REFRESH_INTERVAL=120000
```

### API Proxy

During development, API calls to `/api/*` are automatically proxied to your backend server (configured in `vite.config.ts`). This avoids CORS issues.

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run preview          # Preview production build locally

# Building
npm run build            # Build for production
npm run type-check       # Run TypeScript type checking

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

## 🎨 Styling

This project uses **Tailwind CSS** for styling with custom configuration:

- Custom color palette (primary, secondary)
- Custom components (buttons, inputs, cards)
- Responsive design utilities
- Dark mode support (can be enabled)

### Using Custom Classes

```tsx
import { Button } from '@/components/common/Button';

<Button variant="primary" size="md">
  Click Me
</Button>
```

## 🔐 Authentication

The app uses JWT-based authentication with the following flow:

1. User logs in with email/password
2. If MFA is enabled, user is prompted for verification code
3. Access token is stored in localStorage
4. Refresh token automatically renews access token
5. Protected routes require authentication

### Using Authentication in Components

```tsx
import { useAuthStore } from '@/contexts/auth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  
  // Your component logic
}
```

### Protected Routes

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

<ProtectedRoute requiredPermission="orders.read">
  <OrdersPage />
</ProtectedRoute>
```

## 🛣️ Routing

Routes are configured using React Router v6 in `src/router/index.tsx`:

- `/login` - Login page
- `/auth/mfa` - MFA verification
- `/dashboard` - Main dashboard (protected)
- `/analytics` - Analytics dashboard (protected)
- `/orders` - Orders management (protected)
- `/inventory` - Inventory management (protected)
- `/quotes` - Quotes management (protected)
- `/settings` - User settings (protected)

## 📡 API Integration

### Making API Calls

```tsx
import apiClient from '@/api/client';

// GET request
const data = await apiClient.get('/api/v1/dashboard');

// POST request
const result = await apiClient.post('/api/v1/orders', orderData);

// With auth (automatic)
const dashboard = await apiClient.getDashboard(organizationId);
```

### Adding New API Endpoints

Edit `src/api/client.ts` to add new methods:

```typescript
async getMyData(): Promise<MyData> {
  const response = await this.client.get('/api/v1/my-endpoint');
  return response.data;
}
```

## 🏗️ Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

The built files will be in the `dist/` directory and can be served by any static file server.

### Deployment

#### Option 1: Static Hosting (Netlify, Vercel, etc.)

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your hosting provider
3. Configure environment variables in your hosting platform
4. Set up redirects for SPA routing (all routes → index.html)

#### Option 2: Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Option 3: Serve with Backend

Place the `dist/` folder contents in your backend's static files directory.

## 🧪 Testing

```bash
# Run tests (when test suite is added)
npm run test

# Run tests in watch mode
npm run test:watch
```

## 🔍 Troubleshooting

### CORS Issues

If you encounter CORS errors:
1. Ensure the backend is configured to allow requests from `http://localhost:5173`
2. Check the proxy configuration in `vite.config.ts`
3. Verify `VITE_API_URL` in `.env` points to correct backend

### Build Errors

If build fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Type Errors

```bash
# Regenerate TypeScript declarations
npm run type-check
```

## 📚 Key Dependencies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router 6** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **date-fns** - Date utilities
- **Recharts** - Data visualization

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking
4. Test thoroughly
5. Submit a pull request

## 📄 License

Proprietary - Feralis Manufacturing Platform

## 🆘 Support

For issues or questions:
- Email: support@feralis.com
- Documentation: [Internal Wiki]
