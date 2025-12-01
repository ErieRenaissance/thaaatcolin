# RFVS Website - Installation & Setup Guide

## What's in This Package

This package contains all the files needed to add dynamic job loading to your RFVS website.

### New Files
- `.github/workflows/build-jobs.yml` - GitHub Actions automation
- `RFVS_scripts/generate-index.js` - Script to generate job index
- `RFVS_jobs/RFVS_role-jobs-director-ops.json` - Example job posting
- `RFVS_jobs/RFVS_index.json` - Job index (auto-generated)
- `RFVS_role-detail.html` - Dynamic job detail page

### Modified Files (Replace Existing)
- `RFVS_careers.html` - Updated with dynamic loading
- `RFVS_styles.css` - Added new styles for loading messages

### Unchanged Files (Included for Completeness)
- `RFVS_index.html`
- `RFVS_main.js`
- `RFVS_logo.png`

---

## Prerequisites

**Install Node.js** (if not already installed):
1. Go to https://nodejs.org/
2. Download and install the LTS version
3. Verify installation: Open terminal and run `node --version`

---

## Installation Steps

### Step 1: Backup Your Current Repository

Before making changes, create a backup:

```bash
cd /path/to/thaaatcolin
git checkout -b backup-before-dynamic-jobs
git push origin backup-before-dynamic-jobs
git checkout main
```

### Step 2: Extract Files

1. Download and extract this zip file
2. You'll see this structure:
   ```
   rfvs-website-update/
   ├── .github/
   │   └── workflows/
   │       └── build-jobs.yml
   ├── RFVS_scripts/
   │   └── generate-index.js
   ├── RFVS_jobs/
   │   ├── RFVS_role-jobs-director-ops.json
   │   └── RFVS_index.json
   ├── RFVS_index.html
   ├── RFVS_careers.html (MODIFIED)
   ├── RFVS_role-detail.html (NEW)
   ├── RFVS_styles.css (MODIFIED)
   ├── RFVS_main.js
   ├── RFVS_logo.png
   └── INSTALLATION.md (this file)
   ```

### Step 3: Copy Files to Your Repository

Navigate to your repository and copy the files:

```bash
# Navigate to your repo
cd /path/to/thaaatcolin

# Copy the new folders
cp -r /path/to/extracted/rfvs-website-update/.github .
cp -r /path/to/extracted/rfvs-website-update/RFVS_scripts .
cp -r /path/to/extracted/rfvs-website-update/RFVS_jobs .

# Copy the new/modified files
cp /path/to/extracted/rfvs-website-update/RFVS_careers.html .
cp /path/to/extracted/rfvs-website-update/RFVS_role-detail.html .
cp /path/to/extracted/rfvs-website-update/RFVS_styles.css .
```

### Step 4: Test Locally

Before pushing to GitHub, test everything locally:

```bash
# Navigate to your repo
cd /path/to/thaaatcolin

# Generate the job index
node RFVS_scripts/generate-index.js

# You should see:
# 🔍 Scanning for RFVS job files...
# ✅ Found 1 job file(s)
#   ✓ Director - Portfolio Operations
# ✅ Generated RFVS_index.json with 1 job(s)
```

Now open `RFVS_index.html` in your browser:

1. ✅ Click "View Opportunities"
2. ✅ Verify the job card appears
3. ✅ Click the job card
4. ✅ Verify it loads the job details
5. ✅ Test the "Apply Now" button

### Step 5: Commit and Push to GitHub

```bash
git add .
git commit -m "Add dynamic job loading system with GitHub Actions"
git push origin main
```

### Step 6: Enable GitHub Actions

1. Go to https://github.com/ErieRenaissance/thaaatcolin
2. Click the "Actions" tab
3. If prompted, enable GitHub Actions
4. Find "Build Job Index" workflow
5. Click "Run workflow" to test it

You should see the workflow run successfully and update `RFVS_jobs/RFVS_index.json`

---

## How to Use After Installation

### Adding a New Job

1. Create a new JSON file in `RFVS_jobs/`:
   ```
   RFVS_jobs/RFVS_role-jobs-YOUR-JOB-NAME.json
   ```

