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
// Placeholder for future interactivity
// Example: Show alert when loading map



// Initialize Leaflet map with OpenStreetMap tiles
window.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([17.3850, 78.4867], 11); // Hyderabad
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Try to get user's real-time location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            var marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup("You are here").openPopup();
            map.setView([lat, lng], 14);
        }, function(error) {
            // If denied or error, do nothing (map stays on Hyderabad)
            console.warn('Geolocation error:', error.message);
        });
    }
});
