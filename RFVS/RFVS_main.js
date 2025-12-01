// ===== MODAL CONTROLS =====

// Contact Modal
function openContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        const form = document.getElementById('contact-form');
        if (form) form.reset();
    }
}

// Application Modal
function openApplicationModal() {
    const modal = document.getElementById('application-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeApplicationModal() {
    const modal = document.getElementById('application-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        const form = document.getElementById('application-form');
        if (form) form.reset();
    }
}

// Close modals on outside click
window.onclick = function(event) {
    const contactModal = document.getElementById('contact-modal');
    const applicationModal = document.getElementById('application-modal');
    
    if (event.target === contactModal) {
        closeContactModal();
    }
    if (event.target === applicationModal) {
        closeApplicationModal();
    }
}

// Close modals on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeContactModal();
        closeApplicationModal();
    }
});

// ===== FORM HANDLING =====

// Toast notification
function showToast(message) {
    const toast = document.getElementById('success-toast');
    const toastMessage = document.getElementById('toast-message');
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
}

// Contact Form Submission
async function handleContactSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('.submit-button');
    const formData = new FormData(form);
    
    // Disable button during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    try {
        // Create email body
        const emailBody = `
Name: ${formData.get('name')}
Email: ${formData.get('email')}
Phone: ${formData.get('phone') || 'Not provided'}

Message:
${formData.get('message')}
        `.trim();
        
        // For production, you would send this to a backend API
        // For now, we'll simulate the submission
        await simulateApiCall();
        
        // Show success message
        showToast('Message sent successfully! We\'ll be in touch soon.');
        closeContactModal();
        
    } catch (error) {
        console.error('Error submitting form:', error);
        showToast('There was an error sending your message. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
    }
}

// Application Form Submission
async function handleApplicationSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('.submit-button');
    const formData = new FormData(form);
    
    // Validate file size (5MB max)
    const resume = formData.get('resume');
    if (resume && resume.size > 5 * 1024 * 1024) {
        showToast('Resume file is too large. Please upload a file smaller than 5MB.');
        return;
    }
    
    // Disable button during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        // Get role title from page if available
        const roleTitle = document.querySelector('.role-detail h1')?.textContent || 'Position';
        
        // Create email body
        const emailBody = `
New Application for: ${roleTitle}

Name: ${formData.get('name')}
Email: ${formData.get('email')}
Phone: ${formData.get('phone')}
LinkedIn: ${formData.get('linkedin') || 'Not provided'}

Resume: [Attached]
        `.trim();
        
        // For production, you would send this to a backend API
        await simulateApiCall();
        
        // Show success message
        showToast('Application submitted successfully! We\'ll review your application and be in touch soon.');
        closeApplicationModal();
        
    } catch (error) {
        console.error('Error submitting application:', error);
        showToast('There was an error submitting your application. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Application';
    }
}

// Simulate API call (replace with actual API integration)
function simulateApiCall() {
    return new Promise((resolve) => {
        setTimeout(resolve, 1500);
    });
}

// ===== FORM INTEGRATION NOTES =====
/*
BACKEND INTEGRATION:

To make the forms actually send emails, you have several options:

1. FORMSPREE (Easiest):
   - Sign up at formspree.io
   - In each HTML file, update the form tags:
     <form id="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   - Remove the onsubmit handler and this JavaScript

2. EMAILJS (Free tier available):
   - Sign up at emailjs.com
   - Install EmailJS library in HTML: 
     <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
   - Update the submit handlers to use EmailJS API

3. CUSTOM BACKEND:
   - Create an API endpoint (Node.js, Python, PHP, etc.)
   - Update the fetch calls to point to your API
   - Handle file uploads for resumes
   
Example with custom API:
   const response = await fetch('/api/contact', {
       method: 'POST',
       body: JSON.stringify(Object.fromEntries(formData)),
       headers: { 'Content-Type': 'application/json' }
   });
*/

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Refounder Studio website loaded');
});
