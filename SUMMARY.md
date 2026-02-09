# Website Files - Summary

## File Naming Convention

All website files now use the **RFVS_** prefix (Refounder Venture Studio) for:
- Easy identification and organization
- Consistent branding across all assets
- Professional file structure
- Simple search and filtering

## Complete File List

### Core Website Files

**[RFVS_index.html](computer:///mnt/user-data/outputs/RFVS_index.html)**
- Landing page with hero, mission, and CTAs
- Contact modal form
- **Start here** - This is your entry point

**[RFVS_careers.html](computer:///mnt/user-data/outputs/RFVS_careers.html)**
- Job listings page with navigation
- Links to individual job detail pages

**[RFVS_role-director-portfolio-ops.html](computer:///mnt/user-data/outputs/RFVS_role-director-portfolio-ops.html)**
- Complete Director - Portfolio Operations job description
- Application modal form
- Template for creating additional job pages

### Shared Resources

**[RFVS_styles.css](computer:///mnt/user-data/outputs/RFVS_styles.css)**
- Complete stylesheet for entire website
- Light theme with gold/cream colors
- Responsive design
- Edit this to change colors, fonts, spacing

**[RFVS_main.js](computer:///mnt/user-data/outputs/RFVS_main.js)**
- Form handling for contact and applications
- Modal functionality
- Toast notifications

**[RFVS_logo.png](computer:///mnt/user-data/outputs/RFVS_logo.png)**
- Company logo used throughout site
- 400px on desktop hero
- 50px in navigation

### Documentation

**[README.md](computer:///mnt/user-data/outputs/README.md)**
- Complete documentation
- Deployment instructions
- Backend integration guide
- Customization examples

**[QUICK_REFERENCE.md](computer:///mnt/user-data/outputs/QUICK_REFERENCE.md)**
- Quick how-to guide
- Common tasks
- Troubleshooting tips

## What's Different?

### File Naming
- **Old**: index.html, careers.html, styles.css
- **New**: RFVS_index.html, RFVS_careers.html, RFVS_styles.css

### Internal References Updated
All links and references between files now use the RFVS_ prefix:
- HTML links: `href="RFVS_careers.html"`
- CSS links: `href="RFVS_styles.css"`
- JavaScript links: `src="RFVS_main.js"`
- Image sources: `src="RFVS_logo.png"`

## How to Use

### 1. Start Here
Open **RFVS_index.html** in your browser to view the landing page

### 2. Navigate
- Click "View Opportunities" → Goes to RFVS_careers.html
- Click "Get In Touch" → Opens contact modal
- On careers page, click job card → Opens RFVS_role-director-portfolio-ops.html
- Click "Apply Now" → Opens application modal

### 3. Test Forms
Forms currently simulate submission - see README for backend integration options

### 4. Hard Refresh
If you don't see changes: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)

## Key Features

✓ **Clean multi-page structure** - Easy to maintain and expand
✓ **Consistent naming** - All files prefixed with RFVS_
✓ **Light, modern design** - Warm gold/cream theme
✓ **Responsive** - Works on all devices
✓ **Professional navigation** - Sticky nav on sub-pages
✓ **Modal forms** - Contact and application forms
✓ **Toast notifications** - User feedback on form submission
✓ **Minimal scrolling** - Compact, efficient layout

## Adding New Content

### To Add a New Job:
1. Copy `RFVS_role-director-portfolio-ops.html`
2. Rename to `RFVS_role-[new-job-name].html`
3. Update content
4. Add card in `RFVS_careers.html`

### To Update Mission:
Edit the mission text section in `RFVS_index.html`

### To Change Colors:
Edit CSS variables in `RFVS_styles.css`

## Deployment Checklist

Before going live:

- [ ] Open RFVS_index.html and test all navigation
- [ ] Test contact form submission
- [ ] Test application form submission
- [ ] Check mobile responsiveness
- [ ] Review all content for accuracy
- [ ] Choose and configure form backend (Formspree recommended)
- [ ] Upload all RFVS_* files to hosting
- [ ] Configure domain
- [ ] Enable SSL certificate
- [ ] Test live site

## Important Notes

**All files must be in the same directory** - The HTML files reference CSS, JS, and images using relative paths. Keep all RFVS_* files together.

**Hard refresh after changes** - Browsers cache CSS and JS. Always hard refresh (Ctrl+Shift+R) to see updates.

**File names are case-sensitive** - On some servers, RFVS_index.html ≠ rfvs_index.html

**Forms need backend** - Current forms simulate submission. Configure a backend service (Formspree, EmailJS, etc.) for actual email delivery.

## Support

**Questions?** Check:
1. README.md for detailed docs
2. QUICK_REFERENCE.md for common tasks
3. Code comments in files
4. Browser console (F12) for errors

## Next Steps

1. **Test locally**: Open RFVS_index.html in browser
2. **Review content**: Check mission, job description, contact info
3. **Choose form backend**: See README → Backend Integration
4. **Deploy**: Upload to Netlify, Vercel, or traditional hosting
5. **Configure domain**: Point your domain to hosting
6. **Go live**: Test everything on production

---

**Ready to start?** → Open [RFVS_index.html](computer:///mnt/user-data/outputs/RFVS_index.html) in your browser!
