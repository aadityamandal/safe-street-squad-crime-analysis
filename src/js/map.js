// Innovative View Boilerplate code
class safetyIndexMap {
  constructor(parentElement, data) {
    this.parentElement = parentElement;
    this.data = data;
    this.initVis();
  }

  initVis() {
    let vis = this;
    vis.margin = { top: 50, right: 150, bottom: 80, left: 150 };
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

    vis.wrangleData();
  }

  wrangleData() {
    let vis = this;

    // TODO: Add relevant wrangle data processing logic here

    vis.updateVis();
  }

  updateVis() {
    let vis = this;
  }
}


// IMPLEMENTATION FOR THE SOLUTION SECTION 
// THIS SECTION WAS IMPLEMENTED IN THE SCRIPT.JS FILE
// WILL BE MOVED HERE FOR THE FINAL SUBMISSION
// FOR THE MEANTIME - ACCIDENTAL ERROR, FUNCTIONS ARE IN SCRIPT.JS