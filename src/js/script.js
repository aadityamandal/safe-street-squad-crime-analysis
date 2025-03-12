/* * * * * * * * * * * * * *
 *           MAIN           *
 * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let risingInsight1Chart;
let hookChart;

function updateAllVisualizations() {
  risingInsight1Chart.wrangleData();
  hookChart.wrangleData();
}

// load data using promises
let promises = [
  d3.csv("data/Shooting_Firearm_Discharges.csv"),

  // If you want to load another dataset just add a new entry here.
  d3.csv("data/Neighbourhood_Crime_Rates.csv"),
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
  const [shootingFireArmsData, neighbourhoodCrimeData] = allDataArray;
  initRisingInsight1Chart(shootingFireArmsData);
  initRisingInsight2Chart(neighbourhoodCrimeData);

  //   risingInsight1Chart = new StackedAreaChart("rising-insight-1-chart");
  initHookChart(neighbourhoodCrimeData);
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

  const colorScale = d3
    .scaleOrdinal()
    .domain(["ASSAULT", "ROBBERY", "THEFTOVER", "AUTOTHEFT", "BREAKENTER"])
    .range(["#3B9EF8", "#3BF848", "#FF4500", "#DFF213", "#EC1BEB"]);
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
