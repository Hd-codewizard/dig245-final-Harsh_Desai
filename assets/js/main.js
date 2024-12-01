/* javascript */
const weatherAPI = 'https://api.weather.gov/points/';
const overpassAPI = 'https://overpass-api.de/api/interpreter';
const nominatimAPI = 'https://nominatim.openstreetmap.org/search';

//Initialize the map using Leaflet and a marker group
const map = L.map('map').setView([35.5, -80.85], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
// Making a marker group
const markerGroup= L.layerGroup().addTo(map);
// Making a custom marker based on weather
//Get GeoLocation of a place from Nominatim API
async function getLocation(location){
    const link = `${nominatimAPI}?q=${encodeURIComponent(location)}&format=json&limit=1`;
    try{
        const response = await fetch(link);
        const coordinates = await response.json();
        if(coordinates.length === 0){
            alert("No place found");
            return null;
        }
        const{lat,lon} = coordinates[0];
        console.log("Geolocation API Response:", coordinates);
        return {lat: parseFloat(lat), lon: parseFloat(lon)};
    }
    catch(error){
        alert("Error fetching geolocation data.");
        console.error(error);
        return null;
    }
}
//Get Weather from Weather.GOV API
async function getWeather(lat, lon){
    try{
        const response2 = await fetch(`${weatherAPI}${lat},${lon}`);
        const data = await response2.json();
        const forecast_link = data.properties.forecast;
        const forecast_response = await fetch(forecast_link);
        const forecast_data = await forecast_response.json();
        console.log("Weather API Response:", forecast_data);
        return forecast_data.properties.periods[0].shortForecast.toLowerCase();
    }
    catch(error){
        alert("Error fetching weather data.");
        console.error(error);
        return null;
    }
}
// Get Places using the Openstreetmap Overpass API
async function getPlaces(lat,lon,radius,acts){ 
    try{
        const places1 = [];
        for(let i =0; i<acts.length; i++){
            const query = `[out:json][timeout:90];node(around:${radius*1000},${lat},${lon})[${acts[i]}];out body;`;
            var result = await fetch(overpassAPI,{method:  "POST",
                body: "data=" + encodeURIComponent(query),
            });
            let data = await result.json();
            if(data.length === 0){
                return;
            }
            console.log(query);
            if(data.elements.length === 0){
                continue;
            }
            else{
                console.log("DATA", data.elements.length);
                for(let j = 0; j < data.elements.length;j++){
                    const place ={
                        lat: data.elements[j].lat,
                        lon: data.elements[j].lon,
                        name: data.elements[j].tags.name,
                        type:data.elements[j].tags.leisure || data.elements[0].tags.amenity || data.elements[0].tags.natural,
                    }
                    places1.push(place);
                }
            }
        }
        return places1;
      }
    catch(error){
        console.error("Error fetching activities from Overpass API:", error);
        return [];
    }
}   
// Display the places on the initialized LeafLet Map
async function displayLocations(places){
    for(let i = 0; i<places.length; i++){
        const place_current = places[i];
        const marker = L.marker([place_current.lat, place_current.lon]).addTo(map).bindPopup(`<b>${place_current.name}</b><br>Type: ${place_current.type}`);
        marker.addTo(markerGroup);
    }
}
function displayRange(){
    var range = document.getElementById("radius").value;
    document.getElementById('output').innerHTML = range + " KM";
}
//A array that represents indoor and outdoor activities with prompts for Overpass API
const activityCategories = {
    outdoor: ["leisure=park", "tourism=zoo", "natural=beach", "leisure=pitch"], // Parks, Zoos, Beaches, Sports fields
    indoor: ["amenity=cafe", "amenity=museum", "leisure=bowling_alley"]        // Cafes, Museums, Bowling Alleys
};
// The main fucntion of the program. Uses Overpass API to find places and put them on a map
async function findActivities(){
    displayRange();
    const place = document.getElementById("location");
    const place1 = place.value;
    const geoCoordinates = await getLocation(place1);
    if(!geoCoordinates){
        return;
    }
    const{lat,lon} = geoCoordinates;
    map.setView([lat,lon],10);
    const weather_forecast = await getWeather(lat,lon);
    if(!weather_forecast){
        return;
    }
    let weather_acts;
    if (weather_forecast.includes("sun") || weather_forecast.includes("clear") || weather_forecast.includes("partly cloudy")) {
        weather_acts= activityCategories.outdoor;
    } 
    else{
        weather_acts = activityCategories.indoor;
    }
    console.log("Activites",weather_acts);
    const RADIUS = document.getElementById("radius").value;
    const locations = await getPlaces(lat,lon,RADIUS,weather_acts);
    console.log("Weather: " , locations);
    if(locations.length != 0){
        if(markerGroup.length != 0){
            markerGroup.clearLayers();
        }
        displayLocations(locations); 
    }
    else{
        return[];
    }
    
}

