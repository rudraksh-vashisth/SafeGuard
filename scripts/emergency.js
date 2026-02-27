/**
 * SafeGuard Emergency Response System
 * Professional Grade SOS Logic: Geolocation, Encrypted API Triggers, 
 * Acoustic Alarms, and Real-time Geostreaming via Socket.io
 */

// 1. SET THE BASE URL (Linked to your live Render Backend)
const BASE_URL = 'https://safeguard-tce4.onrender.com';

// 2. INITIALIZE SOCKET (Points to the Render Server)
const socketInstance = typeof io !== 'undefined' ? io(BASE_URL) : null;

const EmergencySystem = {
    API_URL: `${BASE_URL}/api`,
    socket: socketInstance,
    alarmInstance: null,
    isProcessing: false,
    watchId: null, // Critical for stopping the live stream

    // 1. Get high-accuracy GPS coordinates
    getCurrentLocation: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject("GPS not supported by browser.");

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                }),
                (err) => reject(`GPS Error: ${err.message}`),
                { enableHighAccuracy: true, timeout: 15000 }
            );
        });
    },

    // 2. Manage Acoustic Alarm & Haptics
    toggleAlarm: (state) => {
        if (state === 'start') {
            if (!EmergencySystem.alarmInstance) {
                EmergencySystem.alarmInstance = new Audio('../assets/sounds/alarm.mp3');
                EmergencySystem.alarmInstance.loop = true;
            }
            EmergencySystem.alarmInstance.play().catch(() => console.warn("Audio blocked by browser."));
            
            // Mobile Vibration
            if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
        } else {
            if (EmergencySystem.alarmInstance) {
                EmergencySystem.alarmInstance.pause();
                EmergencySystem.alarmInstance.currentTime = 0;
            }
            if ("vibrate" in navigator) navigator.vibrate(0); 
        }
    },

    // 3. Real-time Location Streaming (Socket.io)
    startLiveStream: (userId, userName, emergencyNote) => {
        if ("geolocation" in navigator) {
            console.log("🛰️ Initializing Real-time Satellite Stream...");
            
            EmergencySystem.watchId = navigator.geolocation.watchPosition((position) => {
                const data = {
                    userId: userId,
                    fullName: userName,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    msg: emergencyNote,
                    timestamp: new Date()
                };
                
                // Emit to Render Socket Server
                if (EmergencySystem.socket) {
                    EmergencySystem.socket.emit('update-location', data);
                }
            }, (err) => console.error(err), {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            });
        }
    },

    // 4. Main SOS Execution Logic
    triggerSOS: async () => {
        if (EmergencySystem.isProcessing) return;

        const sosBtn = document.getElementById('sosBtn');
        const noteField = document.getElementById('emergencyNote');
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser'));

        if (!token || !user) {
            alert("Security Error: Session expired. Please login again.");
            window.location.href = '../index.html';
            return;
        }

        EmergencySystem.isProcessing = true;
        EmergencySystem.updateUIState('sending');

        try {
            // STEP 1: Activate Alarm
            EmergencySystem.toggleAlarm('start');

            // STEP 2: Lock GPS Coords
            const coords = await EmergencySystem.getCurrentLocation();
            
            // STEP 3: Get Instructions
            const noteText = noteField ? noteField.value.trim() : "No additional note.";

            // STEP 4: API Request to Render
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
                
                // STEP 5: Start Socket Streaming for Guardians
                EmergencySystem.startLiveStream(user.id || user._id, user.fullName, noteText);

                alert(`🚨 SOS BROADCASTED TO RENDER SERVER!\nGuardians notified: ${result.contactsNotified}`);
                
                // Automatic Call to Police (Frontend Protocol)
                window.location.href = "tel:112";
            } else {
                throw new Error(result.error || "Broadcast Failed");
            }

        } catch (error) {
            alert(`SOS System Error: ${error}`);
            EmergencySystem.toggleAlarm('stop');
            EmergencySystem.updateUIState('idle');
        } finally {
            EmergencySystem.isProcessing = false;
        }
    },

    // 5. Stop SOS Sequence
    stopSOS: () => {
        if (confirm("CONFIRM SAFETY: Stop alarm and live tracking?")) {
            EmergencySystem.toggleAlarm('stop');
            
            if (EmergencySystem.watchId !== null) {
                navigator.geolocation.clearWatch(EmergencySystem.watchId);
                EmergencySystem.watchId = null;
                console.log("🛰️ Live Stream Terminated.");
            }

            EmergencySystem.updateUIState('idle');
        }
    },

    // UI Helper
    updateUIState: (state) => {
        const sosBtn = document.getElementById('sosBtn');
        if (!sosBtn) return;

        if (state === 'sending') {
            sosBtn.innerText = "WAIT";
            sosBtn.disabled = true;
        } else if (state === 'active') {
            sosBtn.innerText = "STOP"; 
            sosBtn.style.background = "linear-gradient(to bottom, #10b981, #059669)"; // Green for safe
            sosBtn.disabled = false;
        } else {
            sosBtn.innerText = "SOS";
            sosBtn.style.background = ""; // Back to red
            sosBtn.disabled = false;
        }
    }
};

// --- Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const sosBtn = document.getElementById('sosBtn');
    if (sosBtn) {
        sosBtn.addEventListener('click', () => {
            if (sosBtn.innerText === "STOP") EmergencySystem.stopSOS();
            else EmergencySystem.triggerSOS();
        });
    }
});