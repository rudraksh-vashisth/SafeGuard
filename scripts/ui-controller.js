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
        // We use window 'load' to ensure the logo image is actually ready
        window.addEventListener('load', () => {
            setTimeout(() => {
                splash.classList.add('fade-out');

                setTimeout(() => {
                    splash.style.display = 'none';
                    if (mainContent) {
                        mainContent.classList.remove('hidden');
                        mainContent.classList.add('show-app');
                    }
                }, 800); // Matches the CSS transition duration
            }, 2500); // How long the splash stays visible
        });
    } else {
        // If there is no splash screen on this page, show content immediately
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.style.opacity = "1";
        }
    }

    /**
     * 3. THEME TOGGLE LOGIC
     * Handles switching between Light and Dark modes
     */
    const updateIcon = (theme) => {
        if (!themeIcon) return;
        if (theme === 'light') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    };

    // Sync icon on page load
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