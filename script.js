// Route search bar swap and submit handler
document.addEventListener('DOMContentLoaded', function() {
    const swapIcon = document.querySelector('.swap-icon');
    const pickupInput = document.getElementById('pickup-location');
    const destinationInput = document.getElementById('destination-location');
    if (swapIcon && pickupInput && destinationInput) {
        swapIcon.addEventListener('click', function() {
            const temp = pickupInput.value;
            pickupInput.value = destinationInput.value;
            destinationInput.value = temp;
        });
    }
    const form = document.getElementById('route-search-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const pickup = encodeURIComponent(pickupInput.value.trim());
            const destination = encodeURIComponent(destinationInput.value.trim());
            if (pickup && destination) {
                window.location.href = `routes.html?pickup=${pickup}&destination=${destination}`;
            }
        });
    }
});

// Low bandwidth mode implementation
document.addEventListener('DOMContentLoaded', function() {
    var lowDataBtn = document.getElementById('toggle-bandwidth');
    if (lowDataBtn) {
        lowDataBtn.addEventListener('click', function() {
            document.body.classList.toggle('low-bandwidth');
            var isLow = document.body.classList.contains('low-bandwidth');
            // Hide map and images in low data mode
            var mapSection = document.getElementById('map');
            if (mapSection) mapSection.style.display = isLow ? 'none' : '';
            var imgs = document.querySelectorAll('img');
            imgs.forEach(function(img) { img.style.display = isLow ? 'none' : ''; });
            // Optionally show a notification
            if (window.showNotification) {
                showNotification(isLow ? 'Low bandwidth mode enabled' : 'Low bandwidth mode disabled');
            }
        });
    }
});



// Initialize Leaflet map with OpenStreetMap tiles
window.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([17.3850, 78.4867], 11); // Hyderabad
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Static demo bus stops (could be replaced with API data)
    var busStops = [
        { name: 'Ameerpet Metro', lat: 17.4375, lng: 78.4483, routes: '100V, 216' },
        { name: 'Panjagutta', lat: 17.4275, lng: 78.4482, routes: '290U, 8A' },
        { name: 'Banjara Hills', lat: 17.4140, lng: 78.4346, routes: '100V, 216, 290U' },
        { name: 'Kazipet Bus Stop', lat: 17.9774, lng: 79.4981, routes: 'TSRTC, 2, 5, 7' }
    ];


    // Haversine formula to calculate distance between two lat/lng points in meters
    function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
        var R = 6371000; // Radius of the earth in meters
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a =
            0.5 - Math.cos(dLat)/2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            (1 - Math.cos(dLon))/2;
        return R * 2 * Math.asin(Math.sqrt(a));
    }

    function addNearbyBusStopsToMap(centerLat, centerLng, radiusMeters) {
        var found = false;
        busStops.forEach(function(stop) {
            var dist = getDistanceFromLatLonInMeters(centerLat, centerLng, stop.lat, stop.lng);
            if (dist <= radiusMeters) {
                var marker = L.marker([stop.lat, stop.lng]).addTo(map);
                marker.bindPopup('<b>' + stop.name + '</b><br>Routes: ' + stop.routes + '<br>Distance: ' + Math.round(dist) + 'm');
                found = true;
            }
        });
        // If no stops found nearby, show all as fallback and notify
        if (!found) {
            if (window.showNotification) {
                showNotification('No bus stops found within ' + (radiusMeters/1000) + 'km. Showing all demo stops.');
            }
            busStops.forEach(function(stop) {
                var marker = L.marker([stop.lat, stop.lng]).addTo(map);
                marker.bindPopup('<b>' + stop.name + '</b><br>Routes: ' + stop.routes);
            });
        }
    }

    // Try to get user's real-time location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            var marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup("You are here").openPopup();
            map.setView([lat, lng], 14);
            addNearbyBusStopsToMap(lat, lng, 5000); // 5km radius
        }, function(error) {
            // If denied or error, show all stops near Hyderabad center
            addNearbyBusStopsToMap(17.3850, 78.4867, 5000);
            console.warn('Geolocation error:', error.message);
        });
    } else {
        addNearbyBusStopsToMap(17.3850, 78.4867, 5000);
    }
});
