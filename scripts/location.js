const LocationManager = {
    getCurrentLocation: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject("Geolocation not supported");
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => reject(error)
            );
        });
    },
    
    watchLocation: (callback) => {
        return navigator.geolocation.watchPosition(callback);
    }
};