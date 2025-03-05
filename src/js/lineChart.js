// Each subproblem is divided as illustrated in the following flow chart: https://cnobre.github.io/W25-CSC316H/week-06/lab/assets/cs171-week-06-vis-object.png?raw=true

const TRANSITION_DURATION = 800;

// Date parser
let formatDate = d3.timeFormat("%Y");
let parseDate = d3.timeParse("%Y");

// !! Common to both line charts that we need from our storyboard, the maximum amount of colours needed is exactly 5.

// TODO: To allow reusability (Like for Hook), we can make the expected data type [{year: ..., nonyear attributes}] and make it plot the non-year attributes
// TODO: If the above is true then the constructor should have a parentElement for the filtering slider too, cuz we gotta insert that anyway for each visualization.
class LineChart {
  constructor(parentElement, data) {
    this.parentElement = parentElement;
    this.data = data;
    this.displayData = []; // Known as filtered data
    this.initVis();
  }

  /*
   * Initialize Visualization: Responsible for creating SVG element and other static components (e.g. axis, labels, ...)
   */
  initVis() {
    let vis = this;
    vis.margin = { top: 40, right: 150, bottom: 80, left: 150 };
    vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
    vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.svg
      .append("g")
      .attr("class", "x-axis axis")
      .attr("transform", "translate(0," + vis.height + ")");

    vis.svg.append("g").attr("class", "y-axis axis");

    // Initializer slider with our data range for years
    vis.slider = document.getElementById("slider");

    const yearExtent = d3.extent(vis.data, (d) => d.year);
    console.log(yearExtent);

    noUiSlider.create(slider, {
      start: [yearExtent[0], yearExtent[1]],
      connect: true,
      range: {
        min: yearExtent[0],
        max: yearExtent[1],
      },
      step: 1,
      tooltips: true, // Show what the current bounds are
      behaviour: "tap-drag", // Be allowed to drag the ends and also the middle, very convenient
      format: {
        to: (value) => Math.round(value),
        from: (value) => Math.round(value),
      },
    });

    // Event listener for slider when it is modified
    vis.slider.noUiSlider.on("update", function () {
      vis.wrangleData();
    });

    vis.wrangleData();
  }

  /*
   * Data Wrangling: For filter and aggregate the data
   */
  wrangleData() {
    let vis = this;

    // TODO: This probably has to be shifted - cuz we can't repeatedly wrangle the data. So probably shift it to init vis after commiting the draft.

    vis.x = d3.scaleTime().range([0, vis.width]);
    vis.y = d3.scaleLinear().range([vis.height, 0]);

    vis.xAxis = d3.axisBottom().scale(vis.x);
    vis.yAxis = d3.axisLeft().scale(vis.y);

    vis.xAxisGroup = vis.svg.append("g").attr("class", "x-axis axis").attr("transform", `translate(0, ${vis.height})`);
    vis.yAxisGroup = vis.svg.append("g").attr("class", "y-axis axis");

    // X-Axis Label
    vis.svg
      .append("text")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 40)
      .attr("text-anchor", "middle")
      .text("Years");

    // Y-Axis Label
    vis.svg
      .append("text")
      .attr("x", -vis.height / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .text("Number of Incidents");

    // We need to filter the data based on the slider bounds
    const sliderValues = slider.noUiSlider.get();
    const [minYear, maxYear] = sliderValues.map((v) => +v);
    vis.displayData = vis.data.filter((d) => d.year >= minYear && d.year <= maxYear);
    console.log(vis.displayData);

    vis.updateVis();
  }

  /**
   * Update Visualization: For mapping data to visual elements via the D3 update sequence.
   */
  updateVis() {
    let vis = this;

    vis.svg.select(".x-axis").transition().duration(TRANSITION_DURATION).call(vis.xAxis);
    vis.svg.select(".y-axis").transition().duration(TRANSITION_DURATION).call(vis.yAxis);

    // Next we need to create a line generator and draw a path
    const line = d3
      .line()
      .x((d) => vis.x(d.year))
      .y((d) => vis.y(d["Night"]))
      .curve(d3.curveLinear);

    // Select the existing path and bind the data
    // https://stackoverflow.com/questions/52028595/how-to-use-enter-data-join-for-d3-line-graphs
    let path = vis.svg
      .selectAll("path.line")
      .data([vis.displayData])
      .join(
        (enter) => enter.append("path").attr("class", "line"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("d", line); // and other attributes that change on enter/update here;

    // Update the existing path
    path.enter().append("path").attr("class", "line").merge(path).transition().duration(TRANSITION_DURATION).attr("d", line);

    // Bind data to circle points use YEAR as key
    // We also  animate the radius
    let circles = this.svg.selectAll("circle").data(vis.displayData, (d) => d.year);
    circles.exit().transition().duration(TRANSITION_DURATION).attr("r", 0).remove();
    circles
      .enter()
      .append("circle")
      .attr("r", 0)
      .merge(circles)
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("cx", (d) => vis.x(d.year))
      .attr("cy", (d) => vis.y(d["Night"]))
      .attr("r", 5)
      .attr("fill", "green")
      .attr("stroke", "black");
  }
}
