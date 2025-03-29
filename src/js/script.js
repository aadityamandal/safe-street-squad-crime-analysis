/* * * * * * * * * * * * * *
 *           MAIN           *
 * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let risingInsight1Chart;
let hookChart;
let rs2Map;

function updateAllVisualizations() {
  risingInsight1Chart.wrangleData();
  hookChart.wrangleData();
  rs2Map.wrangleData();
}

// load data using promises
let promises = [
  d3.csv("data/Shooting_Firearm_Discharges.csv"),

  // If you want to load another dataset just add a new entry here.
  d3.csv("data/Neighbourhood_Crime_Rates.csv"),
  d3.csv("data/Major_Crime_Indicators.csv"),
  d3.json("data/toronto_crs84.geojson"),
];

Promise.all(promises)
  .then(function (data) {
    initMainPage(data);
  })
  .catch(function (err) {
    console.log(err);
  });

// This initializes the main page dynamically via DOM manipulation in D3.js
function initMainPage(allDataArray) {
  // Add new entry here when you want to destructure other datasets in parallel.
  const [shootingFireArmsData, neighbourhoodCrimeData, majorCrimeData, torontoGeoData] = allDataArray;
  initRisingInsight1Chart(shootingFireArmsData);
  initRisingInsight2Chart(neighbourhoodCrimeData);

  //   risingInsight1Chart = new StackedAreaChart("rising-insight-1-chart");
  initHookChart(neighbourhoodCrimeData);

  rs2Map = new RS2Map("rising-insight-2", torontoGeoData, majorCrimeData);

  document.querySelector(".form-select").addEventListener("change", function () {
    let selectedCrime = this.value;
    rs2Map.updateCrimeFilter(selectedCrime);
  });
}

function initHookChart(data) {
  const categories = ["ASSAULT", "ROBBERY", "THEFTOVER", "AUTOTHEFT", "BREAKENTER"];
  const years = Array.from({ length: 11 }, (_, i) => 2014 + i); // Years from 2014 to 2024

  // Aggregate data for each category and year
  const aggregatedData = years.map((year) => {
    const yearData = { year };

    categories.forEach((category) => {
      const columnName = `${category}_${year}`;
      yearData[category] = d3.sum(data, (d) => +d[columnName]);
    });

    return yearData;
  });

  console.log(aggregatedData);

  const colorScale = d3.scaleOrdinal()
    .domain(["ASSAULT", "ROBBERY", "THEFTOVER", "AUTOTHEFT", "BREAKENTER"])
    .range(["#1f77b4", "#2ca02c", "#d62728", "#ff7f0e", "#9467bd"]);

  // Initialize the Hook chart
  hookChart = new LineChart("hook-chart", aggregatedData, colorScale, "slider-hook", d3.curveCatmullRom, "category-filter-hook");
}

// Helper function to offload bulk processing
function initRisingInsight1Chart(data) {
  const timeRanges = ["Morning", "Afternoon", "Evening", "Night"];
  const timeRangeCounts = {};

  // Build time range object
  data.forEach((d) => {
    const year = +d.OCC_YEAR;
    const timeRange = d.OCC_TIME_RANGE;

    if (!timeRangeCounts[year]) {
      timeRangeCounts[year] = {};

      timeRanges.forEach((timeRange) => {
        timeRangeCounts[year][timeRange] = 0;
      });
    }

    timeRangeCounts[year][timeRange]++;
  });

  const finalData = [];

  Object.keys(timeRangeCounts).forEach((year) => {
    const yearData = { year: +year };
    const timeRangeCountForCurrentYear = timeRangeCounts[year];

    timeRanges.forEach((timeRange) => {
      yearData[timeRange] = timeRangeCountForCurrentYear[timeRange];
    });

    finalData.push(yearData);
  });

  console.log(finalData);

  // Pass the processed data to the chart
  const colorScale = d3.scaleOrdinal().domain(["Morning", "Afternoon", "Evening", "Night"]).range(["#FFD700", "#FF8C00", "#FF4500", "#00008B"]);
  risingInsight1Chart = new LineChart(`rising-insight-1-chart`, finalData, colorScale, "slider", d3.curveLinear, "category-filter-timeOfDay");
}

function initRisingInsight2Chart(data) {
  // Define urban and suburban neighborhoods
  const urbanHoods = ["Downtown", "Yonge-Bay Corridor", "Bay-Cloverhill", "East Willowdale"];
  const suburbanHoods = ["Scarborough Village", "Rexdale-Kipling", "Jane-Finch", "Willowdale West"];

  let urbanCrimeData = { Assault: 0, Robbery: 0, "Break & Enter": 0, "Auto Theft": 0, Other: 0 };
  let suburbanCrimeData = { Assault: 0, Robbery: 0, "Break & Enter": 0, "Auto Theft": 0, Other: 0 };

  // Convert missing or NaN values to 0 before summing
  function safeParse(value) {
    return isNaN(+value) || !value ? 0 : +value;
  }

  data.forEach((d) => {
    if (urbanHoods.includes(d.NEIGHBOURHOOD_NAME)) {
      urbanCrimeData.Assault += safeParse(d.ASSAULT_2024);
      urbanCrimeData.Robbery += safeParse(d.ROBBERY_2024);
      urbanCrimeData["Break & Enter"] += safeParse(d.BREAKENTER_2024);
      urbanCrimeData["Auto Theft"] += safeParse(d.AUTOTHEFT_2024);
      urbanCrimeData.Other += safeParse(d.THEFTOVER_2024) + safeParse(d.SHOOTING_2024);
    }
    if (suburbanHoods.includes(d.NEIGHBOURHOOD_NAME)) {
      suburbanCrimeData.Assault += safeParse(d.ASSAULT_2024);
      suburbanCrimeData.Robbery += safeParse(d.ROBBERY_2024);
      suburbanCrimeData["Break & Enter"] += safeParse(d.BREAKENTER_2024);
      suburbanCrimeData["Auto Theft"] += safeParse(d.AUTOTHEFT_2024);
      suburbanCrimeData.Other += safeParse(d.THEFTOVER_2024) + safeParse(d.SHOOTING_2024);
    }
  });

  // Ensure no zero-data issues
  console.log("Urban Crime Data:", urbanCrimeData);
  console.log("Suburban Crime Data:", suburbanCrimeData);

  // Initialize the Pie Charts
  new PieChart("urban-pie-chart", urbanCrimeData);
  new PieChart("suburban-pie-chart", suburbanCrimeData);
}





// SOLUTION MAP API
let debounceTimer;

function debounce(func, delay) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func(...args), delay);
  };
}

async function fetchPlaceSuggestions(inputElement) {
  const query = inputElement.value.trim();
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Toronto, Canada&addressdetails=1&extratags=1&countrycodes=CA&limit=5`;

  try {
    const response = await fetch(url, {
      // Required by OpenStreetMap
      headers: { "User-Agent": "TorontoCrimeMap/1.0" }
    });

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("Invalid response format:", data);
      return;
    }

    console.log("Toronto-Only Suggestions:", data);
    displaySuggestions(data, inputElement);
  } catch (error) {
    console.error("Error fetching places:", error);
  }
}

// Function to display lightweight suggestions
function displaySuggestions(suggestions, inputElement) {
  let suggestionBox = document.getElementById(inputElement.id + "-suggestions");

  if (!suggestionBox) {
    suggestionBox = document.createElement("div");
    suggestionBox.id = inputElement.id + "-suggestions";
    suggestionBox.className = "autocomplete-dropdown";
    inputElement.parentNode.appendChild(suggestionBox);
  }

  suggestionBox.innerHTML = "";

  // Ensure suggestions is an array
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    suggestionBox.style.display = "none";
    return;
  }

  // Filter results: Only show places within Toronto
  suggestions
    .filter(place => place.address && place.address.city === "Toronto")
    .forEach(place => {
      let div = document.createElement("div");
      div.textContent = place.display_name;
      div.onclick = function () {
        inputElement.value = place.display_name;
        suggestionBox.innerHTML = "";
      };
      suggestionBox.appendChild(div);
    });

  // Hide dropdown if no valid results
  suggestionBox.style.display = suggestionBox.innerHTML ? "block" : "none";
}

// Attach debounced function to input fields
document.addEventListener("DOMContentLoaded", function () {
  const startInput = document.getElementById("start-location");
  const endInput = document.getElementById("end-location");

  if (startInput) {
    startInput.addEventListener("input", debounce(() => fetchPlaceSuggestions(startInput), 300));
  }

  if (endInput) {
    endInput.addEventListener("input", debounce(() => fetchPlaceSuggestions(endInput), 300));
  }
});

let majorCrimesData = []; // Initialize as an empty array for the majorCrimeData


// INITIALIZE UP THE MAP
// Define Map Dimensions
const width = 800, height = 500;

// Define Projection (Centered on Toronto)
const projection = d3.geoMercator()
  .center([-79.3832, 43.7]) // Centered on Toronto
  .scale(70000) // Adjusted for proper zoom
  .translate([width / 2, height / 2]);

// Create SVG Map Container
const svg = d3.select("#map-svg")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g");

// Load Toronto GeoJSON Boundaries
d3.json("data/toronto_boundary.geojson").then(boundaryData => {
  g.selectAll("path")
    .data(boundaryData.features)
    .enter()
    .append("path")
    .attr("d", d3.geoPath().projection(projection))
    .attr("fill", "#e0e0e0")
    .attr("stroke", "#888");

  // Add Neighborhood Labels (Initially Hidden)
  const labels = g.selectAll(".neighborhood-label")
    .data(boundaryData.features)
    .enter()
    .append("text")
    .attr("class", "neighborhood-label")
    .attr("transform", d => {
      const centroid = d3.geoPath().projection(projection).centroid(d);
      return `translate(${centroid})`;
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#333")
    .attr("opacity", "0")
    .text(d => d.properties.AREA_NAME);

  // Function to Update Labels & Markers on Zoom
  function updateZoom(event) {
    const zoomLevel = event.transform.k;
    g.attr("transform", event.transform);

    // Adjust Labels
    labels
      .attr("font-size", `${Math.max(6, 14 / zoomLevel)}px`)  // Adjust size inversely with zoom
      .attr("opacity", d => {
        const bbox = g.selectAll("path").filter(p => p === d).node()?.getBBox();
        return (bbox && bbox.width > 50 && bbox.height > 20 && zoomLevel > 1.5) ? "1" : "0";
      });

    // Scale Markers Properly
    g.selectAll(".marker")
      .attr("r", d => Math.max(3, 10 / zoomLevel));
  }

  // Attach Zoom Listener
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      const zoomLevel = event.transform.k;
      g.attr("transform", event.transform);

      const safeDistance = totalDistance || 0.1;  // Default to 0.1 km if undefined

      // Dynamically adjust marker size based on zoom and route length
      const minSize = safeDistance < 0.5 ? 1 : 2;  // Super small for very short distances
      const maxSize = safeDistance < 0.5 ? 3 : 6;  // Keeps it tiny when zoomed in

      // Scale Markers Properly (Now Smaller at Street Level)
      g.selectAll(".marker")
        .attr("r", Math.max(minSize, maxSize / zoomLevel));

      // Scale Route Line Width (Much Thinner at High Zoom)
      g.selectAll(".route-line")
        .attr("stroke-width", Math.max(0.3, 1.5 / zoomLevel))
        .attr("stroke-dasharray", `${2 / zoomLevel},${2 / zoomLevel}`);
    });

  svg.call(zoom);

});


// Load & Filter Toronto Streets GeoJSON (Only Secondary & Primary Links)
d3.json("data/toronto_streets.geojson").then(streetData => {
  // Check if the correct key exists
  console.log("Street Data Sample:", streetData.features.slice(0, 5));

  // Filter only "secondary" and "primary_link" and residential roads
  const majorRoads = streetData.features.filter(d => {
    const roadClass = d.properties.highway; // Make sure "highway" is the correct key
    return roadClass && ["secondary", "primary_link", "residential"].includes(roadClass.toLowerCase());
  });

  // Append only the filtered roads
  g.selectAll(".street")
    .data(majorRoads)
    .enter()
    .append("path")
    .attr("class", "street")
    .attr("d", d3.geoPath().projection(projection))
    .attr("fill", "none")
    .attr("stroke", "#aaa")  // Light gray for visibility
    .attr("stroke-width", 0.6)  // Slightly thicker for clarity
    .attr("opacity", 0.7);  // Visible by default
});

let routeLine;  // Global reference for the route line

function addLocationMarker(coords, color, type) {
  const marker = g.append("circle")
    .attr("class", `marker ${type}`)
    .attr("cx", projection([coords.lon, coords.lat])[0])
    .attr("cy", projection([coords.lon, coords.lat])[1])
    .attr("r", 8)
    .style("fill", color)
    .style("stroke", "#000")
    .style("stroke-width", 1);

  return marker;
}

function drawRoute(startCoords, endCoords) {
  if (routeLine) routeLine.remove();

  routeLine = g.append("path")
    .datum([startCoords, endCoords])
    .attr("class", "route-line")
    .attr("d", d3.line()
      .x(d => projection([d.lon, d.lat])[0])
      .y(d => projection([d.lon, d.lat])[1])
    )
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,4");

  console.log("Route drawn:", startCoords, endCoords);
}


async function loadCrimeData() {
  try {
    const response = await fetch("data/Major_Crime_Indicators_FULL.csv");
    const csvText = await response.text();

    majorCrimesData = d3.csvParse(csvText, d => ({
      lat: parseFloat(d.LAT_WGS84),
      lon: parseFloat(d.LONG_WGS84),
      category: d.MCI_CATEGORY,
      offence: d.OFFENCE,
      date: d.OCC_DATE
    }));

    console.log("✅ Major Crimes Data Loaded:", majorCrimesData.length);

  } catch (error) {
    console.error("Error loading crime data:", error);
  }
}


// Load crime data when the page loads
document.addEventListener("DOMContentLoaded", () => {
  loadCrimeData();
});



// Fetch latitude & longitude for an address
async function fetchCoordinates(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&extratags=1&countrycodes=CA&limit=1`;

  try {
    const response = await fetch(url, { headers: { "User-Agent": "TorontoCrimeMap/1.0" } });
    const data = await response.json();
    return data.length > 0 ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
}

// FUNCTION: Interpolate route points
function interpolateStraightLine(start, end, numPoints = 20) {
  let points = [];
  for (let i = 0; i <= numPoints; i++) {
    let lat = start.lat + (i / numPoints) * (end.lat - start.lat);
    let lon = start.lon + (i / numPoints) * (end.lon - start.lon);
    points.push({ lat, lon });
  }
  return points;
}


// FUNCTION: Count Crimes Near Route 
function countCrimesNearRoute(routePoints, maxDistance = 0.05) {
  let uniqueCrimes = new Map();
  let weightedScore = 0;
  const yearlyCrimeCounts = {};

  // Define Year Weighting (Recent Years Matter More)
  const currentYear = new Date().getFullYear();
  const yearWeights = {};
  for (let y = 2014; y <= currentYear; y++) {
    // Strong effect for 2023-24
    yearWeights[y] = y >= 2023 ? 1.0 : (y >= 2020 ? 0.4 : 0.1);
  }

  // Crime Severity Weights
  const severityWeights = {
    "Assault": 5,
    "Robbery": 4,
    "Break & Enter": 3,
    "Auto Theft": 2,
    "Theft Over": 1
  };

  for (const point of routePoints) {
    majorCrimesData.forEach(crime => {
      const distance = haversineDistance(point.lat, point.lon, crime.lat, crime.lon);
      if (distance <= maxDistance) {
        let crimeYear = parseInt(crime.date.split("-")[0]);
        let crimeKey = `${crime.lat},${crime.lon},${crime.category},${crimeYear}`;

        if (!uniqueCrimes.has(crimeKey)) {
          uniqueCrimes.set(crimeKey, true);

          let yearWeight = yearWeights[crimeYear] || 0.1;
          let severityWeight = severityWeights[crime.category] || 1;

          weightedScore += yearWeight * severityWeight;

          // Track yearly crime count for debugging
          yearlyCrimeCounts[crimeYear] = (yearlyCrimeCounts[crimeYear] || 0) + 1;
        }
      }
    });
  }

  // Debugging logs
  console.log("📊 Crime Count by Year:", yearlyCrimeCounts);
  console.log(`✅ Total Unique Crimes Near Route: ${uniqueCrimes.size} | Weighted Score: ${weightedScore}`);

  return { crimeCount: uniqueCrimes.size, weightedScore };
}




// FUNCTION: Calculate Distance Between Two Coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}



// FUNCTION: Calculate Safety Score 
function calculateSafetyScore(weightedScore, totalDistance) {
  if (weightedScore === 0) return 9.5; // Max safety if no crimes

  // Apply Distance Factor
  // Each km reduces safety score slightly
  let distancePenalty = totalDistance * 0.4;

  // Adjust Scaling (Logarithmic to prevent extreme drops)
  let normalizedScore = Math.max(2, 10 - Math.log10(1 + weightedScore) * 2.5 - distancePenalty);

  return parseFloat(normalizedScore.toFixed(1));
}
// Global variable to store the distance
let totalDistance = 0;

async function calculateRouteSafety() {
  if (majorCrimesData.length === 0) {
    console.log("⚠ Crime data is still loading... Please try again.");
    return;
  }

  const startAddress = document.getElementById("start-location").value;
  const endAddress = document.getElementById("end-location").value;

  if (!startAddress || !endAddress) {
    console.log("⚠ Please enter both addresses.");
    return;
  }

  const start = await fetchCoordinates(startAddress);
  const destination = await fetchCoordinates(endAddress);

  if (!start || !destination) {
    console.log("⚠ Could not fetch coordinates.");
    return;
  }

  // Clear previous markers & routes
  svg.selectAll(".marker").remove();
  svg.selectAll(".route-line").remove();

  // Add Start & Destination Markers
  addLocationMarker(start, "blue");
  addLocationMarker(destination, "red");

  // Generate route points (straight line)
  const routePoints = interpolateStraightLine(start, destination);

  // Calculate Total Walking Distance
  totalDistance = 0;
  for (let i = 1; i < routePoints.length; i++) {
    totalDistance += haversineDistance(
      routePoints[i - 1].lat, routePoints[i - 1].lon,
      routePoints[i].lat, routePoints[i].lon
    );
  }

  console.log(`Total Walking Distance: ${totalDistance.toFixed(2)} km`);

  // Draw the route line
  drawRoute(start, destination);

  // Count crimes near route
  const { crimeCount, weightedScore } = countCrimesNearRoute(routePoints);

  // Compute Safety Score
  let safetyScore = calculateSafetyScore(weightedScore, totalDistance);

  // Determine risk level message
  let riskMessage;
  if (safetyScore >= 7) {
    riskMessage = "Judgement: Safe to walk";
  } else if (safetyScore >= 4) {
    riskMessage = "Judgement: Walk with caution";
  } else if (safetyScore >= 2) {
    riskMessage = "Judgement: Better to use a car, TTC or Uber instead";
  } else {
    riskMessage = "Judgement: Extremely dangerous, not recommended at all";
  }

  // Display Result
  document.getElementById("safety-score").innerHTML =
    `<strong>Safety Score: ${safetyScore.toFixed(1)} (Crimes Nearby in the Past: ${crimeCount})</strong><br>${riskMessage}`;

  console.log(`Crimes Near Route: ${crimeCount} | Distance: ${totalDistance.toFixed(2)} km | Safety Score: ${safetyScore}`);
}

