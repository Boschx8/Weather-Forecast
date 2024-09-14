// Constants and global variables
const API_KEY = 'b30df47960a7687b664ce3522366915f';

// DOM elements
const searchInput = document.getElementById("cityInput");
const suggestions = document.getElementById('suggestions');

const forecastTab = document.querySelector('.week');
const todayTab = document.querySelector('.today');
const weatherCards = document.querySelector('.weather-cards');
const hourlyCards = document.querySelector('.hourly-cards');

let globalSunsetTime;
let globalSunriseTime;


// Initialization
document.addEventListener('DOMContentLoaded', function() {
    loadDefaultCity();
    setupEventListeners();
    setupToggleFunctionality(); 
});



// Default city loading
async function loadDefaultCity() {
    try {
        await getCityWeather('New York');
        await getCityPrecipitation('New York');
        await getWeekForecastWeather('New York');
        await getUVIndex('New York');
        await getAirQuality('New York');
    } catch (error) {
        console.error('Failed to load weather', error);
        // Display a fallback message
        document.getElementById("cityText").textContent = "Weather data unavailable";
        document.getElementById("temperature").textContent = "--";
        document.getElementById("weather-description").textContent = "Please try searching for a city";
    }
}

// Event listeners setup
function setupEventListeners() {
    searchInput.addEventListener('input', handleInput);
    document.addEventListener('click', handleOutsideClick);
}

// Event handlers
function handleInput(event) {
    const userInput = event.target.value;
    if (userInput.length >= 3) {
        getCitySuggestions(userInput);
    } else {
        clearSuggestions();
    }
}

function handleOutsideClick(event) {
    const suggestionsContainer = document.querySelector('.suggestions-list');
    if (suggestionsContainer && 
        !searchInput.contains(event.target) && 
        !suggestionsContainer.contains(event.target)) {
        clearSuggestions();
    }
}


function setupToggleFunctionality() {
    forecastTab.addEventListener('click', showForecast);
    todayTab.addEventListener('click', showToday);

    // Initially show the Today view
    showToday();
}

function showForecast() {
    weatherCards.style.display = 'grid';
    hourlyCards.style.display = 'none';
    forecastTab.classList.add('active');
    todayTab.classList.remove('active');
}

function showToday() {
    weatherCards.style.display = 'none';
    hourlyCards.style.display = 'grid';
    todayTab.classList.add('active');
    forecastTab.classList.remove('active');
}

// API calls
async function getCoordinates(cityName) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`);
        if (!response.ok) throw new Error(`HTTPS error! status: ${response.status}`);
        const data = await response.json();
        if (data.length === 0) throw new Error('City not found');
        return { 
            lat: data[0].lat, 
            lon: data[0].lon,
            name: data[0].name,
            country: data[0].country
        };
    } catch (error) {
        console.error('Error getting coordinates:', error);
        throw error;
    }
}

async function getWeatherByCoordinates(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error getting weather:', error);
        throw error;
    }
}

async function getCityWeather(cityName) {
    try {
        const geoData = await getCoordinates(cityName);
        if (!geoData) throw new Error('City not found');
        const { lat, lon, name: geoName, country } = geoData;
        const weatherData = await getWeatherByCoordinates(lat, lon);
        updateWeatherDisplay(weatherData, geoName, country);
    } catch (error) {
        console.error('Failed to get weather data:', error);
        document.getElementById("cityText").textContent = "City not found";
        document.getElementById("temperature").textContent = "--";
        document.getElementById("weather-description").textContent = "";
        document.getElementById("day-hour").textContent = "";
    }
}

async function getCitySuggestions(input) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=5&appid=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTPS error! status: ${response.status}`);
        }
        const data = await response.json();
        displaySuggestions(data);
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

async function getCityPrecipitation(input) {
    try {
        const { lat, lon } = await getCoordinates(input);
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        if (!response.ok) {
            throw new Error(`HTTPS error! status: ${response.status}`);
        }
        const data = await response.json();
        updatePrecipitationProbability(data);
    } catch (error) {
        console.error('There was a problem fetching the weather data:', error);
        document.getElementById('rain-%').textContent = 'Rain data unavailable';
    }
}


