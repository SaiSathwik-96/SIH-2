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
    // Initialize Leaflet map
    var map = L.map('map').fitWorld();
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

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
        // Add user location marker
        L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();
        // Overpass API query for bus stops within 5 km (for map/nearby only)
        var query = `
            [out:json];
            node["highway"="bus_stop"](around:5000, ${lat}, ${lon});
            out;
        `;
        var url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                data.elements.forEach(stop => {
                    // Add marker on map
                    L.marker([stop.lat, stop.lon])
                        .addTo(map)
                        .bindPopup(stop.tags.name || "Bus Stop");
                });
                // Update nearby stops list
                updateStopsList(lat, lon, data.elements);
            })
            .catch(err => console.error("Error fetching bus stops:", err));

        // --- Autocomplete for pickup/destination using all bus stop names ---
        function setupStopAutocomplete(inputId, suggestionsId) {
            const input = document.getElementById(inputId);
            const suggestions = document.getElementById(suggestionsId);
            input.addEventListener('input', function() {
                const query = input.value.trim().toLowerCase();
                suggestions.innerHTML = '';
                if (query.length < 1) {
                    suggestions.style.display = 'none';
                    return;
                }
                var matches = allStopNames.filter(name => name.toLowerCase().includes(query)).slice(0, 8);
                if (matches.length === 0) {
                    suggestions.style.display = 'none';
                    return;
                }
                matches.forEach(name => {
                    const div = document.createElement('div');
                    div.textContent = name;
                    div.style.padding = '0.5rem 1rem';
                    div.style.cursor = 'pointer';
                    div.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        input.value = name;
                        suggestions.style.display = 'none';
                    });
                    suggestions.appendChild(div);
                });
                suggestions.style.display = 'block';
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
