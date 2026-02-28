/**
 * SafeGuard UI Controller - Professional Edition
 * Handles: Theme Switching, Splash Screen Staging, and Anti-Clipping Centering.
 */

// 1. IMMEDIATE THEME ENGINE
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
     * 2. SPLASH SCREEN & ANTI-CLIPPING ENGINE
     * Manages the transition and resets scroll to prevent "cutting from above".
     */
    if (splash) {
        const startApp = () => {
            if (splash.classList.contains('fade-out')) return;

            // 🛡️ STEP A: Prepare the card behind the splash screen
            if (mainContent) {
                mainContent.classList.remove('hidden');
                
                // CRITICAL FIX: Force flex and reset scroll position to the absolute top
                // This prevents the "cutting from above" glitch on long forms
                mainContent.style.display = 'flex'; 
                mainContent.scrollTop = 0; 
                window.scrollTo(0, 0);
            }

            // 🛡️ STEP B: Start fading the splash screen
            splash.classList.add('fade-out');

            // 🛡️ STEP C: Reveal the card smoothly
            setTimeout(() => {
                splash.style.display = 'none';
                if (mainContent) {
                    /**
                     * requestAnimationFrame ensures the browser has calculated the 
                     * "margin: auto" centering before the animation starts.
                     */
                    requestAnimationFrame(() => {
                        mainContent.classList.add('show-app');
                        // Second pass scroll reset for stubborn mobile browsers
                        mainContent.scrollTop = 0;
                    });
                }
            }, 600); // Trigger slightly before splash is fully gone
        };

        // Delay to showcase the high-end "Welcome" branding
        setTimeout(startApp, 3500);

        // Fallback: If page takes too long to load, the timeout above still triggers
        window.addEventListener('load', () => {});
    } else {
        // Fallback for pages without a splash screen (like Dashboard)
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.style.display = 'flex';
            mainContent.classList.add('show-app');
        }
    }

    /**
     * 3. THEME TOGGLE LOGIC
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