/* * * * * * * * * * * * * *
 *           MAIN           *
 * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let risingInsight1Chart;

function updateAllVisualizations() {
  risingInsight1Chart.wrangleData();
}

// load data using promises
let promises = [
  d3.csv("data/Shooting_Firearm_Discharges.csv"),
  // If you want to load another dataset just add a new entry here.
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
  const [shootingFireArmsData] = allDataArray;
  initRisingInsight1Chart(shootingFireArmsData);

  //   risingInsight1Chart = new StackedAreaChart("rising-insight-1-chart");
}

// Helper function to offload bulk processing
function initRisingInsight1Chart(data) {
  console.warn(data);

  const timeRanges = ["Morning"];
  console.log(data);

  // Preprocess data: aggregate by Year and Neighborhood
  const dataFilteredByTimeRange = data.filter((d) => d.OCC_TIME_RANGE === "Morning");

  // Step 1: Initialize neighborhoodCounts object
  let neighborhoodCounts = {};

  // Step 2: List all unique neighborhoods (this will be used to initialize all neighborhoods for every year)
  const allNeighborhoods = Array.from(new Set(dataFilteredByTimeRange.map((d) => d.NEIGHBOURHOOD_158)));

  // Step 3: Loop through the filtered data and count occurrences per neighborhood per year
  dataFilteredByTimeRange.forEach((d) => {
    const year = d.OCC_YEAR;
    const neighborhood = d.NEIGHBOURHOOD_158;

    // Initialize the year if it doesn't exist
    if (!neighborhoodCounts[year]) {
      neighborhoodCounts[year] = {};

      // Initialize all neighborhoods for the year with 0 counts
      allNeighborhoods.forEach((neighborhood) => {
        neighborhoodCounts[year][neighborhood] = 0;
      });
    }

    // Increment the count for the specific neighborhood in the given year
    neighborhoodCounts[year][neighborhood]++;
  });

  // Step 4: Generate final data structure
  let finalData = [];

  // Loop through the years and create the final data structure
  Object.keys(neighborhoodCounts).forEach((year) => {
    let yearData = { OCC_YEAR: year };

    // For each neighborhood, set the count for that year
    allNeighborhoods.forEach((neighborhood) => {
      yearData[neighborhood] = neighborhoodCounts[year][neighborhood]; // Count for this neighborhood in the year
    });

    finalData.push(yearData);
  });

  // Now, finalData will have the structure needed for stacking
  console.log(finalData);

  // Pass the processed data to the chart
  risingInsight1Chart = new StackedAreaChart(`rising-insight-1-chart`, finalData);
}
