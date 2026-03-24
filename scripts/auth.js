/**
 * SafeGuard Authentication & Security Engine
 * Professional Version: Real-time validation, Dynamic UI, and Secure Handshake
 */

const API_URL = 'https://safeguard-i00e.onrender.com/api';

// --- YOUR CUSTOM HELPER FUNCTION ---
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
    // Selectors
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.querySelector("#phone");
    const passwordInput = document.getElementById('signupPassword');
    const mainHint = document.getElementById('main-hint');
    const toggleIcons = document.querySelectorAll('.toggle-password');

    let iti;

    // ============================================================
    // 1. PHONE INPUT INITIALIZATION (ANTI-LOCK LOGIC)
    // ============================================================
    if (phoneInput) {
        // Clean up any existing instances to prevent double-flags
        const existingInstance = window.intlTelInputGlobals.getInstance(phoneInput);
        if (existingInstance) existingInstance.destroy();

        iti = window.intlTelInput(phoneInput, {
            initialCountry: "in",
            separateDialCode: true,
            countrySearch: true,
            useFullscreenPopup: false,
            autoPlaceholder: "aggressive",
            preferredCountries: ["in", "us", "gb"],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.19/js/utils.js",
        });

        // Dynamic length restriction based on country
        const setPhoneLimit = () => {
            setTimeout(() => {
                const placeholder = phoneInput.getAttribute('placeholder');
                if (placeholder) {
                    let maxDigits = placeholder.replace(/\D/g, '').length;
                    // Fix for India/UK national '0' prefix
                    if (placeholder.startsWith('0') && maxDigits > 10) maxDigits -= 1;
                    const finalLimit = maxDigits > 5 ? maxDigits : 15;
                    phoneInput.setAttribute('maxlength', finalLimit);
                    if (phoneInput.value.length > finalLimit) {
                        phoneInput.value = phoneInput.value.substring(0, finalLimit);
                    }
                } else {
                    phoneInput.setAttribute('maxlength', 15);
                }
            }, 250);
        };

        phoneInput.addEventListener('countrychange', setPhoneLimit);
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, ''); // Numbers only
        });
        
        phoneInput.setAttribute('maxlength', 15); // Start with safe limit
        setTimeout(setPhoneLimit, 1000);
    }

    // ============================================================
    // 2. PASSWORD CHECKLIST & VISIBILITY
    // ============================================================
    if (passwordInput) {
        const criteria = {
            upper: /[A-Z]/,
            lower: /[a-z]/,
            number: /[0-9]/,
            special: /[!@#$%^&*(),.?":{}|<>]/,
            length: /.{8,}/
        };

        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            const res = {
                upper: criteria.upper.test(val),
                lower: criteria.lower.test(val),
                number: criteria.number.test(val),
                special: criteria.special.test(val),
                length: criteria.length.test(val)
            };

            // Using your custom toggle function
            toggleReqClass('req-upper', res.upper);
            toggleReqClass('req-lower', res.lower);
            toggleReqClass('req-number', res.number);
            toggleReqClass('req-special', res.special);
            toggleReqClass('req-length', res.length);

            // Dynamic Hint logic (Priority based)
            if (mainHint) {
                mainHint.style.opacity = "1";
                mainHint.classList.remove('text-green-400');
                if (val.length === 0) {
                    mainHint.innerText = "Please enter a secure password";
                } else if (!res.length) {
                    mainHint.innerText = `Missing ${8 - val.length} more characters`;
                } else if (!res.upper) {
                    mainHint.innerText = "Include one capital letter";
                } else if (!res.number) {
                    mainHint.innerText = "Include one numeric value";
                } else if (!res.special) {
                    mainHint.innerText = "Include a symbol (!@#$%)";
                } else {
                    mainHint.innerText = "Security verified ✓";
                    mainHint.classList.add('text-green-400');
                    setTimeout(() => { if(res.length) mainHint.style.opacity = "0"; }, 2000);
                }
            }
        });
    }

    toggleIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            this.classList.toggle('fa-eye-slash', !isPass);
            this.classList.toggle('fa-eye', isPass);
        });
    });

    // ============================================================
    // 3. FORM SUBMISSIONS (SIGNUP & LOGIN)
    // ============================================================
    const handleAuthResponse = async (endpoint, data, submitBtn, btnOriginalText) => {
        try {
            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                if (endpoint === 'login') {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    const pathPrefix = window.location.pathname.includes('pages') ? '' : 'pages/';
                    window.location.href = `${pathPrefix}dashboard.html`;
                } else {
                    alert("✅ Account Shield Activated! Please login.");
                    window.location.href = "../index.html";
                }
            } else {
                alert(`⚠️ ${result.error || "Authentication failed"}`);
                submitBtn.disabled = false;
                submitBtn.innerText = btnOriginalText;
            }
        } catch (err) {
            alert("📡 Server is waking up. Please try again in 30 seconds.");
            submitBtn.disabled = false;
            submitBtn.innerText = btnOriginalText;
        }
    };

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = signupForm.querySelector('button[type="submit"]');
            if (!iti.isValidNumber()) return alert("🚨 Invalid mobile number.");
            
            const password = passwordInput.value;
            if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
                return alert("🛡️ Password criteria not met.");
            }

            btn.disabled = true;
            const originalText = btn.innerText;
            btn.innerText = "CREATING SHIELD...";

            const userData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('signupEmail').value.toLowerCase().trim(),
                phone: iti.getNumber(),
                password: password
            };
            handleAuthResponse('register', userData, btn, originalText);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            const email = document.getElementById('email').value.toLowerCase().trim();
            const password = document.getElementById('password').value;

            btn.disabled = true;
            const originalText = btn.innerText;
            btn.innerText = "VERIFYING...";

            handleAuthResponse('login', { email, password }, btn, originalText);
        });
    }
});