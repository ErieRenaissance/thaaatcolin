# Quick Reference Guide

## Common Tasks

### 1. Adding a New Job Role

**Step 1: Create the job detail page**
```
1. Copy RFVS_role-director-portfolio-ops.html
2. Rename it (e.g., RFVS_role-marketing-manager.html)
3. Open in a text editor
4. Update these parts:
   - <title> tag (line 6)
   - <h1> (the job title)
   - Job description content
   - Verify "Back to Careers" link points to RFVS_careers.html
```

**Step 2: Add to careers listing**
```
1. Open RFVS_careers.html
2. Find the <!-- Additional roles can be added here --> comment
3. Copy the entire role-card div above it
4. Paste and update:
   - onclick link to your new RFVS_role-*.html file
   - role-title text
   - role-summary text
   - location if different
```

**Step 3: Test**
```
1. Open RFVS_careers.html in browser
2. Click on new role card
3. Verify it opens correct page
4. Test "Apply Now" button
```

### 2. Updating the Mission Statement

**File**: RFVS_index.html

**Location**: Look for `<div class="mission-text">`

**What to edit**: The two `<p>` paragraphs inside

### 3. Changing Contact Email

**For Formspree integration**:
```
1. Sign up at formspree.io
2. Create a form
3. In RFVS_index.html, find the contact form
4. Add: action="https://formspree.io/f/YOUR_FORM_ID" method="POST"
5. In each role page, do the same for application forms
```

### 4. Updating Logo

**Replace**: RFVS_logo.png file

**Requirements**:
- PNG format with transparent background recommended
- Reasonable size (current is 763KB - consider optimizing)
- Aspect ratio should work well in both hero and navigation

**After replacing**:
```
Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
```

### 5. Changing Colors

**File**: RFVS_styles.css

**Location**: Top of file in `:root` section

**Common changes**:
```css
--gold-primary: #B8945F;     /* Main gold color */
--gold-dark: #8B6F47;        /* Darker gold for gradients */
--background: #FDFCFA;       /* Page background */
--white: #ffffff;            /* Card backgrounds */
```

### 6. Adding a Footer Link

**Files to edit**: RFVS_careers.html and all RFVS_role-*.html files

**Location**: Look for `<footer class="page-footer">`

**Example addition**:
```html
<footer class="page-footer">
    <div class="container">
        <p>&copy; 2024 The Refounder Venture Studio. All rights reserved.</p>
        <p><a href="RFVS_privacy.html">Privacy Policy</a> | <a href="RFVS_terms.html">Terms</a></p>
    </div>
</footer>
```

### 7. Removing a Job Listing

**Step 1**: In RFVS_careers.html, delete or comment out the role-card div

**Step 2**: Optionally delete the RFVS_role-*.html file

**Step 3**: Refresh and verify it's gone

### 8. Updating CTA Cards on Homepage

**File**: RFVS_index.html

**Location**: Look for `<section class="cta-section">`

**What you can edit**:
- Icon (change the SVG path)
- Heading (h3 text)
- Description (p text)
- Button text ("Contact Us" or "View Opportunities")
- onclick action (make sure it uses RFVS_ prefix for links)

### 9. Testing Forms Locally

**Current behavior**: Forms are simulated (they don't actually send)

**To see the simulation work**:
```
1. Open RFVS_index.html
2. Click "Contact Us"
3. Fill out form
4. Click "Send Message"
5. You'll see a success toast notification
```

**To make them actually work**: See README section on "Backend Integration"

### 10. Deploying Updates

**For Netlify** (drag-and-drop):
```
1. Make your changes locally
2. Zip all RFVS_* files
3. Go to Netlify dashboard
4. Drag zip onto existing site
5. Wait for deployment
```

**For traditional hosting**:
```
1. Connect via FTP
2. Upload changed RFVS_* files only
3. Clear browser cache
4. Test live site
```

## File Reference

| File | Purpose | Edit When |
|------|---------|-----------|
| RFVS_index.html | Landing page | Changing mission, hero, CTAs |
| RFVS_careers.html | Job listings | Adding/removing jobs |
| RFVS_role-*.html | Job details | Creating new positions |
| RFVS_styles.css | All styling | Changing colors, fonts, spacing |
| RFVS_main.js | Forms and modals | Changing form behavior |
| RFVS_logo.png | Company logo | Updating branding |

## File Naming Convention

**All website files use the RFVS_ prefix** (Refounder Venture Studio)

**When creating new files:**
- New job role: `RFVS_role-[job-name].html`
- New page: `RFVS_[page-name].html`
- New asset: `RFVS_[asset-name].[ext]`

**Why this matters:**
- Easy identification in mixed directories
- Consistent branding
- Simple search and filtering
- Professional organization

## Common CSS Tweaks

### Make logo bigger on homepage
```css
.hero-logo {
    max-width: 500px;  /* Change from 400px */
}
```

### Change button color
```css
.cta-button,
.submit-button,
.apply-button {
    background: linear-gradient(135deg, #YOUR_COLOR, #YOUR_DARK_COLOR);
}
```

### Adjust spacing
```css
:root {
    --spacing-lg: 3rem;  /* Adjust these values */
}
```

### Change font
```css
/* In the <head> of each HTML file */
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@300;400;600&display=swap">

/* In RFVS_styles.css */
--font-primary: 'YourFont', sans-serif;
```

## Troubleshooting

### Changes don't show up
**Solution**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Forms don't work
**Expected**: They're simulated until you add backend integration

### Logo doesn't appear
**Check**: File is named RFVS_logo.png and in same folder as HTML files

### Page navigation broken
**Check**: 
- File names match exactly in href attributes
- All links use RFVS_ prefix
- Files are in the same directory

### Styling looks wrong
**Check**: RFVS_styles.css is in same folder and linked in HTML <head>

### Mobile view issues
**Test**: Use browser dev tools (F12) and toggle device toolbar

## Need Help?

1. Check README.md for detailed documentation
2. Look at code comments in each file
3. Use browser developer tools (F12) to debug
4. Verify all files are in the same directory
5. Check browser console for JavaScript errors
6. Ensure all file references use RFVS_ prefix

## Contact for Development Help

For custom features or advanced modifications, you may need to:
- Hire a web developer
- Use a website builder platform
- Learn HTML/CSS/JavaScript basics

This is a standard static website - any web developer can help you customize it further.

## Quick Deployment Checklist

Before deploying to production:

- [ ] All files have RFVS_ prefix
- [ ] All internal links reference RFVS_ files
- [ ] Logo file is optimized for web
- [ ] Forms are configured with backend (or noted as coming soon)
- [ ] All content is reviewed and accurate
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile devices
- [ ] Hard refresh shows latest changes
- [ ] No broken links
- [ ] Contact information is correct

## Entry Point

**Start here**: Open `RFVS_index.html` in your browser

This is your landing page and the entry point to the website. All navigation flows from here.
