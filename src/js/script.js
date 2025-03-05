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
  //   risingInsight1Chart = new StackedAreaChart(`rising-insight-1-chart`, finalData);
  const colorScale = d3.scaleOrdinal().domain(["Morning", "Afternoon", "Evening", "Night"]).range(["#FFD700", "#FF8C00", "#FF4500", "#00008B"]);
  risingInsight1Chart = new LineChart(`rising-insight-1-chart`, finalData, colorScale);
}
