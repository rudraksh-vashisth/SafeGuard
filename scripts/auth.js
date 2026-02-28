/**
 * SafeGuard Authentication & Input Validation System
 * Handles: Login, Signup, International Phone Masking, and Security Constraints
 */

const API_URL = 'https://safeguard-i00e.onrender.com/api' // Ensure there is no '/' at the end

function toggleReqClass(id, isValid) {
    const el = document.getElementById(id);
    if (el) {
        if (isValid) {
            el.classList.add('valid');
        } else {
            el.classList.remove('valid');
        }
    }
}

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
        phoneInput.addEventListener('input', function () {
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
        icon.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input');
            const isPassword = input.type === 'password';

            input.type = isPassword ? 'text' : 'password';
            this.classList.toggle('fa-eye-slash', !isPassword);
            this.classList.toggle('fa-eye', isPassword);
        });
    });


    // ============================================================
    // SIGNUP LOGIC (Security, Real-time Validation & Submission)
    // ============================================================
    if (signupForm) {
        const passwordInput = document.getElementById('signupPassword');
        const confirmInput = document.getElementById('confirmPassword');
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const mainHint = document.getElementById('main-hint');

        // 1. REAL-TIME PASSWORD CHECKLIST CRITERIA
        const criteria = {
            upper: /[A-Z]/,
            lower: /[a-z]/,
            number: /[0-9]/,
            special: /[!@#$%^&*(),.?":{}|<>]/,
            length: /.{8,}/ // Locked at 8 characters
        };

        const updateChecklist = () => {
            const val = passwordInput.value;

            // Run individual tests
            const res = {
                upper: criteria.upper.test(val),
                lower: criteria.lower.test(val),
                number: criteria.number.test(val),
                special: criteria.special.test(val),
                length: criteria.length.test(val)
            };

            // Helper to toggle 'valid' class on the UI rows
            const toggleClass = (id, isValid) => {
                const el = document.getElementById(id);
                if (el) isValid ? el.classList.add('valid') : el.classList.remove('valid');
            };

            toggleClass('req-upper', res.upper);
            toggleClass('req-lower', res.lower);
            toggleClass('req-number', res.number);
            toggleClass('req-special', res.special);
            toggleClass('req-length', res.length);

            // --- NEW: DYNAMIC HINT LOGIC (Priority Based & Left Aligned) ---
            if (mainHint) {
                mainHint.style.opacity = "1";
                mainHint.classList.remove('text-green-400');
                mainHint.classList.add('text-[#ff4b5c]'); // Default error color

                if (val.length === 0) {
                    mainHint.innerText = "Please enter a secure password";
                } else if (!res.length) {
                    // Tells user exactly how many more characters they need
                    mainHint.innerText = `Missing ${8 - val.length} more characters`;
                } else if (!res.upper) {
                    mainHint.innerText = "Include at least one uppercase letter";
                } else if (!res.number) {
                    mainHint.innerText = "Include at least one numeric value";
                } else if (!res.special) {
                    mainHint.innerText = "Include a special character (!@#$%)";
                } else {
                    // All conditions met: Success state
                    mainHint.innerText = "Security verified ✓";
                    mainHint.classList.replace('text-[#ff4b5c]', 'text-green-400');
                    // Fade out smoothly after a short delay
                    setTimeout(() => {
                        if (criteria.length.test(passwordInput.value)) mainHint.style.opacity = "0";
                    }, 2000);
                }
            }
        };

        passwordInput.addEventListener('input', updateChecklist);

        // 2. FORM SUBMISSION HANDLER
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Security Check: Phone Validity (intl-tel-input)
            if (!iti.isValidNumber()) {
                alert("🚨 The mobile number is invalid for the selected country.");
                return;
            }

            // Security Check: Password Complexity (Regex)
            const password = passwordInput.value;
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

            if (!passwordRegex.test(password)) {
                alert("🛡️ Security Requirement: Please fulfill all password criteria displayed in the checklist.");
                return;
            }

            // Security Check: Password Match
            if (password !== confirmInput.value) {
                alert("❌ Passwords do not match.");
                return;
            }

            // --- PREPARE FOR API CALL ---
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "CREATING SHIELD...";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            const userData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('signupEmail').value.toLowerCase().trim(),
                phone: iti.getNumber(),
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
                    alert("✅ Account Shield Activated! Redirecting to login...");
                    window.location.href = "../index.html";
                } else {
                    alert(`⚠️ ${result.error || "Registry rejected by server."}`);
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = "1";
                }
            } catch (err) {
                console.error("Network Error:", err);
                alert("📡 Connection Failure: Backend is currently unreachable.");
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
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