2. Use this template:
   ```json
   {
     "id": "unique-job-id",
     "title": "Job Title",
     "type": "Full-Time",
     "location": "Location",
     "summary": "Brief summary for listing card",
     "description": "<p>Full HTML description...</p>"
   }
   ```

3. Test locally:
   ```bash
   node RFVS_scripts/generate-index.js
   # Open RFVS_index.html in browser
   ```

4. Commit and push:
   ```bash
   git add RFVS_jobs/RFVS_role-jobs-YOUR-JOB-NAME.json
   git commit -m "Add [Job Title] position"
   git push
   ```

GitHub Actions will automatically update the index within 1-2 minutes!

### Removing a Job

Simply delete the JSON file and push:

```bash
git rm RFVS_jobs/RFVS_role-jobs-OLD-JOB.json
git commit -m "Remove [Job Title] position"
git push
```

### Editing a Job

Edit the JSON file, test locally, then push:

```bash
# Edit the file
node RFVS_scripts/generate-index.js  # Test
git add RFVS_jobs/RFVS_role-jobs-EDITED-JOB.json
git commit -m "Update [Job Title] description"
git push
```

---

## Troubleshooting

### Jobs Don't Load Locally

**Problem**: Opening `RFVS_index.html` shows "Loading opportunities..." forever

**Solution**: 
- Run `node RFVS_scripts/generate-index.js` first
- Make sure you have at least one job file in `RFVS_jobs/`
- Check browser console (F12) for errors

### GitHub Actions Fails

**Problem**: Workflow shows error in Actions tab

**Solution**:
- Check that you have proper permissions in the repository
- Verify Node.js version in workflow (should be 18)
- Look at the error logs in the Actions tab

### Script Can't Find Jobs Directory

**Problem**: `generate-index.js` says "RFVS_jobs directory not found"

**Solution**:
- Make sure you're running the script from the repository root
- Verify the `RFVS_jobs/` folder exists

### Jobs Show on Careers Page but Details Don't Load

**Problem**: Clicking a job card shows "Job not found"

**Solution**:
- Check that the job's `id` field matches exactly
- Verify `RFVS_index.json` was generated correctly
- Check browser console for fetch errors

---

## File Structure After Installation

```
thaaatcolin/
├── .github/
│   └── workflows/
│       └── build-jobs.yml
├── RFVS_scripts/
│   └── generate-index.js
├── RFVS_jobs/
│   ├── RFVS_role-jobs-director-ops.json
│   └── RFVS_index.json
├── RFVS_index.html
├── RFVS_careers.html
├── RFVS_role-detail.html
├── RFVS_role-director-portfolio-ops.html (can delete after testing)
├── RFVS_styles.css
├── RFVS_main.js
├── RFVS_logo.png
├── README.md
├── QUICK_REFERENCE.md
├── FILE_NAMING_REFERENCE.md
└── SUMMARY.md
```

---

## What Changed?

### Before (Static):
- Each job was a separate HTML file
- Jobs manually added to careers page
- Hard to maintain multiple jobs

### After (Dynamic):
- Jobs stored as JSON data files
- One template page (`RFVS_role-detail.html`) displays all jobs
- Add/remove jobs by just adding/deleting JSON files
- GitHub Actions automatically updates the site

---

## Need Help?

1. Check this INSTALLATION.md file
2. Check README.md for detailed documentation
3. Look at QUICK_REFERENCE.md for common tasks
4. Check browser console (F12) for errors
5. Check GitHub Actions logs if automation fails

---

## Success Checklist

After installation, verify:

- [ ] Node.js is installed (`node --version` works)
- [ ] Script runs successfully (`node RFVS_scripts/generate-index.js`)
- [ ] Jobs load on careers page locally
- [ ] Job details page works locally
- [ ] Files pushed to GitHub
- [ ] GitHub Actions workflow runs successfully
- [ ] Jobs load on live site

---

**You're all set!** Your website now has dynamic job loading. Just add JSON files to add new jobs.
