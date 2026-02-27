const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const contactPhone = document.querySelector("#contactPhone");
    const contactForm = document.getElementById('addContactForm');
    const contactsList = document.getElementById('contactsList');
    const contactCountDisp = document.getElementById('contactCount');
    const token = localStorage.getItem('token');
    
    let iti;

    // --- 0. SECURITY CHECK ---
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    // --- 1. INITIALIZE PHONE INPUT ---
    if (contactPhone) {
        iti = window.intlTelInput(contactPhone, {
            initialCountry: "in",
            separateDialCode: true,
            countrySearch: true,
            useFullscreenPopup: false,
            autoPlaceholder: "aggressive", 
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.19/js/utils.js",
        });

        // --- IMPROVED UNIVERSAL HARD-LIMIT LOGIC ---
        const applyHardLimit = () => {
            // Give the library a moment to update the placeholder
            setTimeout(() => {
                const placeholder = contactPhone.getAttribute('placeholder');
                if (placeholder) {
                    // Extract only digits from the placeholder example
                    let cleanPlaceholder = placeholder.replace(/\D/g, '');
                    let maxAllowed = cleanPlaceholder.length;

                    // Handle trunk prefix '0' common in India/UK examples
                    if (placeholder.startsWith('0') && maxAllowed > 10) {
                        maxAllowed = maxAllowed - 1;
                    }
                    
                    // SAFETY: Never set maxlength below 7 (shortest global length)
                    // This ensures the field is never "locked" from input
                    const finalLimit = maxAllowed > 0 ? maxAllowed : 15;
                    contactPhone.setAttribute('maxlength', finalLimit);
                    
                    // Truncate existing value if switching to a shorter country
                    if (contactPhone.value.length > finalLimit) {
                        contactPhone.value = contactPhone.value.substring(0, finalLimit);
                    }
                } else {
                    // Fallback if placeholder isn't ready: allow standard max
                    contactPhone.setAttribute('maxlength', 15);
                }
            }, 200);
        };

        // Listeners
        contactPhone.addEventListener('countrychange', applyHardLimit);
        // Set limit on initial load
        setTimeout(applyHardLimit, 600);

        // SECURE NUMERIC FILTER: Blocks alphabets from all sources
        contactPhone.addEventListener('input', function(e) {
            const originalValue = this.value;
            this.value = originalValue.replace(/\D/g, '');
            
            // Re-trigger limit check if user pastes a long number
            if (this.value.length > this.getAttribute('maxlength')) {
                this.value = this.value.substring(0, this.getAttribute('maxlength'));
            }
        });
    }

    // --- 2. LOAD CONTACTS FROM DATABASE ---
    const loadContacts = async () => {
        try {
            const response = await fetch(`${API_URL}/user/contacts`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '../index.html';
                return;
            }

            const contacts = await response.json();
            renderContacts(contacts);
        } catch (err) { 
            console.error("Error loading contacts:", err); 
        }
    };

    // --- 3. RENDER UI (Enterprise Style) ---
    const renderContacts = (contacts) => {
        if (contactCountDisp) contactCountDisp.innerText = `${contacts.length}/5`;
        
        if (!contacts || contacts.length === 0) {
            contactsList.innerHTML = `<div class="text-center py-10 opacity-30 text-xs italic">Guardian Circle empty. Add your trusted contacts.</div>`;
            return;
        }

        // Sort by priority
        contacts.sort((a, b) => a.priority - b.priority);

        contactsList.innerHTML = contacts.map(c => `
            <div class="contact-card p-5 rounded-[2rem] flex justify-between items-center animate-pop-in mb-4 glass border-white/5 relative overflow-hidden">
                <div class="absolute top-0 left-0 h-full w-1 ${c.priority == 1 ? 'bg-red-500' : 'bg-blue-500/40'}"></div>
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <div class="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/10">
                            <i class="fa-solid ${getIcon(c.relationship)}"></i>
                        </div>
                        <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#05060f] ${c.isVerified ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold text-sm text-white">${c.name}</h4>
                            <span class="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10 uppercase font-black">P${c.priority}</span>
                        </div>
                        <p class="text-[10px] opacity-50 text-blue-200">${c.phone} • ${c.relationship}</p>
                    </div>
                </div>
                <button onclick="deleteContact('${c._id}')" class="w-9 h-9 rounded-xl flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `).join('');
    };

    function getIcon(rel) {
        switch(rel) {
            case 'Parent': return 'fa-person-breastfeeding';
            case 'Sibling': return 'fa-people-arrows';
            case 'Friend': return 'fa-user-group';
            case 'Partner': return 'fa-heart-shield';
            default: return 'fa-user-shield';
        }
    }

 // --- 4. ADD CONTACT LOGIC (Robust Fix) ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 1. Get Elements (Check if these IDs exist in your HTML!)
            const nameEl = document.getElementById('contactName');
            const relEl = document.getElementById('contactRelationship');
            const prioEl = document.getElementById('contactPriority');
            const locEl = document.getElementById('locationToggle');

            // 2. Validate phone via library
            if (!iti.isValidNumber()) {
                alert("Please enter a valid mobile number for the selected country.");
                return;
            }

            // 3. Construct Data (Matching the Professional Server Schema)
            const contactData = {
                name: nameEl ? nameEl.value.trim() : "Guardian",
                phone: iti.getNumber(),
                relationship: relEl ? relEl.value : "Other",
                priority: prioEl ? parseInt(prioEl.value) : 1,
                permissions: { 
                    canViewLiveLocation: locEl ? locEl.checked : true 
                }
            };

            console.log("Attempting to add guardian:", contactData);

            try {
                const response = await fetch(`${API_URL}/user/contacts`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(contactData)
                });

                const result = await response.json();

                if (response.ok) {
                    contactForm.reset();
                    loadContacts(); // Reload the list
                    alert("Guardian added successfully!");
                } else {
                    // Show exact error from server (e.g. "Circle is full")
                    alert("Error: " + (result.error || "Could not add contact"));
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                alert("Server connection failed. Is your backend terminal running?");
            }
        });
    }

    // --- 5. DELETE CONTACT LOGIC ---
    window.deleteContact = async (id) => {
        if (!confirm("Remove this Guardian?")) return;
        try {
            const response = await fetch(`${API_URL}/user/contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) loadContacts();
            else alert("Failed to remove contact");
        } catch (err) { alert("Failed to reach server"); }
    };

    loadContacts();
});