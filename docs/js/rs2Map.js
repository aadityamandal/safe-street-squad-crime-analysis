// /* * * * * * * * * * * * * *
//  *  Rising Insight 2 Map   *
//  * * * * * * * * * * * * * */

class RS2Map {
  constructor(parentElement, geoData, crimeData) {
    this.parentElement = parentElement;
    this.geoData = geoData;
    this.crimeData = crimeData;
    this.displayData = [];
    this.activeCrimes = new Set(["Assault"]);
    // this.activeCrimes = new Set(["Assault", "Robbery", "Auto Theft", "Theft Over", "Break and Enter"]);

    this.initVis();
  }

  // Helper function to offload bulk processing
  precomputeCrimeCounts() {
    let vis = this;
    vis.crimeCountByHood = {}; // Reset cache

    vis.crimeData.forEach((crime) => {
      let hood = crime.HOOD_140;
      let category = crime.MCI_CATEGORY;
      let neighbourhood = crime.NEIGHBOURHOOD_140;

      // Make sure there is actually an object to store our running data
      if (!vis.crimeCountByHood[hood]) {
        vis.crimeCountByHood[hood] = {};
        vis.crimeCountByHood[hood]["name"] = neighbourhood.replace(/\(.*?\)/, "").trim(); // gets rid of the ()
      }

      vis.crimeCountByHood[hood][category] = (vis.crimeCountByHood[hood][category] || 0) + 1;
      // We do this regardless to keep track of the total number of crimes in each neighborhood across all categories
      vis.crimeCountByHood[hood]["All MCI Categories"] = (vis.crimeCountByHood[hood]["All MCI Categories"] || 0) + 1;
    });

    console.warn("Crime count by hood", vis.crimeCountByHood);
  }

  initVis() {
    let vis = this;

    vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
    vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

    vis.svg = d3
      .select(`#${vis.parentElement}`)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

    vis.zoomGroup = vis.svg.append("g").attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

    // Add explicit sub-layers for rendering order
    vis.neighborhoodLayer = vis.zoomGroup.append("g").attr("class", "neighborhood-layer");
    vis.streetLayer = vis.zoomGroup.append("g").attr("class", "street-layer");
    vis.pointsLayer = vis.zoomGroup.append("g").attr("class", "points-layer"); // crime circles on top

    vis.titleGroup = vis.svg.append("g").attr("class", "title-group");
    vis.titleText = vis.titleGroup
      .append("text")
      .attr("class", "map-title")
      .attr("x", vis.width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#f0f0f0")
      .attr("font-weight", "bold")
      .text("Toronto Crime Map by MCI Category");

    // Get the bounding box of the text to calculate its size
    vis.textBBox = vis.titleText.node().getBBox();
    vis.titleGroup
      .insert("rect", "text")
      .attr("x", vis.textBBox.x - 10)
      .attr("y", vis.textBBox.y - 5)
      .attr("width", vis.textBBox.width + 20)
      .attr("height", vis.textBBox.height + 10)
      .attr("fill", "black")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("stroke", "#333333")
      .attr("stroke-width", 3);

    // To save time
    vis.precomputeCrimeCounts();

    vis.projection = d3.geoMercator().fitSize([vis.width, vis.height], vis.geoData);
    vis.pathGenerator = d3.geoPath().projection(vis.projection);

    // Add zoom behavior
    vis.zoom = d3
      .zoom()
      .scaleExtent([1, 10])
      .on("zoom", (event) => {
        vis.zoomGroup.attr("transform", event.transform);
        vis.zoomGroup.selectAll(".crime-circle").attr("r", 3 / event.transform.k); // resize points when zooming
      });

    vis.svg.call(vis.zoom);

    // Draw neighborhoods
    vis.neighborhoodLayer
      .selectAll(".neighborhood")
      .data(vis.geoData.features)
      .enter()
      .append("path")
      .attr("class", "neighborhood")
      .attr("d", vis.pathGenerator)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#2f4f4f")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "rgba(255, 255, 0, 0.4)").attr("stroke", "red").attr("stroke-width", 2);

        // We need to look up the crime count for the hovered neighborhood
        const areaCode = d.properties.AREA_S_CD;
        const crimeToFilterBy = document.querySelector(".form-select").value;
        console.warn("Area code and filter is ", areaCode, crimeToFilterBy);
        const crimeCount = vis.crimeCountByHood[areaCode][crimeToFilterBy] || 0;
        const neighborhoodName = vis.crimeCountByHood[areaCode]["name"];

        vis.titleText.text(`Toronto Crime Map by MCI Category: ${crimeCount} crimes in ${neighborhoodName}`);

        // update bounding box
        vis.updateMCICategoryTitleSize();

        // So that the highlight is more obvious, we can dim the other circles in the vicinity
        vis.pointsLayer
          .selectAll(".crime-circle")
          .filter((circleData) => circleData.HOOD_158 === areaCode)
          .transition()
          .attr("opacity", 0);

        vis.zoomGroup
          .selectAll(".crime-circle")
          .filter((circleData) => circleData.HOOD_158 === areaCode)
          .transition()
          .attr("opacity", 0);
      })
      .on("mousemove", function (event) {})
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", "#f0f0f0").attr("stroke", "#2f4f4f").attr("stroke-width", 1);
        const areaCode = d.properties.AREA_S_CD;
        vis.pointsLayer
          .selectAll(".crime-circle")
          .filter((circleData) => circleData.HOOD_158 === areaCode)
          .attr("opacity", 0.5);

