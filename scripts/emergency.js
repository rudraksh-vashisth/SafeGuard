/**
 * SafeGuard Emergency Response System
 * Professional Grade SOS Logic: Geolocation, Encrypted API Triggers, 
 * Acoustic Alarms, and Real-time Geostreaming via Socket.io
 */

const BASE_URL = 'https://safeguard-i00e.onrender.com';
const socketInstance = typeof io !== 'undefined' ? io(BASE_URL) : null;

const EmergencySystem = {
    API_URL: `${BASE_URL}/api`,
    socket: socketInstance,
    alarmInstance: null,
    isProcessing: false,
    watchId: null,

    getCurrentLocation: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject("GPS not supported.");
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                (err) => reject(`GPS Error: ${err.message}`),
                { enableHighAccuracy: true, timeout: 15000 }
            );
        });
    },

    toggleAlarm: (state) => {
        if (state === 'start') {
            if (!EmergencySystem.alarmInstance) {
                EmergencySystem.alarmInstance = new Audio('../assets/sounds/alarm.mp3');
                EmergencySystem.alarmInstance.loop = true;
            }
            EmergencySystem.alarmInstance.play().catch(() => console.warn("Audio blocked."));
            if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
        } else {
            if (EmergencySystem.alarmInstance) {
                EmergencySystem.alarmInstance.pause();
                EmergencySystem.alarmInstance.currentTime = 0;
            }
            if ("vibrate" in navigator) navigator.vibrate(0);
        }
    },

    startLiveStream: (userId, userName, emergencyNote) => {
        if ("geolocation" in navigator) {
            console.log("🛰️ Streaming Live Location to Guardians...");
            EmergencySystem.watchId = navigator.geolocation.watchPosition((position) => {
                const data = {
                    userId,
                    fullName: userName,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    msg: emergencyNote,
                    timestamp: new Date()
                };
                if (EmergencySystem.socket) EmergencySystem.socket.emit('update-location', data);
            }, null, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
        }
    },

    triggerSOS: async () => {
        if (EmergencySystem.isProcessing) return;

        const sosBtn = document.getElementById('sosBtn');
        const noteField = document.getElementById('emergencyNote');
        const overlay = document.getElementById('sos-overlay');
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser'));

        if (!token || !user) {
            alert("Please login again.");
            window.location.href = '../index.html';
            return;
        }

        EmergencySystem.isProcessing = true;
        EmergencySystem.updateUIState('sending');

        try {
            // 🛡️ STEP 1: Show Fullscreen "SOS ACTIVATED" Overlay
            if (overlay) overlay.classList.remove('hidden');
            
            // 🔊 STEP 2: Start Alarm
            EmergencySystem.toggleAlarm('start');
            
            const coords = await EmergencySystem.getCurrentLocation();
            const noteText = noteField ? noteField.value.trim() : "EMERGENCY: Assistance Required.";

            // 📡 STEP 3: API Request to Server
            const response = await fetch(`${EmergencySystem.API_URL}/sos/trigger`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Emergency-Signal': 'true'
                },
                body: JSON.stringify({
                    location: coords,
                    accuracy: coords.accuracy,
                    timestamp: new Date().toISOString(),
                    note: noteText 
                })
            });

            const result = await response.json();

            if (response.ok) {
                EmergencySystem.updateUIState('active');
                EmergencySystem.startLiveStream(user.id || user._id, user.fullName, noteText);
                
                // 📞 Call Authorities
                setTimeout(() => { window.location.href = "tel:112"; }, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert(`Error: ${error}`);
            EmergencySystem.stopSOS(); // Clean up if failed
        } finally {
            EmergencySystem.isProcessing = false;
        }
    },

    stopSOS: () => {
        if (confirm("Stop live tracking and alarm?")) {
            const overlay = document.getElementById('sos-overlay');
            
            // 1. Hide Fullscreen Overlay
            if (overlay) overlay.classList.add('hidden');
            
            // 2. Stop Alarm and Tracking
            EmergencySystem.toggleAlarm('stop');
            if (EmergencySystem.watchId !== null) {
                navigator.geolocation.clearWatch(EmergencySystem.watchId);
                EmergencySystem.watchId = null;
            }
            EmergencySystem.updateUIState('idle');
        }
    },

    updateUIState: (state) => {
        const sosBtn = document.getElementById('sosBtn');
        if (!sosBtn) return;

        if (state === 'sending') {
            sosBtn.innerText = "WAIT";
            sosBtn.disabled = true;
        } else if (state === 'active') {
            sosBtn.innerText = "STOP"; 
            sosBtn.style.background = "linear-gradient(to bottom, #10b981, #059669)";
            sosBtn.disabled = false;
        } else {
            sosBtn.innerText = "SOS";
            sosBtn.style.background = "";
            sosBtn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const sosBtn = document.getElementById('sosBtn');
    if (sosBtn) {
        sosBtn.addEventListener('click', () => {
            if (sosBtn.innerText === "STOP") EmergencySystem.stopSOS();
            else if (confirm("🚨 SEND SOS ALERT?")) EmergencySystem.triggerSOS();
        });
    }
});