# The Refounder Venture Studio - Website

A professional, clean multi-page website for The Refounder Venture Studio, featuring company information, career opportunities, and contact forms.

## File Structure

```
refounder-website/
├── RFVS_index.html                          # Landing page (home)
├── RFVS_careers.html                        # Job listings page
├── RFVS_role-director-portfolio-ops.html    # Individual job detail page
├── RFVS_styles.css                          # Shared stylesheet for all pages
├── RFVS_main.js                             # Shared JavaScript for forms and modals
├── RFVS_logo.png                            # Company logo
└── README.md                                # This file
```

### Page Breakdown

**RFVS_index.html** - Landing Page
- Hero section with logo and company name
- Mission statement
- Two CTA cards (Contact and Careers)
- Contact modal form

**RFVS_careers.html** - Careers Page
- Navigation with logo and back button
- Page header with description
- List of all open positions
- Footer
- Links to individual role pages

**RFVS_role-director-portfolio-ops.html** - Job Detail Page
- Navigation with logo and back button
- Complete job description
- Application modal form
- Footer

**Additional role pages** can be easily created by duplicating and editing the role detail page template.

## Features

### Clean Architecture
- **Separation of concerns**: Each page has its own HTML file
- **Shared resources**: Single CSS and JS file for consistency
- **Easy maintenance**: Update content without touching code
- **Scalable**: Simple to add new pages and roles
- **Consistent naming**: All files prefixed with RFVS_ for easy organization

### Professional Design
- Modern, responsive layout that works on all devices
- Warm, light color scheme based on brand (gold/cream/white)
- Clean typography using Inter font
- Smooth animations and transitions

### User Experience
- Minimal scrolling required
- Clear navigation between pages
- Sticky navigation bar on sub-pages
- Modal forms for contact and applications
- Form validation and user feedback
- Toast notifications for confirmations

## Quick Start

1. **Ensure all files are in the same directory**
2. **Open `RFVS_index.html` in a web browser** to view the site
3. **Navigate** between pages using the buttons and links
4. **Test forms** (they currently simulate submission)

## Customization

### Adding New Job Roles

1. **Duplicate** `RFVS_role-director-portfolio-ops.html`
2. **Rename** the file (e.g., `RFVS_role-operations-manager.html`)
3. **Update content**:
   - Change the page title
   - Update the role title and metadata
   - Replace the job description content
   - Verify all links use RFVS_ prefix

4. **Add to careers page**:
   - Open `RFVS_careers.html`
   - Duplicate an existing role card
   - Update the onclick link to point to your new file
   - Update title, summary, and metadata

Example role card in RFVS_careers.html:
```html
<div class="role-card" onclick="window.location.href='RFVS_role-your-new-role.html'">
    <div class="role-header">
        <h3 class="role-title">Your Role Title</h3>
        <span class="role-badge">Full-Time</span>
    </div>
    <p class="role-summary">Brief description...</p>
    <div class="role-meta">
        <span class="role-location">
            <svg>...</svg>
            Location
        </span>
    </div>
    <button class="view-role-button">View Details →</button>
</div>
```

### Updating Colors

Edit CSS variables in `RFVS_styles.css`:
```css
:root {
    --gold-primary: #B8945F;
    --gold-dark: #8B6F47;
    --gold-light: #D4B987;
    /* etc. */
}
```

### Updating Content

All content is in the HTML files and can be edited directly:
- **Homepage content**: Edit `RFVS_index.html`
- **Mission statement**: Edit the `.mission-text` section in `RFVS_index.html`
- **Job listings**: Edit `RFVS_careers.html`
- **Job descriptions**: Edit individual role pages

### Updating Navigation Logo Size

Edit in `RFVS_styles.css`:
```css
.nav-logo img {
    height: 50px;  /* Adjust this value */
    width: auto;
}
```

## Backend Integration

The website currently uses simulated form submissions. To enable actual email functionality:

### Option 1: Formspree (Recommended - Easiest)

