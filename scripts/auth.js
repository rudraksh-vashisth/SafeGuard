/**
 * SafeGuard Authentication & Input Validation System
 * Handles: Login, Signup, International Phone Masking, and Security Constraints
 */

const API_URL = "https://safeguard-tce4.onrender.com/api"; // Ensure there is no '/' at the end

document.addEventListener('DOMContentLoaded', () => {
    // UI Element Selectors
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.querySelector("#phone");
    const toggleIcons = document.querySelectorAll('.toggle-password');

    let iti;

    // ============================================================
    // 1. PHONE INPUT INITIALIZATION (With "Zero-Lock" Logic)
    // ============================================================
    if (phoneInput) {
        // Clean up any old instances
        const existingInstance = window.intlTelInputGlobals.getInstance(phoneInput);
        if (existingInstance) existingInstance.destroy();

        // Initial setup
        iti = window.intlTelInput(phoneInput, {
            initialCountry: "in",
            separateDialCode: true,
            countrySearch: true,
            useFullscreenPopup: false,
            fixDropdownWidth: true,
            autoPlaceholder: "aggressive",
            preferredCountries: ["in", "us", "gb"],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.19/js/utils.js",
        });

        /**
         * Dynamically sets the max digits allowed based on the selected country.
         * Includes a safety fallback to prevent the input from being locked.
         */
        const syncPhoneConstraints = () => {
            setTimeout(() => {
                const placeholder = phoneInput.getAttribute('placeholder');
                if (placeholder) {
                    // Extract digits from placeholder (e.g., "081234 56789" -> 11)
                    let maxDigits = placeholder.replace(/\D/g, '').length;

                    // Handle trunk prefix '0' (common in India/UK placeholders)
                    if (placeholder.startsWith('0') && maxDigits > 10) maxDigits -= 1;

                    // FAILSAFE: Ensure maxlength is at least 7 and no more than 15
                    const finalLimit = maxDigits > 5 ? maxDigits : 15;
                    phoneInput.setAttribute('maxlength', finalLimit);

                    // Truncate if current value is too long
                    if (phoneInput.value.length > finalLimit) {
                        phoneInput.value = phoneInput.value.substring(0, finalLimit);
                    }
                } else {
                    phoneInput.setAttribute('maxlength', 15); // Default fallback
                }
            }, 250);
        };

        // Listeners for phone behavior
        phoneInput.addEventListener('countrychange', syncPhoneConstraints);
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, ''); // Strictly numeric
        });

        // Initialize constraints on load
        phoneInput.setAttribute('maxlength', 15); // Start with safe limit
        setTimeout(syncPhoneConstraints, 800);
    }

    // ============================================================
    // 2. PASSWORD VISIBILITY TOGGLE
    // ============================================================
    toggleIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const isPassword = input.type === 'password';
            
            input.type = isPassword ? 'text' : 'password';
            this.classList.toggle('fa-eye-slash', !isPassword);
            this.classList.toggle('fa-eye', isPassword);
        });
    });

    // ============================================================
    // 3. SIGNUP LOGIC (Security & Data Integrity)
    // ============================================================
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Security Validation: Phone
            if (!iti.isValidNumber()) {
                alert("🚨 Invalid mobile number for the selected country.");
                return;
            }

            // Security Validation: Password Complexity
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

            if (!passwordRegex.test(password)) {
                alert("🛡️ Password Security Requirement:\n• Minimum 8 characters\n• One Capital Letter\n• One Number\n• One Special Character (@$!%*?&)");
                return;
            }

            if (password !== confirm) {
                alert("❌ Passwords do not match.");
                return;
            }

            const userData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('signupEmail').value.toLowerCase().trim(),
                phone: iti.getNumber(), // Captures full international format (+91...)
                password: password
            };

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert("✅ Account Shield Created! Please login.");
                    window.location.href = "../index.html";
                } else {
                    alert(`⚠️ ${result.error || "Registration failed"}`);
                }
            } catch (err) {
                alert("📡 Backend offline. Please start the SafeGuard Server.");
            }
        });
    }

    // ============================================================
    // 4. LOGIN LOGIC (Session Establishment)
    // ============================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const loginData = {
                email: document.getElementById('email').value.toLowerCase().trim(),
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (response.ok) {
                    // SECURE STORAGE
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    
                    // Intelligent Redirection
                    const pathPrefix = window.location.pathname.includes('pages') ? '' : 'pages/';
                    window.location.href = `${pathPrefix}dashboard.html`;
                } else {
                    alert(`🚫 ${result.error || "Access Denied"}`);
                }
            } catch (err) {
                alert("📡 Connection lost. Is the backend server running?");
            }
        });
    }
});