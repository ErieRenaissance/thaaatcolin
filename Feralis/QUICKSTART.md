# 🚀 Quick Start Guide - Feralis Frontend

Get the Feralis frontend up and running in 5 minutes!

## Step 1: Prerequisites Check

Make sure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ Backend API running (default: `http://localhost:3000`)

Don't have Node.js? Download it from [nodejs.org](https://nodejs.org)

## Step 2: Installation

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies (this may take a few minutes)
npm install
```

## Step 3: Configuration

The `.env` file is already configured for local development with default values:
```env
VITE_API_URL=http://localhost:3000
```

If your backend runs on a different URL, edit the `.env` file.

## Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.0.11  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 5: Open Your Browser

Navigate to: **http://localhost:5173**

You should see the Feralis login page!

## Default Test Credentials

Ask your backend administrator for test credentials, or use the default:
- Email: `admin@feralis.com`
- Password: `Admin123!`

## What's Next?

✅ **Development**: Make changes to files in `src/` - they'll hot reload automatically!

✅ **Build for Production**: Run `npm run build` when ready to deploy

✅ **Explore**: Check out the components in `src/components/`

## Common Issues

### Port 5173 already in use?

```bash
# Kill the process using port 5173
npx kill-port 5173

# Or use a different port
npm run dev -- --port 3001
```

### Can't connect to backend?

1. Make sure your backend is running on port 3000
2. Check `VITE_API_URL` in `.env`
3. Look for CORS errors in browser console

### npm install fails?

```bash
# Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Project Structure Overview

```
src/
├── components/     # React components
│   ├── auth/      # Login, MFA
│   ├── common/    # Buttons, Inputs, Cards
│   └── layout/    # Main layout with navigation
├── api/           # Backend communication
├── contexts/      # State management
├── router/        # Route configuration
└── styles/        # Tailwind CSS styles
```

## Need Help?

- 📚 Full documentation: See `README.md`
- 🚀 Deployment guide: See `DEPLOYMENT.md`
- 💬 Support: support@feralis.com

---

**Happy coding! 🎉**
