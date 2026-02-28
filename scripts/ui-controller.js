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
        // Function to transition from splash to main app (UPDATED SECTION)
        const startApp = () => {
            if (splash.classList.contains('fade-out')) return; // Prevent double trigger
            
            splash.classList.add('fade-out');

            setTimeout(() => {
                splash.style.display = 'none';
                if (mainContent) {
                    // 1. Remove the hidden state
                    mainContent.classList.remove('hidden');
                    
                    // 2. FORCE FLEX LAYOUT: Ensures centering logic is applied before the card is drawn
                    mainContent.style.display = 'flex'; 

                    // 3. Trigger the entrance animation on the next animation frame to prevent layout glitch
                    requestAnimationFrame(() => {
                        mainContent.classList.add('show-app');
                        // Ensure page starts at the top (crucial for mobile refresh)
                        window.scrollTo(0, 0);
                    });
                }
            }, 800); // Matches the fade-out duration
        };

        // Wait 3.5 seconds to allow the staggered text to finish animating
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