/**
 * SafeGuard UI Controller - Professional Edition
 * Handles: Theme Switching, Splash Screen Staging, and Instant-Reveal Centering.
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
     * 2. OPTIMIZED SPLASH SCREEN & INSTANT REVEAL ENGINE
     * Fixes the delay by overlapping the splash fade-out with the card fade-in.
     */
    if (splash) {
        const startApp = () => {
            if (splash.classList.contains('fade-out')) return;

            // 🛡️ STEP A: Trigger Main Content Reveal IMMEDIATELY
            // We no longer wait for the splash to finish fading.
            if (mainContent) {
                mainContent.classList.remove('hidden');
                mainContent.style.display = 'flex'; // Force flex for centering logic
                
                requestAnimationFrame(() => {
                    mainContent.classList.add('show-app');
                    // Reset scroll to top to prevent "pixel cutting" on mobile
                    window.scrollTo(0, 0);
                    mainContent.scrollTop = 0;
                });
            }

            // 🛡️ STEP B: Start fading the splash screen
            splash.classList.add('fade-out');

            // 🛡️ STEP C: Cleanup splash after visual transition is done
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800); // Duration matches the CSS transition
        };

        /**
         * TIMING ADJUSTMENT: 
         * Reduced to 2500ms. This allows enough time for the logo pop 
         * and staggered text reveal, but feels "instant" to the user.
         */
        const animationTimer = setTimeout(startApp, 2500);

        // Fallback: Ensure app triggers even if images take too long to load
        window.addEventListener('load', () => {
            // Optional: Uncomment the next line to skip remaining timer once loaded
            // clearTimeout(animationTimer); startApp();
        });
    } else {
        // Fallback for pages without a splash screen
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