class SafetyIndexMap {
  constructor(parentElement) {
    this.parentElement = parentElement;
    this.majorCrimesData = []; // Initialize as an empty array for the crime data
    this.routeLine = null; // Reference for the route line
    this.totalDistance = 0; // Store the distance
    this.start = null; // Store start coordinates
    this.destination = null; // Store destination coordinates
    this.routePoints = []; // Store route points
    this.crimeAnalysisResult = null; // Store crime analysis results
    
    // Load crime data when initialized
    this.loadCrimeData();
    this.initVis();
  }

  initVis() {
    let vis = this;
    
    // Define Map Dimensions
    vis.width = 800;
    vis.height = 500;
    
    // Create SVG Map Container
    vis.svg = d3.select("#map-svg")
      .attr("width", vis.width)
      .attr("height", vis.height);
    
    vis.g = vis.svg.append("g");
    
    // Define Projection (Centered on Toronto)
    vis.projection = d3.geoMercator()
      .center([-79.3832, 43.7]) // Centered on Toronto
      .scale(70000) // Adjusted for proper zoom
      .translate([vis.width / 2, vis.height / 2]);
    
    // Setup visualization components and handlers
    this.setupMapComponents();
    this.setupEventListeners();
  }
  
  async wrangleData() {
    let vis = this;
    
    // Check if crime data is loaded
    if (vis.majorCrimesData.length === 0) {
      console.log("Crime data is still loading... Please try again.");
      return;
    }
    
    // Get addresses from input fields
    const startAddress = document.getElementById("start-location").value;
    const endAddress = document.getElementById("end-location").value;
    
    if (!startAddress || !endAddress) {
      console.log("Please enter both addresses.");
      document.getElementById("safety-score").innerHTML =
        `<strong>Please enter both a starting location and a destination.</strong><br>Use the input boxes above to check route safety.`;
      return;
    }
    
    // Fetch coordinates for the addresses
    vis.start = await vis.fetchCoordinates(startAddress);
    vis.destination = await vis.fetchCoordinates(endAddress);
    
    if (!vis.start || !vis.destination) {
      console.log("Could not fetch coordinates.");
      return;
    }
    
    // Generate route points (straight line)
    vis.routePoints = vis.interpolateStraightLine(vis.start, vis.destination);
    
    // Calculate Total Walking Distance
    vis.totalDistance = 0;
    for (let i = 1; i < vis.routePoints.length; i++) {
      vis.totalDistance += vis.haversineDistance(
        vis.routePoints[i - 1].lat, vis.routePoints[i - 1].lon,
        vis.routePoints[i].lat, vis.routePoints[i].lon
      );
    }
    
    console.log(`Total Walking Distance: ${vis.totalDistance.toFixed(2)} km`);
    
    // Count crimes near route
    vis.crimeAnalysisResult = vis.countCrimesNearRoute(vis.routePoints);
    
    // Compute Safety Score
    vis.safetyScore = vis.calculateSafetyScore(
      vis.crimeAnalysisResult.weightedScore, 
      vis.totalDistance
    );
    
    // Now update the visualization
    vis.updateVis();
  }
  
  updateVis() {
    let vis = this;
    if (!vis.start || !vis.destination) return;
    vis.svg.selectAll(".marker").remove();
    vis.svg.selectAll(".route-line").remove();
    vis.svg.selectAll(".crime-pin").remove();

    vis.addLocationMarker(vis.start, "blue");
    vis.addLocationMarker(vis.destination, "red");
    vis.drawRoute();

    const nearbyCrimes = vis.getCrimesNearRoute(vis.start, vis.destination);
    vis.g.selectAll(".crime-pin")
      .data(nearbyCrimes)
      .enter()
      .append("circle")
      .attr("class", "crime-pin")
      .attr("cx", d => vis.projection([d.lon, d.lat])[0])
      .attr("cy", d => vis.projection([d.lon, d.lat])[1])
      .attr("r", 1.2)
      .attr("fill", "#d62728")
      .attr("opacity", 0.7);

    vis.svg.call(
      d3.zoom()
        .scaleExtent([1, 20])
        .on("zoom", (event) => {
          const zoomLevel = event.transform.k;
          vis.g.attr("transform", event.transform);
          vis.g.selectAll(".crime-pin")
            .attr("r", Math.max(0.3, 1.2 / zoomLevel))
            .attr("opacity", zoomLevel < 5 ? 0 : 0.7);
          vis.g.selectAll(".marker")
            .attr("r", Math.max(2, 8 / zoomLevel));
          vis.g.selectAll(".route-line")
            .attr("stroke-width", Math.max(0.5, 2 / zoomLevel))
            .attr("stroke-dasharray", `${4 / zoomLevel},${4 / zoomLevel}`);
        })
    );

    let riskMessage;
    if (vis.safetyScore >= 7) riskMessage = "Judgement: Safe to walk";
    else if (vis.safetyScore >= 4) riskMessage = "Judgement: Walk with caution";
    else if (vis.safetyScore >= 2) riskMessage = "Judgement: Better to use a car, TTC or Uber instead";
    else riskMessage = "Judgement: Extremely dangerous, not recommended at all";

    if (vis.totalDistance > 5) {
      riskMessage += ". Are you really planning on walking that far?";
    }

    document.getElementById("safety-score").innerHTML =
      `<strong>Safety Score: ${vis.safetyScore.toFixed(1)} (Crimes Nearby in the Past: ${vis.crimeAnalysisResult.crimeCount})</strong><br>${riskMessage}`;
  }


