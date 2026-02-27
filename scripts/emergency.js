/**
 * SafeGuard Emergency Response System
 * Professional Grade SOS Logic: Geolocation, Encrypted API Triggers, 
 * Acoustic Alarms, and Real-time Geostreaming.
 */

// Initialize Socket.io (Ensure the Socket.io script is included in your HTML)
const socketInstance = typeof io !== 'undefined' ? io('http://localhost:3000') : null;

const EmergencySystem = {
    API_URL: 'http://localhost:3000/api',
    socket: socketInstance,
    alarmInstance: null,
    isProcessing: false,
    watchId: null, // Critical for stopping the live stream

    // 1. Get high-accuracy GPS coordinates
    getCurrentLocation: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject("GPS not supported");

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
            EmergencySystem.alarmInstance.play().catch(() => {});
            
            if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
        } else {
            if (EmergencySystem.alarmInstance) {
                EmergencySystem.alarmInstance.pause();
                EmergencySystem.alarmInstance.currentTime = 0;
            }
            if ("vibrate" in navigator) navigator.vibrate(0); 
        }
    },

    // 3. NEW: Real-time Location Streaming
    // This function keeps sending the location to guardians as the user moves
    startLiveStream: (userId, userName, emergencyNote) => {
        if ("geolocation" in navigator) {
            // watchPosition creates a persistent connection to GPS
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
                
                // Broadcast via Socket.io to the backend
                if (EmergencySystem.socket) {
                    EmergencySystem.socket.emit('update-location', data);
                }
                
                console.log("🛰️ Streaming Live Location...");
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
            alert("Authentication Error: Please login.");
            window.location.href = '../index.html';
            return;
        }

        EmergencySystem.isProcessing = true;
        EmergencySystem.updateUIState('sending');

        try {
            EmergencySystem.toggleAlarm('start');
            const coords = await EmergencySystem.getCurrentLocation();
            const noteText = noteField ? noteField.value.substring(0, 200) : "No note provided";

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
                
                // --- ACTIVATE LIVE STREAMING ---
                // This starts the real-time movement on the Guardian's map
                EmergencySystem.startLiveStream(user.id || user._id, user.fullName, noteText);

                alert(`🚨 SOS BROADCASTED!\nGuardians notified: ${result.contactsNotified}`);
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

    // 5. Stop current emergency sequence
    stopSOS: () => {
        if (confirm("Are you safe now? This will stop the alarm and live tracking.")) {
            EmergencySystem.toggleAlarm('stop');
            
            // --- STOP LIVE STREAMING ---
            if (EmergencySystem.watchId !== null) {
                navigator.geolocation.clearWatch(EmergencySystem.watchId);
                EmergencySystem.watchId = null;
                console.log("🛰️ Live Stream Stopped.");
            }

            EmergencySystem.updateUIState('idle');
        }
    },

    // UI Helper
    updateUIState: (state) => {
        const sosBtn = document.getElementById('sosBtn');
        if (!sosBtn) return;

        switch (state) {
            case 'sending':
                sosBtn.innerText = "WAIT";
                sosBtn.disabled = true;
                break;
            case 'active':
                sosBtn.innerText = "STOP"; 
                sosBtn.style.background = "#00ff88"; // Change to green for "Safe"
                sosBtn.disabled = false;
                break;
            case 'idle':
                sosBtn.innerText = "SOS";
                sosBtn.style.background = ""; // Restore original red
                sosBtn.disabled = false;
                break;
        }
    }
};

// --- Initialization & Event Binding ---
document.addEventListener('DOMContentLoaded', () => {
    const sosBtn = document.getElementById('sosBtn');
    
    if (sosBtn) {
        sosBtn.addEventListener('click', (e) => {
            if (sosBtn.innerText === "STOP") {
                EmergencySystem.stopSOS();
            } else {
                if (confirm("🚨 TRIGGER SOS?\nThis will alert your guardians and start live tracking.")) {
                    EmergencySystem.triggerSOS();
                }
            }
        });
    }

    document.addEventListener('touchstart', () => {
        if (!EmergencySystem.alarmInstance) {
            const silent = new Audio();
            silent.play().catch(()=>{});
        }
    }, { once: true });
});