        vis.zoomGroup
          .selectAll(".crime-circle")
          .filter((circleData) => circleData.HOOD_158 === areaCode)
          .transition()
          .attr("opacity", 0.5);

        vis.titleText.text(`Toronto Crime Map by MCI Category`);

        // update bounding box
        vis.updateMCICategoryTitleSize();
      });

    // Load & draw streets
    d3.json("data/toronto_streets.geojson").then((streetData) => {
      const filtered = streetData.features.filter((d) => {
        const roadType = d.properties.highway;
        return roadType && ["residential", "primary", "secondary", "tertiary", "primary_link"].includes(roadType.toLowerCase());
      });

      vis.streetLayer
        .selectAll(".street-line")
        .data(filtered)
        .enter()
        .append("path")
        .attr("class", "street-line")
        .attr("d", vis.pathGenerator)
        .attr("stroke", "#999")
        .attr("stroke-width", 0.4)
        .attr("fill", "none")
        .attr("opacity", 0.8)
        .style("pointer-events", "none");
    });

    vis.colorScale = d3
      .scaleOrdinal()
      .domain(["Assault", "Robbery", "Theft Over", "Auto Theft", "Break and Enter"])
      .range(["#1f77b4", "#2ca02c", "#d62728", "#ff7f0e", "#9467bd"]);

    vis.legendGroup = vis.svg
      .append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${vis.width - 180}, ${vis.margin.top + 20})`);
    // Creating the background rectangle behind the legend
    vis.legendGroup.append("rect").attr("x", 20).attr("y", -30).attr("width", 175).attr("height", 190).attr("fill", "#333").attr("rx", 10).attr("ry", 10);

    // Creating the legend for the MCI crime categories
    let rs2Legend = [
      { label: "Assault", color: "#1f77b4" },
      { label: "Robbery", color: "#2ca02c" },
      { label: "Break and Enter", color: "#9467bd" },
      { label: "Theft Over", color: "#d62728" },
      { label: "Auto Theft", color: "#ff7f0e" },
    ];

    // Legend title
    vis.legendGroup.append("text").attr("x", 40).attr("y", 0).attr("font-weight", "bold").attr("fill", "#f0f0f0").text("Crime Category");

    let rs2LegendItem = vis.legendGroup
      .selectAll(".rs2-legend-item")
      .data(rs2Legend)
      .enter()
      .append("g")
      .attr("class", "rs2-legend-item")
      .attr("transform", (d, i) => `translate(0, ${20 + i * 20})`);

    // Legend rectangles
    rs2LegendItem
      .append("rect")
      .attr("x", 40)
      .attr("y", (d, i) => i * 5)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", (d) => d.color);

    // Text labels
    rs2LegendItem
      .append("text")
      .attr("x", 40 + 25)
      .attr("y", (d, i) => i * 5 + 15)
      .attr("font-size", "16px")
      .attr("fill", "#f0f0f0")
      .text((d) => d.label);

    vis.wrangleData();
  }

  wrangleData() {
    let vis = this;

    // The visualizatin should show all active crimes at first. Otherwise, filter based on the selected category.
    vis.displayData = vis.crimeData.filter((d) => vis.activeCrimes.has(d.MCI_CATEGORY));

    // Call updateVis to update the visualization
    vis.updateVis();
  }

  updateVis() {
    let vis = this;
    let circles = vis.pointsLayer.selectAll(".crime-circle").data(vis.displayData, (d) => d.EVENT_UNIQUE_ID);

    // Removes existing circles on the map before updating.
    vis.zoomGroup.selectAll(".crime-circle").remove();

    circles.exit().remove();

    // Draws new circles for the crime locations.
    circles
      .enter()
      .append("circle")
      .attr("class", "crime-circle")
      .attr("cx", (d) => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[0])
      .attr("cy", (d) => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[1])
      .attr("r", 2)
      .attr("fill", (d) => vis.colorScale(d.MCI_CATEGORY))
      .attr("opacity", 0.5)
      .style("pointer-events", "none");

    // Updating circles
    circles
      .transition()
      .duration(400)
      .attr("cx", (d) => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[0])
      .attr("cy", (d) => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[1])
      .attr("fill", (d) => vis.colorScale(d.MCI_CATEGORY))
      .attr("opacity", 0.5)
      .style("pointer-events", "none");

    // Removes existing circles on the map before updating.
    circles.exit().remove();
  }

  // Function to update crime filter based on selection
  updateCrimeFilter(selectedCrime) {
    let vis = this;

    // Removes all the circles markers before filtering
    vis.zoomGroup.selectAll(".crime-circle").remove();

    // Filters crime data based on the user's selection of crime category
    if (selectedCrime === "All MCI Categories") {
      vis.displayData = vis.crimeData;
    } else {
      vis.displayData = vis.crimeData.filter((d) => d.MCI_CATEGORY === selectedCrime);
    }

    // Update the visualization with the new selection
    vis.updateVis();
  }

  updateMCICategoryTitleSize() {
    let vis = this;
    vis.textBBox = vis.titleText.node().getBBox();
    vis.titleGroup
      .select("rect")
      .attr("x", vis.textBBox.x - 10)
      .attr("y", vis.textBBox.y - 5)
      .attr("width", vis.textBBox.width + 20)
      .attr("height", vis.textBBox.height + 10);
  }
}
