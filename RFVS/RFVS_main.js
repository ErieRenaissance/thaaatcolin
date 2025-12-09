// ===== HAMBURGER MENU CONTROLS =====

function openNavMenu() {
    const overlay = document.getElementById('nav-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    if (hamburger) {
        hamburger.classList.add('active');
    }
}

function closeNavMenu() {
    const overlay = document.getElementById('nav-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    if (hamburger) {
        hamburger.classList.remove('active');
    }
}

// ===== MODAL CONTROLS =====

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

// ===== TOAST NOTIFICATION =====

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

// ===== FORM HANDLING =====

async function handleContactSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('.submit-button');
    const formData = new FormData(form);
    
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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

async function handleApplicationSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('.submit-button');
    const formData = new FormData(form);
    
    const resume = formData.get('resume');
    if (resume && resume.size > 5 * 1024 * 1024) {
        showToast('Resume file is too large. Please upload a file smaller than 5MB.');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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

// ===== INITIALIZE EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', function() {
    // Hamburger menu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('nav-close-btn');
    const overlay = document.getElementById('nav-overlay');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (overlay && overlay.classList.contains('active')) {
                closeNavMenu();
            } else {
                openNavMenu();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeNavMenu();
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeNavMenu();
            }
        });
    }
    
    // Close menu on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (overlay && overlay.classList.contains('active')) {
                closeNavMenu();
            }
            closeContactModal();
            closeApplicationModal();
        }
    });
    
    // Close menu on nav link click
    const navLinks = document.querySelectorAll('.nav-menu-item');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            setTimeout(closeNavMenu, 100);
        });
    });
    
    // Close modals on outside click
    window.addEventListener('click', function(event) {
        const contactModal = document.getElementById('contact-modal');
        const applicationModal = document.getElementById('application-modal');
        
        if (event.target === contactModal) {
            closeContactModal();
        }
        if (event.target === applicationModal) {
            closeApplicationModal();
        }
    });
});
