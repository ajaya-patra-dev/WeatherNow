// =====================================
// 1. SELECT HTML ELEMENTS
// =====================================

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const refreshBtn = document.getElementById("refresh-btn");

const statusMessage = document.getElementById("status-message");
const weatherDashboard = document.getElementById("weather-dashboard");
const welcomeState = document.getElementById("welcome-state");

const cityName = document.getElementById("city-name");
const locationDetails = document.getElementById("location-details");

const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weather-description");
const feelsLike = document.getElementById("feels-like");

const highLow = document.getElementById("high-low");
const uvIndex = document.getElementById("uv-index");
const localTime = document.getElementById("local-time");

const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const precipitation = document.getElementById("precipitation");
const pressure = document.getElementById("pressure");

const forecastGrid = document.getElementById("forecast-grid");


// =====================================
// 2. APPLICATION STATE
// =====================================

let currentLocation = null;
let requestNumber = 0;


// =====================================
// 3. WEATHER CODE INFORMATION
// Open-Meteo weather interpretation codes
// =====================================

function getWeatherInfo(code, isDay = true) {

    if (code === 0) {
        return {
            description: "Clear Sky",
            icon: isDay ? "☀️" : "🌙"
        };
    }

    if (code === 1) {
        return {
            description: "Mainly Clear",
            icon: isDay ? "🌤️" : "🌙"
        };
    }

    if (code === 2) {
        return {
            description: "Partly Cloudy",
            icon: "⛅"
        };
    }

    if (code === 3) {
        return {
            description: "Overcast",
            icon: "☁️"
        };
    }

    if ([45, 48].includes(code)) {
        return {
            description: "Foggy",
            icon: "🌫️"
        };
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
        return {
            description: "Drizzle",
            icon: "🌦️"
        };
    }

    if ([61, 63, 65, 66, 67].includes(code)) {
        return {
            description: "Rain",
            icon: "🌧️"
        };
    }

    if ([71, 73, 75, 77].includes(code)) {
        return {
            description: "Snow",
            icon: "❄️"
        };
    }

    if ([80, 81, 82].includes(code)) {
        return {
            description: "Rain Showers",
            icon: "🌦️"
        };
    }

    if ([85, 86].includes(code)) {
        return {
            description: "Snow Showers",
            icon: "🌨️"
        };
    }

    if (code === 95) {
        return {
            description: "Thunderstorm",
            icon: "⛈️"
        };
    }

    if ([96, 99].includes(code)) {
        return {
            description: "Thunderstorm with Hail",
            icon: "⛈️"
        };
    }

    return {
        description: "Weather Unavailable",
        icon: "🌍"
    };
}


// =====================================
// 4. SHOW STATUS MESSAGES
// =====================================

function showStatus(message, type = "info") {

    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    statusMessage.classList.remove("hidden");
}


function hideStatus() {

    statusMessage.textContent = "";
    statusMessage.className = "status-message hidden";
}


// =====================================
// 5. LOADING STATE
// =====================================

function setLoading(isLoading) {

    searchBtn.disabled = isLoading;
    refreshBtn.disabled = isLoading;

    searchBtn.textContent = isLoading
        ? "Loading..."
        : "Search";

    if (isLoading) {
        showStatus("Fetching weather information...", "loading");
    }
}


// =====================================
// 6. FETCH WITH ERROR HANDLING
// =====================================

async function fetchJSON(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Request failed with status ${response.status}`
        );
    }

    return await response.json();
}


// =====================================
// 7. FIND A CITY
// Using Open-Meteo Geocoding API
// =====================================

async function findCity(city) {

    const url =
        "https://geocoding-api.open-meteo.com/v1/search" +
        `?name=${encodeURIComponent(city)}` +
        "&count=10&language=en&format=json";

    const data = await fetchJSON(url);

    if (!data.results || data.results.length === 0) {
        throw new Error(
            "City not found. Check the spelling and try again."
        );
    }

    const results = data.results;

    // Prefer an exact city-name match when available.
    const exactMatch = results.find(item =>
        item.name.toLowerCase() === city.trim().toLowerCase()
    );

    return exactMatch || results[0];
}


// =====================================
// 8. GET WEATHER DATA
// Using Open-Meteo Forecast API
// =====================================

async function getWeather(latitude, longitude) {

    const params = new URLSearchParams({

        latitude: latitude,
        longitude: longitude,

        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "weather_code",
            "surface_pressure",
            "wind_speed_10m"
        ].join(","),

        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "uv_index_max",
            "precipitation_probability_max"
        ].join(","),

        timezone: "auto",
        forecast_days: "5",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm"
    });

    const url =
        `https://api.open-meteo.com/v1/forecast?${params}`;

    return await fetchJSON(url);
}


// =====================================
// 9. FORMAT LOCAL TIME
// =====================================

function formatLocalTime(timeString) {

    if (!timeString) {
        return "--:--";
    }

    const parts = timeString.split("T");

    if (parts.length < 2) {
        return "--:--";
    }

    const timeParts = parts[1].split(":");

    if (timeParts.length < 2) {
        return "--:--";
    }

    return `${timeParts[0]}:${timeParts[1]}`;
}


