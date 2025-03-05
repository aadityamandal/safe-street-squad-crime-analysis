// function getRandomColor() {
//   return `#${Math.floor(Math.random() * 16777215)
//     .toString(16)
//     .padStart(6, "0")}`;
// }

// class StackedAreaChart {
//   constructor(parentElement, data) {
//     this.parentElement = parentElement;
//     this.data = data;
//     this.displayData = [];

//     let colors = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a"];
//     // grab all the keys from the key value pairs in data (filter out 'year' ) to get a list of categories
//     this.dataCategories = Object.keys(this.data[0]).filter((d) => d !== "OCC_YEAR");

//     // prepare colors for range
//     let colorArray = this.dataCategories.map((d, i) => {
//       return colors[i % 10];
//     });

//     this.colorScale = d3.scaleOrdinal().domain(this.dataCategories).range(colorArray);

//     this.initVis();
//   }

//   initVis() {
//     let vis = this;

//     vis.margin = { top: 40, right: 40, bottom: 60, left: 40 };

//     vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
//     vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

//     // SVG drawing area
//     vis.svg = d3
//       .select("#" + vis.parentElement)
//       .append("svg")
//       .attr("width", vis.width + vis.margin.left + vis.margin.right)
//       .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
//       .append("g")
//       .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

//     // Overlay with path clipping
//     // vis.svg
//     //   .append("defs")
//     //   .append("clipPath")
//     //   .attr("id", "clip")

//     //   .append("rect")
//     //   .attr("width", vis.width)
//     //   .attr("height", vis.height);

//     // Scales and axes
//     updateScalesAndAxes(vis);

//     vis.svg
//       .append("g")
//       .attr("class", "x-axis axis")
//       .attr("transform", "translate(0," + vis.height + ")");

//     vis.svg.append("g").attr("class", "y-axis axis");

//     updateStackedData(vis);

//     vis.tooltip = vis.svg
//       .append("text")
//       .attr("x", 5)
//       .attr("y", vis.margin.top - 30)
//       .attr("fill", "black")
//       .attr("font-size", "12px")
//       .attr("font-weight", "bold")
//       .text("");

//     vis.wrangleData();
//   }

//   /*
//    * Data wrangling
//    */
//   wrangleData() {
//     let vis = this;

//     updateScalesAndAxes(vis);
//     updateStackedData(vis);

//     vis.displayData = vis.stackedData;

//     // Update the visualization
//     vis.updateVis();
//   }

//   /*
//    * The drawing function - should use the D3 update sequence (enter, update, exit)
//    * Function parameters only needed if different kinds of updates are needed
//    */
//   updateVis() {
//     let vis = this;

//     // Update domain
//     // Get the maximum of the multi-dimensional array or in other words, get the highest peak of the uppermost layer
//     vis.y.domain([
//       0,
//       d3.max(vis.displayData, function (d) {
//         return d3.max(d, function (e) {
//           return e[1];
//         });
//       }),
//     ]);

//     // Draw the layers
//     let categories = vis.svg.selectAll(".area").data(vis.displayData);

//     categories
//       .enter()
//       .append("path")
//       .attr("class", "area")
//       .merge(categories)
//       .style("fill", (d) => {
//         return vis.colorScale(d);
//       })
//       .attr("d", (d) => vis.area(d));
//     //   .on("mouseover", function (event, d) {
//     //     // FINISHED (Activity IV): update tooltip text on hover
//     //     vis.tooltip.text(d.key);
//     //   })
//     //   .on("mouseout", function () {
//     //     vis.tooltip.text("");
//     //   });

//     categories.exit().remove();

//     // Call axis functions with the new domain
//     vis.svg.select(".x-axis").call(vis.xAxis);
//     vis.svg.select(".y-axis").call(vis.yAxis);
//   }
// }

// // Helper functions that are reused across vis init and data wrangle function

// function updateScalesAndAxes(vis) {
//   vis.x = d3
//     .scaleTime()
//     .range([0, vis.width])
//     .domain(d3.extent(vis.data, (d) => d.OCC_YEAR));
//   vis.y = d3.scaleLinear().range([vis.height, 0]);
//   vis.xAxis = d3.axisBottom().scale(vis.x).tickFormat(d3.format("d"));
//   vis.yAxis = d3.axisLeft().scale(vis.y);
// }

// function updateStackedData(vis) {
//   let stack = d3.stack().keys(vis.dataCategories);
//   vis.stackedData = stack(vis.data);
//   vis.area = d3
//     .area()
//     .curve(d3.curveCardinal)
//     .x((d) => vis.x(d.data.OCC_YEAR))
//     .y0((d) => vis.y(d[0]))
//     .y1((d) => vis.y(d[1]));
// }
