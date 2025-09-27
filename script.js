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




// --- Real nearby bus stops using Overpass API ---
window.addEventListener('DOMContentLoaded', function() {
    // Initialize Leaflet map instantly
    var map = L.map('map').setView([17.3850, 78.4867], 11); // Default Hyderabad
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Routing control (only one at a time)
    var routingControl = null;

    // Show loading spinner for nearby stops immediately
    const stopsContainer = document.querySelector('.stops-list');
    if (stopsContainer) {
        stopsContainer.innerHTML = '<div style="color:#888;padding:1rem;"><span class="spinner"></span> Loading nearby bus stops...</div>';
    }

    // Function to calculate distance between two lat/lon points
    function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
        function deg2rad(deg) { return deg * (Math.PI/180); }
        var R = 6371000; // Radius of earth in meters
        var dLat = deg2rad(lat2-lat1);
        var dLon = deg2rad(lon2-lon1);
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c; // Distance in meters
        return Math.round(d);
    }

    // Function to update nearby stops list in HTML
    function updateStopsList(userLat, userLon, stops) {
        const stopsContainer = document.querySelector('.stops-list');
        stopsContainer.innerHTML = '';
        if (!stops || stops.length === 0) {
            stopsContainer.innerHTML = '<div style="color:#888;padding:1rem;">No nearby bus stops found.</div>';
            return;
        }
        stops.forEach(stop => {
            const distance = getDistanceFromLatLonInM(userLat, userLon, stop.lat, stop.lon);
            const stopName = stop.tags.name || 'Bus Stop';
            const stopCard = document.createElement('div');
            stopCard.className = 'stop-card';
            stopCard.innerHTML = `
                <span class="stop-name">${stopName}</span>
                <span class="stop-distance">${distance} m away</span>
                <span class="stop-routes">N/A</span>
            `;
            // Add click event to show route on map
            stopCard.style.cursor = 'pointer';
            stopCard.title = 'Show route to this stop';
            stopCard.addEventListener('click', function() {
                // Remove previous route if any
                if (window.routingControl) {
                    try { map.removeControl(window.routingControl); } catch(e) {}
                    window.routingControl = null;
                }
                // Add new route
                window.routingControl = L.Routing.control({
                    waypoints: [
                        L.latLng(userLat, userLon),
                        L.latLng(stop.lat, stop.lon)
                    ],
                    routeWhileDragging: false,
                    draggableWaypoints: false,
                    addWaypoints: false,
                    show: false,
                    lineOptions: { styles: [{color: '#4e73df', weight: 5}] },
                    createMarker: function() { return null; }
                }).addTo(map);
                // Fit map bounds to route
                var bounds = L.latLngBounds([
                    [userLat, userLon],
                    [stop.lat, stop.lon]
                ]);
                map.fitBounds(bounds.pad(0.2)); // Add padding for better view
            });
            stopsContainer.appendChild(stopCard);
        });
    }


    // Fetch all bus stops in Hyderabad bounding box for autocomplete (not just 5km)
    let allStopNames = [];
    function fetchAllBusStopsForAutocomplete() {
        // India bounding box: (6.5, 68.1, 37.1, 97.4)
        var query = `
            [out:json][timeout:60];
            node["highway"="bus_stop"](6.5,68.1,37.1,97.4);
            out;
        `;
        var url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                allStopNames = Array.from(new Set(data.elements.map(stop => stop.tags.name).filter(Boolean)));
            })
            .catch(err => console.error("Error fetching all bus stops for autocomplete:", err));
    }
    fetchAllBusStopsForAutocomplete();

    // When location found
    function onLocationFound(e) {
        var lat = e.latitude;
        var lon = e.longitude;
        // Only update map view and add marker when location is found
        map.setView([lat, lon], 14);
        // Remove previous user marker if any
        if (window.userMarker && map.hasLayer(window.userMarker)) {
            map.removeLayer(window.userMarker);
        }
        window.userMarker = L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();
        // Show loading while fetching
        const stopsContainer = document.querySelector('.stops-list');
        if (stopsContainer) {
            stopsContainer.innerHTML = '<div style="color:#888;padding:1rem;">Loading nearby bus stops...</div>';
        }
        // Helper to fetch bus stops with fallback and dynamic radius
        function fetchNearbyStops(radius, onSuccess, onFail) {
            var query = `
                [out:json];
                node["highway"="bus_stop"](around:${radius}, ${lat}, ${lon});
                out;
            `;
            var url1 = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
            var url2 = "https://overpass.kumi.systems/api/interpreter?data=" + encodeURIComponent(query);
            // Try first endpoint, then fallback
            Promise.race([
                fetch(url1).then(res => res.json()),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
            ]).then(onSuccess).catch(() => {
                // Try backup endpoint
                Promise.race([
                    fetch(url2).then(res => res.json()),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
                ]).then(onSuccess).catch(onFail);
            });
        }
        // Try 2km, then 5km if no stops found
        fetchNearbyStops(2000, function(data) {
            if (data.elements && data.elements.length > 0) {
                data.elements.forEach(stop => {
                    L.marker([stop.lat, stop.lon])
                        .addTo(map)
                        .bindPopup(stop.tags.name || "Bus Stop");
                });
                updateStopsList(lat, lon, data.elements);
            } else {
                // Try larger radius
                fetchNearbyStops(5000, function(data2) {
                    if (data2.elements && data2.elements.length > 0) {
                        data2.elements.forEach(stop => {
                            L.marker([stop.lat, stop.lon])
                                .addTo(map)
                                .bindPopup(stop.tags.name || "Bus Stop");
                        });
                        updateStopsList(lat, lon, data2.elements);
                    } else {
                        if (stopsContainer) {
                            stopsContainer.innerHTML = '<div style="color:#888;padding:1rem;">No nearby bus stops found.</div>';
                        }
                    }
                }, function() {
                    if (stopsContainer) {
                        stopsContainer.innerHTML = '<div style="color:#e74a3b;padding:1rem;">Failed to load nearby bus stops. Please try again later.</div>';
                    }
                });
            }
        }, function() {
            if (stopsContainer) {
                stopsContainer.innerHTML = '<div style="color:#e74a3b;padding:1rem;">Failed to load nearby bus stops. Please try again later.</div>';
            }
        });
// Spinner CSS for loading
const style = document.createElement('style');
style.innerHTML = `
.spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 3px solid #e0e0e0;
    border-top: 3px solid #4e73df;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
    vertical-align: middle;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);

        // --- Autocomplete for pickup/destination using all bus stop names ---
        function setupStopAutocomplete(inputId, suggestionsId) {
            const input = document.getElementById(inputId);
            const suggestions = document.getElementById(suggestionsId);
            let selectedIndex = -1;
            let currentMatches = [];

            input.addEventListener('input', function() {
                const query = input.value.trim().toLowerCase();
                suggestions.innerHTML = '';
                selectedIndex = -1;
                if (query.length < 1) {
                    suggestions.style.display = 'none';
                    return;
                }
                currentMatches = allStopNames.filter(name => name.toLowerCase().includes(query)).slice(0, 8);
                if (currentMatches.length === 0) {
                    suggestions.style.display = 'none';
                    return;
                }
                currentMatches.forEach((name, idx) => {
                    const div = document.createElement('div');
                    div.textContent = name;
                    div.style.padding = '0.5rem 1rem';
                    div.style.cursor = 'pointer';
                    div.tabIndex = 0;
                    div.className = 'autocomplete-suggestion';
                    div.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        input.value = name;
                        suggestions.style.display = 'none';
                    });
                    suggestions.appendChild(div);
                });
                suggestions.style.display = 'block';
            });

            input.addEventListener('keydown', function(e) {
                const items = suggestions.querySelectorAll('.autocomplete-suggestion');
                if (!items.length || suggestions.style.display === 'none') return;
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedIndex = (selectedIndex + 1) % items.length;
                    items.forEach((item, idx) => {
                        item.style.background = idx === selectedIndex ? '#e0e0e0' : '';
                    });
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    items.forEach((item, idx) => {
                        item.style.background = idx === selectedIndex ? '#e0e0e0' : '';
                    });
                } else if (e.key === 'Enter') {
                    if (selectedIndex >= 0 && selectedIndex < items.length) {
                        e.preventDefault();
                        input.value = items[selectedIndex].textContent;
                        suggestions.style.display = 'none';
                    }
                }
            });

            input.addEventListener('blur', function() {
                setTimeout(() => { suggestions.style.display = 'none'; }, 100);
            });
        }
        setupStopAutocomplete('pickup-location', 'pickup-suggestions');
        setupStopAutocomplete('destination-location', 'destination-suggestions');
    }

    map.on('locationfound', onLocationFound);
    map.on('locationerror', function(e){
        alert("Could not get your location. Please enable location services.");
    });

    // Locate user
    map.locate({setView: true, maxZoom: 16});
});