1. Sign up at [formspree.io](https://formspree.io)
2. Create forms for "Contact" and "Application"
3. Update each form in the HTML files:

```html
<!-- In RFVS_index.html for contact form -->
<form id="contact-form" action="https://formspree.io/f/YOUR_CONTACT_FORM_ID" method="POST">

<!-- In role pages for application form -->
<form id="application-form" action="https://formspree.io/f/YOUR_APPLICATION_FORM_ID" method="POST">
```

4. Remove the `onsubmit` handlers from the form tags
5. Add hidden field for role name in application forms:
```html
<input type="hidden" name="role" value="Director - Portfolio Operations">
```

### Option 2: EmailJS

1. Sign up at [emailjs.com](https://www.emailjs.com)
2. Create email templates
3. Add EmailJS library to each HTML file:
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
```
4. Update `RFVS_main.js` to use EmailJS API instead of `simulateApiCall()`

### Option 3: Custom Backend

Create your own API endpoint and update the submission handlers in `RFVS_main.js`:

```javascript
const response = await fetch('https://your-api.com/contact', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(formData)),
    headers: { 'Content-Type': 'application/json' }
});
```

For resume uploads, you'll need:
- File upload handling on the backend
- Storage solution (AWS S3, etc.)
- Email service that supports attachments

## Deployment

### Option 1: Netlify (Recommended)

1. Sign up at [netlify.com](https://www.netlify.com)
2. Drag and drop your website folder
3. Configure custom domain
4. Optionally use Netlify Forms for easy form handling

### Option 2: Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Import your project (via GitHub or upload)
3. Configure custom domain

### Option 3: Traditional Web Hosting

1. Upload all RFVS_* files via FTP/cPanel to your hosting
2. Ensure file permissions are set correctly (644 for files, 755 for directories)
3. Point your domain to the hosting
4. Enable SSL certificate

### Option 4: GitHub Pages

1. Create a GitHub repository
2. Upload all files
3. Enable GitHub Pages in repository settings
4. Optionally configure custom domain

## File Naming Convention

All website files are prefixed with **RFVS_** (Refounder Venture Studio) for:
- Easy identification in mixed directories
- Clear organization when working with multiple projects
- Consistent branding across all assets
- Simple search and filtering

When creating new pages, always maintain this naming convention:
- New job role: `RFVS_role-[job-name].html`
- New page: `RFVS_[page-name].html`

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Best Practices Implemented

### HTML
- Semantic HTML5 elements
- Proper heading hierarchy
- Descriptive meta tags for SEO
- Accessible forms with labels
- Clean, readable code structure

### CSS
- CSS custom properties (variables) for easy theming
- Mobile-first responsive design
- Organized with clear section comments
- Minimal external dependencies
- Optimized for performance

### JavaScript
- Vanilla JS (no framework dependencies)
- Event delegation where appropriate
- Clear function names and comments
- Modular code organization
- Graceful error handling

### File Organization
- Logical file naming convention with RFVS_ prefix
- Separation of concerns (HTML/CSS/JS)
- Reusable components (navigation, footer)
- Easy to scale and maintain

## Performance

- Minimal external dependencies (only Google Fonts)
- Optimized CSS (no unused styles)
- Efficient JavaScript (no heavy libraries)
- Fast page load times
- SEO-friendly structure

## Accessibility

- Proper semantic HTML
- ARIA labels where needed
- Keyboard navigation support (ESC to close modals)
- Sufficient color contrast
- Form labels and validation
- Responsive design for all screen sizes

## Maintenance

### To Add a New Job:
1. Duplicate RFVS_role-director-portfolio-ops.html
2. Rename with RFVS_ prefix
3. Update content
4. Add card to RFVS_careers.html
5. Done!

### To Update Content:
1. Edit the relevant RFVS_*.html file
2. Save and refresh browser
3. Upload to hosting

### To Update Styling:
1. Edit `RFVS_styles.css`
2. Save and refresh browser (hard refresh: Ctrl+Shift+R)
3. Upload to hosting

## Security Considerations

- All forms include validation
- File upload size limits (5MB)
- No sensitive data stored client-side
- HTTPS recommended (free with most hosting)
- Input sanitization should be handled on backend

## Future Enhancements

Consider adding:
- Blog or news section
- Portfolio company showcase
- Team member profiles
- Testimonials from founders
- Newsletter signup
- Social media integration
- Google Analytics

## Support

For questions about:
- **Content updates**: Edit HTML files directly
- **Style changes**: Edit `RFVS_styles.css`
- **Adding pages**: Duplicate existing pages and modify
- **Form integration**: See "Backend Integration" section
- **Deployment**: See "Deployment" section

## License

This website was custom-built for The Refounder Venture Studio. All rights reserved.

## Credits

- **Font**: Inter by Rasmus Andersson
- **Icons**: Custom SVG icons
- **Design**: Custom design based on brand guidelines
