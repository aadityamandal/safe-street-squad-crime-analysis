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

  // For the Solution Vis
  d3.json("data/toronto_boundary.geojson"),
  d3.json("data/toronto_streets.geojson")
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

  // Add this new line to initialize the SafetyIndexMap
  safetyMap = new SafetyIndexMap("map-container");
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
  const colorScale = d3.scaleOrdinal().domain(["Morning", "Afternoon", "Evening", "Night"]).range(["#FFD700", "#FF8C00", "#FF4500", "#F6F2F7"]);
  risingInsight1Chart = new LineChart(`rising-insight-1-chart`, finalData, colorScale, "slider", d3.curveLinear, "category-filter-timeOfDay");
}

function initRisingInsight2Chart(data) {
  // Manually define a set of known urban neighborhoods
  const urbanHoods = new Set([
    "Downtown", "Yonge-Bay Corridor", "Bay-Cloverhill", "Church-Wellesley", "St Lawrence-East Bayfront-The Islands",
    "Harbourfront-CityPlace", "Wellington Place", "Fort York-Liberty Village", "West Queen West", "Annex", "University",
    "Palmerston-Little Italy", "Kensington-Chinatown", "Moss Park", "Regent Park", "North St.James Town",
    "Cabbagetown-South St.James Town", "Yonge-Eglinton", "Mount Pleasant East", "Rosedale-Moore Park", "Yonge-St.Clair"
  ]);

  let urbanCrimeData = { Assault: 0, Robbery: 0, "Break & Enter": 0, "Auto Theft": 0, Other: 0 };
  let suburbanCrimeData = { Assault: 0, Robbery: 0, "Break & Enter": 0, "Auto Theft": 0, Other: 0 };

  function safeParse(value) {
    return isNaN(+value) || !value ? 0 : +value;
  }

  data.forEach((d) => {
    const hoodName = d.NEIGHBOURHOOD_NAME;

    const target = urbanHoods.has(hoodName) ? urbanCrimeData : suburbanCrimeData;

    target.Assault += safeParse(d.ASSAULT_2024);
    target.Robbery += safeParse(d.ROBBERY_2024);
    target["Break & Enter"] += safeParse(d.BREAKENTER_2024);
    target["Auto Theft"] += safeParse(d.AUTOTHEFT_2024);
    target.Other += safeParse(d.THEFTOVER_2024) + safeParse(d.SHOOTING_2024);
  });

  console.log("Urban Crime Data:", urbanCrimeData);
  console.log("Suburban Crime Data:", suburbanCrimeData);

  new PieChart("urban-pie-chart", urbanCrimeData);
  new PieChart("suburban-pie-chart", suburbanCrimeData);
}