// =====================================
// 10. FORMAT FORECAST DAY
// =====================================

function formatForecastDay(dateString, index) {

    if (index === 0) {
        return "Today";
    }

    const date = new Date(`${dateString}T12:00:00`);

    return new Intl.DateTimeFormat("en", {
        weekday: "short"
    }).format(date);
}


// =====================================
// 11. DISPLAY CURRENT WEATHER
// =====================================

function displayCurrentWeather(location, data) {

    const current = data.current;
    const daily = data.daily;

    const weatherInfo = getWeatherInfo(
        current.weather_code,
        current.is_day === 1
    );

    cityName.textContent = location.name;

    const locationParts = [
        location.admin1,
        location.country
    ].filter(Boolean);

    locationDetails.textContent =
        locationParts.join(", ") || "Location details unavailable";


    // Current temperature
    temperature.textContent =
        Math.round(current.temperature_2m);

    weatherDescription.textContent =
        weatherInfo.description;

    weatherIcon.textContent =
        weatherInfo.icon;

    feelsLike.textContent =
        `${Math.round(current.apparent_temperature)}°C`;


    // Today's high and low
    highLow.textContent =
        `${Math.round(daily.temperature_2m_max[0])}° / ` +
        `${Math.round(daily.temperature_2m_min[0])}°C`;


    // UV Index
    const uv = daily.uv_index_max[0];

    uvIndex.textContent =
        Number.isFinite(uv) ? uv.toFixed(1) : "N/A";


    // Local time returned by the weather API
    localTime.textContent =
        formatLocalTime(current.time);


    // Additional weather details
    humidity.textContent =
        `${current.relative_humidity_2m}%`;

    windSpeed.textContent =
        `${Math.round(current.wind_speed_10m)} km/h`;

    precipitation.textContent =
        `${Number(current.precipitation).toFixed(1)} mm`;

    pressure.textContent =
        `${Math.round(current.surface_pressure)} hPa`;
}


// =====================================
// 12. DISPLAY FIVE-DAY FORECAST
// =====================================

function displayForecast(data) {

    forecastGrid.innerHTML = "";

    const daily = data.daily;

    daily.time.forEach((date, index) => {

        const info = getWeatherInfo(
            daily.weather_code[index]
        );

        const card = document.createElement("article");
        card.className = "forecast-card";


        const day = document.createElement("p");
        day.className = "forecast-day";
        day.textContent = formatForecastDay(date, index);


        const icon = document.createElement("div");
        icon.className = "forecast-icon";
        icon.textContent = info.icon;


        const description = document.createElement("p");
        description.className = "forecast-description";
        description.textContent = info.description;


        const temperatures = document.createElement("p");
        temperatures.className = "forecast-temperatures";

        const high = Math.round(
            daily.temperature_2m_max[index]
        );

        const low = Math.round(
            daily.temperature_2m_min[index]
        );

        temperatures.textContent = `${high}° / ${low}°C`;


        const rain = document.createElement("p");
        rain.className = "forecast-rain";

        const rainChance =
            daily.precipitation_probability_max?.[index];

        rain.textContent =
            rainChance == null
                ? "Rain chance: N/A"
                : `🌧️ ${rainChance}% chance`;


        card.appendChild(day);
        card.appendChild(icon);
        card.appendChild(description);
        card.appendChild(temperatures);
        card.appendChild(rain);

        forecastGrid.appendChild(card);
    });
}


// =====================================
// 13. SEARCH AND DISPLAY WEATHER
// =====================================

async function searchWeather(city) {

    const searchId = ++requestNumber;

    setLoading(true);
    welcomeState.classList.add("hidden");

    try {

        // Step 1: Find the location
        const location = await findCity(city);

        // Ignore outdated search results.
        if (searchId !== requestNumber) {
            return;
        }

        // Step 2: Fetch its weather
        const weatherData = await getWeather(
            location.latitude,
            location.longitude
        );

        if (searchId !== requestNumber) {
            return;
        }

        // Step 3: Update the dashboard
        displayCurrentWeather(location, weatherData);

        displayForecast(weatherData);

        currentLocation = location;

        weatherDashboard.classList.remove("hidden");

        hideStatus();

    } catch (error) {

        if (searchId !== requestNumber) {
            return;
        }

        console.error("Weather request failed:", error);

        showStatus(
            error.message.includes("City not found")
                ? error.message
                : "Unable to load weather. Check your internet connection and try again.",
            "error"
        );

    } finally {

        if (searchId === requestNumber) {
            setLoading(false);
        }
    }
}


// =====================================
// 14. SEARCH FORM EVENT
// =====================================

searchForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        showStatus("Please enter a city name.", "error");
        return;
    }

    searchWeather(city);
});


// =====================================
// 15. REFRESH WEATHER
// =====================================

refreshBtn.addEventListener("click", function () {

    if (!currentLocation) {
        return;
    }

    searchWeather(currentLocation.name);
});


// =====================================
// 16. INITIAL DASHBOARD STATE
// =====================================

weatherDashboard.classList.add("hidden");
hideStatus();