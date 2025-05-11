let map;
let marker;
let geocoder;



// Initialize the map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add smooth zoom animation
    map.options.zoomAnimation = true;
    map.options.zoomAnimationThreshold = 4;
}

// Show loading animation
function showLoading() {
    document.querySelector('.loading').style.display = 'block';
    document.getElementById('buttonText').textContent = 'Searching...';
}

// Hide loading animation
function hideLoading() {
    document.querySelector('.loading').style.display = 'none';
    document.getElementById('buttonText').textContent = 'Find Location';
}

function handlelocation(lat, lng) {
    // Fly to the location with animation
    map.flyTo([lat, lng], 15, {
        duration: 1.5,
        easeLinearity: 0.25
    });

    // Remove previous marker if exists
    if (marker) {
        map.removeLayer(marker);
    }

    // Add pulsing marker effect
    setTimeout(() => {
        marker = L.marker([lat, lng], {
            riseOnHover: true
        }).addTo(map);

        // Add pulsing circle
        const circle = L.circle([lat, lng], {
            color: '#4361ee',
            fillColor: '#4895ef',
            fillOpacity: 0.3,
            radius: 500
        }).addTo(map);

        // Animate the circle
        let radius = 500;
        const interval = setInterval(() => {
            radius += 20;
            circle.setRadius(radius);
            if (radius > 800) {
                clearInterval(interval);
                circle.remove();
            }
        }, 50);

        marker.bindPopup(`<b>Coordinates:</b><br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
            .openPopup();

        // Show map with animation
        document.getElementById('map').classList.add('loaded');

        // Reverse geocode to get address (using Nominatim)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                const address = data.display_name || 'Address not found';
                const addressElement = document.getElementById('address');
                addressElement.innerHTML = `
                            <h3>Location Details</h3>
                            <p><strong>Address:</strong> ${address}</p>
                            ${data.address?.country ? `<p><strong>Country:</strong> ${data.address.country}</p>` : ''}
                        `;
                addressElement.classList.add('show');
                hideLoading();
            })
            .catch(error => {
                console.error('Error fetching address:', error);
                document.getElementById('address').innerHTML = '<p>Error fetching address details</p>';
                document.getElementById('address').classList.add('show');
                hideLoading();
            });
    }, 1500);
}


// Find location when button is clicked
document.getElementById('findLocation').addEventListener('click', function () {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);

    if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude values');
        return;
    }

    showLoading();

    // Animate the button
    this.classList.add('clicked');
    setTimeout(() => {
        this.classList.remove('clicked');
    }, 300);


    handlelocation(lat, lng);


});

// Get current location
document.getElementById('getCurrentLocation').addEventListener('click', function () {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;

                // Trigger the find location click after a small delay
                setTimeout(() => {
                    document.getElementById('findLocation').click();
                }, 300);
            },
            (error) => {
                hideLoading();
                alert(`Error getting location: ${error.message}`);
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

// Initialize the map when the page loads
window.onload = initMap;

// Add animation to inputs when focused
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function () {
        this.parentElement.querySelector('.input-highlight').style.width = '100%';
    });

    input.addEventListener('blur', function () {
        if (!this.value) {
            this.parentElement.querySelector('.input-highlight').style.width = '0%';
        }
    });
});



//_________________________________________________________________________________________________//
// Supabase Cloud 

// Initialize Supabase client
function initializeSupabase() {
    const supabaseUrl = 'https://wngqbymqpbrcpgtuqetr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZ3FieW1xcGJyY3BndHVxZXRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDIwMDM3MiwiZXhwIjoyMDQ5Nzc2MzcyfQ.9hTOd76a0rjjiZOZy8Hb6GKP0JXWCz6qyx4lQtoFgFU';
    return supabase.createClient(supabaseUrl, supabaseKey);
}

document.getElementById('getcarposition').addEventListener('click', async function () {
    const supabase = initializeSupabase();

    const { data, error } = await supabase
        .from('Location')
        .update({ GET: 1 })
        .eq('GET', 0);

    if (error) {
        console.error("Error updating GET value:", error);
        return;
    }

    console.log("GET value updated to 1.");

    // Polling for GET value to become 0
    const interval = setInterval(async () => {
        const { data, error } = await supabase
            .from('Location')
            .select('GET')
            .limit(1)
            .single();

        if (error) {
            console.error("Error polling GET value:", error);
            clearInterval(interval);
            return;
        }

        console.log("Current GET value:", data.GET);

        if (data.GET === 0) {
            console.log("GET value has become 0!");
            clearInterval(interval);

            // Fetch the location when GET becomes 0
            const { data: locationData, error: locationError } = await supabase
                .from('Location')
                .select('Latitude, Longitude')
                .single();

            if (locationError) {
                console.error("Error fetching location:", locationError);
                return;
            }

            showLoading();
            handlelocation(locationData.Latitude, locationData.Longitude);
        }
    }, 2000); // Polling every 2 seconds
});


//_________________________________________________________________________________________________//