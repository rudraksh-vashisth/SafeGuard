/**
 * SafeGuard AI Safe-Route Engine
 * Integrated with Google Maps API and Gemini AI
 */

let map, directionsService, directionsRenderer;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Components
    initMap();
    initLocationDropdowns();

    const analyzeBtn = document.getElementById('analyzeBtn');
    const reportArea = document.getElementById('reportArea');
    const loadingArea = document.getElementById('loadingArea');

    // 2. Main Analysis Logic
    analyzeBtn.addEventListener('click', async () => {
        const state = document.getElementById('stateSelect').value;
        const district = document.getElementById('districtSelect').value;
        const area = document.getElementById('areaSelect').value;
        const destination = document.getElementById('destinationInput').value.trim();

        if (!state || !district || !area || !destination) {
            return alert("🛡️ SafeGuard: Please provide full journey details.");
        }

        const originAddress = `${area}, ${district}, ${state}, India`;
        
        // UI State: Start Loading
        loadingArea.classList.remove('hidden');
        reportArea.classList.add('hidden');
        analyzeBtn.disabled = true;

        try {
            // A. DRAW ROUTE ON GOOGLE MAPS
            const routeFound = await drawRoute(originAddress, destination);
            
            if (routeFound) {
                // B. CONSTRUCT AI PROMPT AUTOMATICALLY
                const timeNow = new Date().toLocaleTimeString();
                const aiPrompt = `Analyze the safety of a walking route in India from ${originAddress} to ${destination}. Current time is ${timeNow}. I am walking alone.`;

                // C. FETCH AI SAFETY REPORT FROM RENDER BACKEND
                const response = await fetch('https://safeguard-i00e.onrender.com/api/ai/safe-route', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ prompt: aiPrompt })
                });

                const data = await response.json();

                if (response.ok) {
                    // D. FORMAT & DISPLAY REPORT
                    displayReport(data.report);
                } else {
                    throw new Error(data.error || "AI Analysis offline.");
                }
            }
        } catch (err) {
            console.error(err);
            alert("Shield System: " + err.message);
        } finally {
            loadingArea.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });
});

// --- GOOGLE MAPS HELPER FUNCTIONS ---

function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        polylineOptions: {
            strokeColor: "#00d2ff", // SafeGuard Blue
            strokeWeight: 6,
            strokeOpacity: 0.8
        }
    });

    const mapOptions = {
        zoom: 5,
        center: { lat: 20.5937, lng: 78.9629 }, // Center of India
        styles: [ /* Paste your SnazzyMaps Dark Theme JSON here */ ],
        disableDefaultUI: true
    };

    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    directionsRenderer.setMap(map);
}

function drawRoute(start, end) {
    return new Promise((resolve, reject) => {
        directionsService.route({
            origin: start,
            destination: end,
            travelMode: 'WALKING'
        }, (result, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
                resolve(true);
            } else {
                reject(new Error("Could not find a walking route for this location."));
            }
        });
    });
}

// --- UI & DATA HELPERS ---

function displayReport(rawText) {
    const reportArea = document.getElementById('reportArea');
    // Convert Markdown bold and headers to HTML
    let formatted = rawText
        .replace(/\n/g, '<br>')
        .replace(/### (.*?)<br>/g, '<h3 class="text-blue-400 font-bold mt-4 uppercase text-xs tracking-widest">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>');

    reportArea.innerHTML = formatted;
    reportArea.classList.remove('hidden');
}

/**
 * Initializes the cascading dropdown logic.
 * Note: You should link scripts/location-data.js containing the massive India list.
 */
function initLocationDropdowns() {
    const stateSel = document.getElementById('stateSelect');
    const distSel = document.getElementById('districtSelect');
    const areaSel = document.getElementById('areaSelect');

    // Populate States from the global 'indiaData' object
    if (typeof indiaData !== 'undefined') {
        Object.keys(indiaData).sort().forEach(state => {
            stateSel.options.add(new Option(state, state));
        });
    }

    stateSel.onchange = () => {
        distSel.innerHTML = '<option value="">Select District</option>';
        distSel.disabled = false;
        areaSel.disabled = true;
        Object.keys(indiaData[stateSel.value]).sort().forEach(dist => {
            distSel.options.add(new Option(dist, dist));
        });
    };

    distSel.onchange = () => {
        areaSel.innerHTML = '<option value="">Select Locality</option>';
        areaSel.disabled = false;
        indiaData[stateSel.value][distSel.value].sort().forEach(area => {
            areaSel.options.add(new Option(area, area));
        });
    };
}