async function getWeekForecastWeather(input){

    try { 
        const { lat, lon } = await getCoordinates(input);
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        if (!response.ok) {
            throw new Error(`HTTPS error! status: ${response.status}`);
        }
        const data = await response.json();
       
        const processedDailyData = processDayData(data);
        const processedWeekData = processWeatherData(data);
        updateWeekForecastCards(processedWeekData);
        updateDayData(processedDailyData);

    } catch(error) {
        console.error('There was a problem fetching the weekly forecast weather data:', error);
    }
}


async function getUVIndex(input) {
    const API_KEY = 'openuv-1u44rm0y75ixt-io';

    try {
        const {lat, lon } = await getCoordinates(input);
        const response = await fetch(`https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`, {
            headers: {
                'x-access-token': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateUvIndex(data);
    } catch (error) {
        console.error('Error fetching UV data:', error);
        return null;
    }
}


async function getAirQuality(input){
    const API_KEY = 'eb0fd5d7e77c4ddf829fbc120938de8b';

    try { 
        const { lat, lon } = await getCoordinates(input);
        const response = await fetch(`https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateAirQuality(data);
        
    } catch(error) {
        console.error('There was a problem fetching the weekly forecast weather data:', error);
    }
}



// DOM manipulation functions
function displaySuggestions(data) {
    const suggestionsContainer = document.querySelector(".suggestions-list");
    suggestionsContainer.innerHTML = "";
 
    const userInput = searchInput.value.toLowerCase();
 
    if (data.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }
 
    data.forEach(city => {
         const li = document.createElement("li");
         li.textContent = `${city.name}, ${city.country}`;
         li.addEventListener("click", () => {
             searchInput.value = li.textContent;
             clearSuggestions();
             getCityWeather(city.name);
             setupToggleFunctionality();
             getCityPrecipitation(city.name);
             getWeekForecastWeather(city.name);
             getUVIndex(city.name)
             getAirQuality(city.name);
         });
         suggestionsContainer.appendChild(li);
    });
   
    suggestionsContainer.style.display = 'block';
}

function clearSuggestions() {
    const suggestionsContainer = document.querySelector('.suggestions-list');
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }
}




function updateWeatherDisplay(data, geoName, geoCountry) {
    const { main: {temp, humidity},
            dt,
            visibility,
            timezone,
            sys: {sunrise, sunset},
            wind: {speed},
            weather: [{ description, id}]} = data;
            
    const desc = description.charAt(0).toUpperCase() + description.slice(1);
    
    const localTime = new Date((dt + timezone) * 1000);
    const sunriseTime = new Date((sunrise + timezone) * 1000);
    const sunsetTime = new Date((sunset + timezone) * 1000);

    globalSunsetTime = sunsetTime;
    globalSunriseTime = sunriseTime;

    let weatherImageSrc;
    
    if (id === 800) { // Clear sky condition
        weatherImageSrc = localTime <= sunsetTime ? "clear-day.svg" : "clear-night.svg";
    } else {
        weatherImageSrc = getWeatherImage(id);
    }

    const weatherImage = document.getElementById("weather-image");
    if (weatherImage) {
        weatherImage.src = `assets/${weatherImageSrc}`;
        weatherImage.alt = desc;
    } else {
        console.error("Could not find element with id 'weather-image'");
    }

    document.getElementById("temperature").innerHTML = `${Math.round(temp)}<sup>°C</sup>`;
    const weatherIcon = document.getElementById("weather-icon");
    weatherIcon.src = `assets/${weatherImageSrc}`;


    document.getElementById("weather-description").innerHTML = `
            <p id="weather-description"><span aria-hidden="true"></span>${desc}</p>
    `;

    document.getElementById("day-hour").textContent = localTime.toLocaleString('en-US', {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    }).replace(/^0/, '');
    
    document.getElementById("wind-status").textContent = `${speed.toFixed(1)} m/s`;
    document.getElementById("humidity").textContent = `${humidity}`;
    document.getElementById("visibility").textContent = `${Math.ceil(visibility / 1000)} km`;
    document.getElementById("sunrise").textContent = sunriseTime.toLocaleString('es-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    });
    document.getElementById("sunset").textContent = sunsetTime.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    }).replace(/^0/, '');

    document.getElementById("cityText").textContent = `${geoName}, ${geoCountry}`;
}



function updatePrecipitationProbability(data) {
    const pop = data.list[0].pop; // Get probability of precipitation from the first forecast period
    const popPercentage = Math.round(pop * 100); // Convert to percentage and round

    document.getElementById('rain-%').textContent = `Rain - ${popPercentage}%`;
}



function processDayData(data){
    const timezoneOffset = data.city.timezone;
    return data.list.slice(0, 6).map(forecast => ({
        time: new Date((forecast.dt + timezoneOffset) * 1000),
        temperature: forecast.main.temp,
        weatherId: forecast.weather[0].id
      }));
}

function processWeatherData(data) {
    const dailyForecasts = {};

    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
        const dayKey = date.toISOString().split('T')[0];

        if (!dailyForecasts[dayKey]) {
            dailyForecasts[dayKey] = {
                dayOfWeek,
                temperatureMax: -Infinity,
                temperatureMin: Infinity,
                weatherConditions: []
            };
        }

        dailyForecasts[dayKey].temperatureMax = Math.max(dailyForecasts[dayKey].temperatureMax, forecast.main.temp_max);
        dailyForecasts[dayKey].temperatureMin = Math.min(dailyForecasts[dayKey].temperatureMin, forecast.main.temp_min);
        dailyForecasts[dayKey].weatherConditions.push(forecast.weather[0].id);
    });

    return Object.values(dailyForecasts).map(day => ({
        dayOfWeek: day.dayOfWeek,
        temperatureMax: Math.round(day.temperatureMax),
        temperatureMin: Math.round(day.temperatureMin),
        weatherCondition: getMostFrequent(day.weatherConditions)
    })).slice(0, 6);  // Limit to 6 days
}

function getMostFrequent(arr) {
    return arr.sort((a,b) =>
          arr.filter(v => v===a).length
        - arr.filter(v => v===b).length
    ).pop();
}


function updateDayData(forecastData) {
    const hourlyCards = document.querySelector('.hourly-cards');
    hourlyCards.innerHTML = "";
    
    forecastData.forEach((period) => {
        const card = document.createElement('article');
        card.classList.add("card");

        // Create and append time element
        const timeElement = document.createElement('h3');
        timeElement.textContent = period.time.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false, 
            timeZone: 'UTC' 
        });
        card.appendChild(timeElement);
      
        // Create and append weather icon
        const iconElement = document.createElement('img');
        if (period.weatherId === 800) {
            if (isDaytime(period.time, globalSunriseTime, globalSunsetTime)) {
                iconElement.src = 'assets/clear-day.svg';
            } else {
                iconElement.src = 'assets/clear-night.svg';
            }
        } else {
            iconElement.src = `assets/${getWeatherImage(period.weatherId)}`;
        }
        iconElement.alt = `Weather icon for ${timeElement.textContent}`;
        card.appendChild(iconElement);
      
        // Create and append temperature element
        const tempElement = document.createElement('p');
        tempElement.textContent = `${Math.round(period.temperature)}°C`;
        card.appendChild(tempElement);

        hourlyCards.appendChild(card);
    });


}

  function isDaytime(time, sunrise, sunset) {
    const hour = time.getUTCHours();
    const sunriseHour = sunrise.getUTCHours();
    const sunsetHour = sunset.getUTCHours();
    return hour >= sunriseHour && hour < sunsetHour;
}


function updateWeekForecastCards(forecastData) {
    const weatherCards = document.querySelector('.weather-cards');
    weatherCards.innerHTML = "";
    
    forecastData.forEach((dayForecast, index) => {
        const card = document.createElement('article');
        card.classList.add("card");

        if (index < forecastData.length) {
            // Update day of the week
            const dayElement = document.createElement('h3');
            if (dayElement) {
                dayElement.textContent = dayForecast.dayOfWeek;
                card.appendChild(dayElement);
            }
            
            // Update weather icon
            const iconElement = document.createElement('img');
            if (iconElement) {
                iconElement.src = `assets/${getWeatherImage(dayForecast.weatherCondition)}`;
                iconElement.alt = `Weather icon for ${dayForecast.dayOfWeek}`;
                card.appendChild(iconElement);
            }
            
            // Update temperature
            const tempElement = document.createElement('p');
            if (tempElement) {
                tempElement.textContent = `${Math.round(dayForecast.temperatureMax)}°  
                ${Math.round(dayForecast.temperatureMin)}° `;
                card.appendChild(tempElement);
            }

            card.style.display = 'flex';  // Make sure the card is visible
            weatherCards.appendChild(card);
        } else {
            card.style.display = 'none';  // Hide any extra cards
        }
    });
}


function updateUvIndex(data) {
    const uvIndex = Math.ceil(data.result.uv); 
    if (!uvIndex) {
        document.getElementById('uv-index').src = `assets/${getuviImage(uvIndex)}`;
    } else {
        document.getElementById('uv-index').src = 'assets/not-available.svg';
    }
}


function updateAirQuality(data){
    const currentData = data.data[0];

    // Update air quality if available
    if (currentData.aqi) {
        document.getElementById('air-quality').textContent = getAirQualityStatus(currentData.aqi);
        document.getElementById('air-quality-image').src = `assets/${getAirQualityImage(currentData.aqi)}`;
    } else {
        document.getElementById('air-quality').textContent = 'N/A';
    }

}



// Utility functions

function getWeatherImage(id) {
    if(id >= 200 && id <= 202 || id >= 230 && id <= 232 ) return "thunderstorms-rain.svg";
    if(id >= 210 && id <= 221) return "thunderstorms.svg";
    if(id >= 300 && id < 321) return "drizzle.svg";
    if(id >= 500 && id < 531) return "rain.svg";
    if(id >= 600 && id < 622) return "snow.svg";
    if(id === 701) return "mist.svg";
    if(id === 711) return "smoke.svg";
    if(id === 721) return "haze.svg";
    if(id === 731 || id === 761 || id === 762 ) return "dust.svg";
    if(id === 741) return "fog.svg";
    if(id === 751) return "dust.svg";
    if(id === 771) return "cloudy.svg";
    if(id === 781) return "tornado.svg";
    if(id === 800) return "clear-day.svg";
    if(id >= 801 && id < 810) return "cloudy.svg";
    return "unknown.svg";
}


function getuviImage(uvi) {
  
    if(uvi === 1 || 
        uvi === 0 ) return "uv-index-1.svg";
    if(uvi === 2) return "uv-index-2.svg";
    if(uvi === 3) return "uv-index-3.svg";
    if(uvi === 4) return "uv-index-4.svg";
    if(uvi === 5) return "uv-index-5.svg";
    if(uvi === 6) return "uv-index-6.svg";
    if(uvi === 7) return "uv-index-7.svg";
    if(uvi === 8) return "uv-index-8.svg";
    if(uvi === 9) return "uv-index-9.svg";
    if(uvi === 10) return "uv-index-10.svg";
    if(uvi === 11) return "uv-index-11.svg";
    return "unknown.svg";
}

function getAirQualityImage(aqi) {
    if(aqi >= 0 && aqi <= 50 ) return "code-green.svg";
    if(aqi >= 51 && aqi <= 100) return "code-yellow.svg";
    if(aqi >= 101 && aqi < 150) return "code-orange.svg";
    if(aqi >= 151 && aqi < 500) return "code-red.svg";
}

function getAirQualityStatus(aqi) {
    if(aqi >= 0 && aqi <= 50 ) return "Good";
    if(aqi >= 51 && aqi <= 100) return "Moderate";
    if(aqi >= 101 && aqi < 150) return "Unhealthy";
    if(aqi >= 151 && aqi < 500) return "Very Unhealthy";
}



