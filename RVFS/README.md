# RFVS Website - Dynamic Job Loading Update

This package upgrades your RFVS website to use a dynamic job loading system.

## What This Update Does

✅ **Converts static job pages to dynamic JSON-based system**
- Add jobs by creating JSON files instead of HTML pages
- One template displays all jobs automatically
- GitHub Actions automates everything

✅ **Enables local testing**
- Test jobs before deploying
- Simple Node.js script generates job index

✅ **Automates deployment**
- Push a JSON file → Jobs update automatically
- No manual HTML editing needed

---

## Quick Start

### 1. Read INSTALLATION.md First

The **INSTALLATION.md** file contains complete step-by-step instructions.

### 2. Install Node.js

Required for local testing: https://nodejs.org/

### 3. Extract and Copy Files

See INSTALLATION.md for detailed instructions.

### 4. Test Locally

```bash
cd /path/to/thaaatcolin
node RFVS_scripts/generate-index.js
# Open RFVS_index.html in browser
```

### 5. Push to GitHub

```bash
git add .
git commit -m "Add dynamic job loading"
git push
```

---

## File Overview

### New Files
- `.github/workflows/build-jobs.yml` - Automates job index generation
- `RFVS_scripts/generate-index.js` - Builds job index from JSON files
- `RFVS_jobs/RFVS_role-jobs-director-ops.json` - Example job
- `RFVS_jobs/RFVS_index.json` - Job listing (auto-generated)
- `RFVS_role-detail.html` - Universal job detail page
- `INSTALLATION.md` - Complete setup guide

### Modified Files
- `RFVS_careers.html` - Now loads jobs dynamically
- `RFVS_styles.css` - Added loading/error message styles

### Unchanged Files (Included)
- `RFVS_index.html`
- `RFVS_main.js`
- `RFVS_logo.png`

---

## Repository

This update is for: https://github.com/ErieRenaissance/thaaatcolin

---

## How It Works

### Before
```
User adds job → Create new HTML file → Update careers page → Deploy
```

### After
```
User adds job → Create JSON file → Push to GitHub → Auto-updates ✨
```

---

## Adding Your First Job

After installation:

1. Create `RFVS_jobs/RFVS_role-jobs-example.json`
2. Fill in job details (see template in INSTALLATION.md)
3. Run: `node RFVS_scripts/generate-index.js`
4. Test in browser
5. Push to GitHub

Done! Job appears on your site automatically.

---

## Support

**For detailed help, see:**
- `INSTALLATION.md` - Complete setup instructions
- Repository README.md - Full documentation
- QUICK_REFERENCE.md - Common tasks

**Having issues?**
1. Check INSTALLATION.md troubleshooting section
2. Verify Node.js is installed
3. Check GitHub Actions logs
4. Check browser console (F12)

---

## What's Included in This Package

```
rfvs-website-update/
├── .github/workflows/build-jobs.yml
├── RFVS_scripts/generate-index.js
├── RFVS_jobs/
│   ├── RFVS_role-jobs-director-ops.json
│   └── RFVS_index.json
├── RFVS_index.html
├── RFVS_careers.html (MODIFIED ⚠️)
├── RFVS_role-detail.html (NEW ✨)
├── RFVS_styles.css (MODIFIED ⚠️)
├── RFVS_main.js
├── RFVS_logo.png
├── INSTALLATION.md (START HERE! 📖)
└── README.md (this file)
```

---

**👉 Start with INSTALLATION.md for complete setup instructions!**
