// scripts/map.js
let map, userMarker, userCircle;
const socket = io(); // Connects to the same backend server

// 1. Initialize Map
function initMap(lat, lng) {
    map = L.map('live-map', { zoomControl: false }).setView([lat, lng], 17);
    
    // Modern Dark Theme Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'SafeGuard Intelligence'
    }).addTo(map);

    // Custom SOS Marker (Blinking Dot)
    const sosIcon = L.divIcon({
        className: 'sos-marker',
        html: `<div class="relative">
                <div class="absolute -inset-4 bg-red-500 rounded-full opacity-30 animate-ping"></div>
                <div class="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg"></div>
               </div>`
    });

    userMarker = L.marker([lat, lng], { icon: sosIcon }).addTo(map);
    userCircle = L.circle([lat, lng], { radius: 20, color: '#ef4444', fillOpacity: 0.1 }).addTo(map);
}

// 2. Real-time Listener
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('id'); // The link Guardian gets: track-user.html?id=...

if (targetUserId) {
    socket.emit('join-room', targetUserId); // Join victim's tracking room

    socket.on('location-broadcast', (data) => {
        const { lat, lng, accuracy, timestamp, fullName, msg } = data;

        document.getElementById('trackingName').innerText = fullName;
        document.getElementById('sosNote').innerText = msg || "In trouble, need help!";
        document.getElementById('accuracy').innerText = `Acc: ${accuracy.toFixed(1)}m`;
        document.getElementById('lastSeen').innerText = new Date(timestamp).toLocaleTimeString();

        if (!map) {
            initMap(lat, lng);
        } else {
            // Update Marker & Map View Smoothly
            const newPos = [lat, lng];
            userMarker.setLatLng(newPos);
            userCircle.setLatLng(newPos);
            userCircle.setRadius(accuracy);
            map.panTo(newPos);
        }
    });
}

function callUser() {
    // In a real app, we'd fetch the user's phone from the DB
    window.location.href = "tel:91XXXXXXXXXX"; 
}

function callPolice() {
    window.location.href = "tel:112";
}