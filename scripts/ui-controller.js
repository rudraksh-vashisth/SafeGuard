/**
 * 1. IMMEDIATE THEME ENGINE
 * Runs immediately to prevent "flash of wrong theme"
 */
(function () {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const splash = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');

    /**
     * 2. SPLASH SCREEN LOGIC
     * Handles the animated pop-up entrance
     */
    if (splash) {
        // Function to transition from splash to main app
        const startApp = () => {
            if (splash.classList.contains('fade-out')) return; // Prevent double trigger
            
            splash.classList.add('fade-out');

            setTimeout(() => {
                splash.style.display = 'none';
                if (mainContent) {
                    mainContent.classList.remove('hidden');
                    mainContent.classList.add('show-app');
                }
            }, 1000); // Wait for CSS transition
        };

        // ADJUSTED: Wait 3.5 seconds to allow the staggered text to finish animating
        window.addEventListener('load', () => {
            setTimeout(startApp, 3500); 
        });

        // SAFETY BACKUP: If window 'load' hangs, force start after 5 seconds
        setTimeout(startApp, 5000);
    } else {
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.style.opacity = "1";
        }
    }

    /**
     * 3. THEME TOGGLE LOGIC (Keep existing)
     */
    const updateIcon = (theme) => {
        if (!themeIcon) return;
        if (theme === 'light') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    };

    updateIcon(root.getAttribute('data-theme'));

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isLight = root.getAttribute('data-theme') === 'light';
            const newTheme = isLight ? 'dark' : 'light';

            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcon(newTheme);
        });
    }
});