  // calculateBearing(lat1, lon1, lat2, lon2) {
  //   const toRadians = deg => deg * Math.PI / 180;
  //   const dLon = toRadians(lon2 - lon1);
  //   const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  //   const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
  //             Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  //   const bearing = Math.atan2(y, x) * 180 / Math.PI;
  //   return (bearing + 360) % 360; // Normalize to 0–360°
  // }

  
  getCrimesNearRoute(start, end) {
    const vis = this;
    const crimes = [];
    const seen = new Set();

    const padding = 0.0008; // roughly 90m in lat/lon

    const minLat = Math.min(start.lat, end.lat) - padding;
    const maxLat = Math.max(start.lat, end.lat) + padding;
    const minLon = Math.min(start.lon, end.lon) - padding;
    const maxLon = Math.max(start.lon, end.lon) + padding;

    vis.majorCrimesData.forEach(crime => {
      const key = `${crime.lat},${crime.lon},${crime.category},${crime.date}`;
      if (!seen.has(key)) {
        if (crime.lat >= minLat && crime.lat <= maxLat &&
            crime.lon >= minLon && crime.lon <= maxLon) {
          seen.add(key);
          crimes.push(crime);
        }
      }
    });

    return crimes;
  }

  
  setupMapComponents() {
    let vis = this;
    
    // Load Toronto GeoJSON Boundaries
    d3.json("data/toronto_boundary.geojson").then(boundaryData => {
      vis.g.selectAll("path")
        .data(boundaryData.features)
        .enter()
        .append("path")
        .attr("d", d3.geoPath().projection(vis.projection))
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#888");
    
      // Add Neighborhood Labels (Initially Hidden)
      const labels = vis.g.selectAll(".neighborhood-label")
        .data(boundaryData.features)
        .enter()
        .append("text")
        .attr("class", "neighborhood-label")
        .attr("transform", d => {
          const centroid = d3.geoPath().projection(vis.projection).centroid(d);
          return `translate(${centroid})`;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .attr("opacity", "0")
        .text(d => d.properties.AREA_NAME);
    
      // Attach Zoom Listener
      const zoom = d3.zoom()
        .scaleExtent([1, 20])
        .on("zoom", (event) => {
          const zoomLevel = event.transform.k;
          vis.g.attr("transform", event.transform);
    
          const safeDistance = vis.totalDistance || 0.1;  // Default to 0.1 km if undefined
    
          // Dynamically adjust marker size based on zoom and route length
          const minSize = safeDistance < 0.5 ? 1 : 2;  // Super small for very short distances
          const maxSize = safeDistance < 0.5 ? 3 : 6;  // Keeps it tiny when zoomed in
    
          // Scale Markers Properly (Now Smaller at Street Level)
          vis.g.selectAll(".marker")
            .attr("r", Math.max(minSize, maxSize / zoomLevel));
    
          // Scale Route Line Width (Much Thinner at High Zoom)
          vis.g.selectAll(".route-line")
            .attr("stroke-width", Math.max(0.3, 1.5 / zoomLevel))
            .attr("stroke-dasharray", `${2 / zoomLevel},${2 / zoomLevel}`);
        });
    
      vis.svg.call(zoom);
    });
    
    // Load & Filter Toronto Streets GeoJSON (Only Secondary & Primary Links)
    d3.json("data/toronto_streets.geojson").then(streetData => {
      // Filter only "secondary" and "primary_link" and residential roads
      const majorRoads = streetData.features.filter(d => {
        const roadClass = d.properties.highway; // Make sure "highway" is the correct key
        return roadClass && ["secondary", "primary_link", "residential"].includes(roadClass.toLowerCase());
      });
    
      // Append only the filtered roads
      vis.g.selectAll(".street")
        .data(majorRoads)
        .enter()
        .append("path")
        .attr("class", "street")
        .attr("d", d3.geoPath().projection(vis.projection))
        .attr("fill", "none")
        .attr("stroke", "#aaa")  // Light gray for visibility
        .attr("stroke-width", 0.6)  // Slightly thicker for clarity
        .attr("opacity", 0.7);  // Visible by default
      });
    }
  
  setupEventListeners() {
    let vis = this;
    let debounceTimer;
    
    function debounce(func, delay) {
      return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(vis, args), delay);
      };
    }
    
    const startInput = document.getElementById("start-location");
    const endInput = document.getElementById("end-location");
    
    if (startInput) {
      startInput.addEventListener("input", (event) => {
        debounce(vis.fetchPlaceSuggestions, 300)(event.target);
      });
    }
    
    if (endInput) {
      endInput.addEventListener("input", (event) => {
        debounce(vis.fetchPlaceSuggestions, 300)(event.target);
      });
    }
    
    // Add event listener for the safety check button
    const safetyCheckButton = document.querySelector(".btn-primary[id='safety-check-btn']") || 
                              document.querySelector(".btn-primary.w-100.fw-bold.mb-3");
                              
    if (safetyCheckButton) {
      // Remove the inline onclick attribute if it exists
      if (safetyCheckButton.hasAttribute("onclick")) {
        safetyCheckButton.removeAttribute("onclick");
      }
      
      // Add the event listener
      safetyCheckButton.addEventListener("click", async () => {
        const loadingDiv = document.getElementById("loading-indicator");
        loadingDiv.style.display = "block"; // Show "Calculating..." message
        safetyCheckButton.disabled = true;
        await vis.wrangleData();
        safetyCheckButton.disabled = false;
        loadingDiv.style.display = "none";  // Hide it once done
      });
    }
  }
  
