# File Naming Update - Reference

## Before and After

All website files have been renamed with the **RFVS_** prefix (Refounder Venture Studio).

### File Name Changes

| Old Name | New Name |
|----------|----------|
| index.html | **RFVS_index.html** |
| careers.html | **RFVS_careers.html** |
| role-director-portfolio-ops.html | **RFVS_role-director-portfolio-ops.html** |
| styles.css | **RFVS_styles.css** |
| main.js | **RFVS_main.js** |
| logo.png | **RFVS_logo.png** |

### What This Means

**All internal references have been updated:**
- HTML files now link to RFVS_careers.html, RFVS_index.html, etc.
- CSS and JS are referenced as RFVS_styles.css and RFVS_main.js
- Logo image is referenced as RFVS_logo.png

**You must use the new file names:**
- Entry point: **RFVS_index.html** (not index.html)
- When deploying, upload all files with RFVS_ prefix
- When creating new pages, maintain the naming convention

## Benefits of RFVS_ Prefix

✓ **Easy Identification** - Instantly recognizable as Refounder Venture Studio files
✓ **Professional Organization** - Clear branding in file structure
✓ **No Conflicts** - Won't clash with other projects in shared directories
✓ **Simple Filtering** - Easy to search, sort, and manage
✓ **Consistent Branding** - Matches organizational standards

## When Creating New Files

Always maintain the RFVS_ prefix:

**New job page:**
```
RFVS_role-[job-title].html
Example: RFVS_role-operations-manager.html
```

**New regular page:**
```
RFVS_[page-name].html
Example: RFVS_about.html
```

**New assets:**
```
RFVS_[asset-name].[extension]
Example: RFVS_hero-image.jpg
```

## Important Reminders

⚠️ **Entry point is now RFVS_index.html** - Open this file to view the website

⚠️ **All files must have RFVS_ prefix** - Don't mix old and new naming

⚠️ **Case sensitive** - RFVS_index.html ≠ rfvs_index.html on some servers

⚠️ **Keep files together** - All RFVS_* files must be in the same directory

## Quick Check

Open **RFVS_index.html** in your browser. You should see:
- Logo displays correctly (RFVS_logo.png loads)
- Styling works (RFVS_styles.css loads)
- "View Opportunities" button works (links to RFVS_careers.html)
- Contact form works (RFVS_main.js loads)

If any of these don't work, check that all RFVS_* files are in the same folder.

## File Structure

Your website folder should look like this:

```
your-website-folder/
├── RFVS_index.html
├── RFVS_careers.html
├── RFVS_role-director-portfolio-ops.html
├── RFVS_styles.css
├── RFVS_main.js
├── RFVS_logo.png
├── README.md
├── QUICK_REFERENCE.md
└── SUMMARY.md
```

## Need to Revert?

If you need files without the prefix, you would need to:
1. Rename all RFVS_* files to remove the prefix
2. Update all internal references in HTML files
3. Update CSS and JS references

**Not recommended** - The RFVS_ prefix provides better organization and professionalism.

---

**Questions?** See README.md or QUICK_REFERENCE.md for detailed guidance.