  async loadCrimeData() {
    try {
      const response = await fetch("data/Major_Crime_Indicators_FULL.csv");
      const csvText = await response.text();
    
      this.majorCrimesData = d3.csvParse(csvText, d => ({
        lat: parseFloat(d.LAT_WGS84),
        lon: parseFloat(d.LONG_WGS84),
        category: d.MCI_CATEGORY,
        offence: d.OFFENCE,
        date: d.OCC_DATE
      }));
    
      console.log("Major Crimes Data Loaded:", this.majorCrimesData.length);
    
    } catch (error) {
      console.error("Error loading crime data:", error);
    }
  }
  
  async fetchPlaceSuggestions(inputElement) {
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
      this.displaySuggestions(data, inputElement);
    } catch (error) {
      console.error("Error fetching places:", error);
    }
  }
  
  // Function to display lightweight suggestions
  displaySuggestions(suggestions, inputElement) {
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
        div.onclick = () => {
          inputElement.value = place.display_name;
          suggestionBox.innerHTML = "";
        };
        suggestionBox.appendChild(div);
      });
    
    // Hide dropdown if no valid results
    suggestionBox.style.display = suggestionBox.innerHTML ? "block" : "none";
  }
  
  // Fetch latitude & longitude for an address
  async fetchCoordinates(address) {
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
  
  // Interpolate route points
  interpolateStraightLine(start, end, numPoints = 20) {
    let points = [];
    for (let i = 0; i <= numPoints; i++) {
      let lat = start.lat + (i / numPoints) * (end.lat - start.lat);
      let lon = start.lon + (i / numPoints) * (end.lon - start.lon);
      points.push({ lat, lon });
    }
    return points;
  }
  
  // Count Crimes Near Route 
  countCrimesNearRoute(routePoints, maxDistance = 0.05) {
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
      this.majorCrimesData.forEach(crime => {
        const distance = this.haversineDistance(point.lat, point.lon, crime.lat, crime.lon);
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
    console.log("Crime Count by Year:", yearlyCrimeCounts);
    console.log(`Total Unique Crimes Near Route: ${uniqueCrimes.size} | Weighted Score: ${weightedScore}`);
    
    return { crimeCount: uniqueCrimes.size, weightedScore };
  }
  
  // Calculate Distance Between Two Coordinates
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
  
  // Calculate Safety Score 
  calculateSafetyScore(weightedScore, totalDistance) {
    if (weightedScore === 0) return 9.5; // Max safety if no crimes
    
    // Apply Distance Factor
    // Each km reduces safety score slightly
    let distancePenalty = totalDistance * 0.4;
    
    // Adjust Scaling (Logarithmic to prevent extreme drops)
    let normalizedScore = Math.max(2, 10 - Math.log10(1 + weightedScore) * 2.5 - distancePenalty);
    
    return parseFloat(normalizedScore.toFixed(1));
  }
  
  
  addLocationMarker(coords, color) {
    return this.g.append("circle")
      .attr("class", "marker")
      .attr("cx", this.projection([coords.lon, coords.lat])[0])
      .attr("cy", this.projection([coords.lon, coords.lat])[1])
      .attr("r", 8)
      .style("fill", color)
      .style("stroke", "#000")
      .style("stroke-width", 1);
  }
  
  drawRoute() {
    if (this.routeLine) this.routeLine.remove();
    
    this.routeLine = this.g.append("path")
      .datum([this.start, this.destination])
      .attr("class", "route-line")
      .attr("d", d3.line()
        .x(d => this.projection([d.lon, d.lat])[0])
        .y(d => this.projection([d.lon, d.lat])[1])
      )
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");
    
    console.log("Route drawn between:", this.start, this.destination);
  }
}

