// Each subproblem is divided as illustrated in the following flow chart: https://cnobre.github.io/W25-CSC316H/week-06/lab/assets/cs171-week-06-vis-object.png?raw=true
const TRANSITION_DURATION = 800;
let formatDate = d3.timeFormat("%Y"); // Convert date object to string representing the year
class LineChart {
  constructor(parentElement, data, colorScale, sliderID, curveType, includeCategoriesParentElement) {
    this.parentElement = parentElement;
    this.data = data;
    this.displayData = []; // Known as filtered data
    this.categories = Object.keys(this.data[0]).filter((key) => key !== "year");
    this.colorScale = colorScale;
    this.sliderID = sliderID;
    this.curveType = curveType;
    this.includeCategoriesParentElement = includeCategoriesParentElement;

    this.initVis();
  }

  /*
   * Initialize Visualization: Responsible for creating SVG element and other static components (e.g. axis, labels, ...)
   */
  initVis() {
    let vis = this;

    vis.margin = { top: 50, right: 180, bottom: 80, left: 150 };
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

    // Initialize axes and labels
    vis.x = d3.scaleTime().range([0, vis.width]); // We are using time-scale so the wrangle method will pre-process the years and convert them to date obj
    vis.y = d3.scaleLinear().range([vis.height, 0]);
    vis.xAxis = d3
      .axisBottom()
      .scale(vis.x)
      .ticks(d3.timeYear) // Automatically show one tick per year
      .tickFormat(d3.timeFormat("%Y")) // Format as year only
      .tickSize(6); // Optionally, adjust the tick size if needed

    vis.yAxis = d3.axisLeft().scale(vis.y);
    vis.xAxisGroup = vis.svg.append("g").attr("class", "x-axis axis").attr("transform", `translate(0, ${vis.height})`);
    vis.yAxisGroup = vis.svg.append("g").attr("class", "y-axis axis");

    // X-Axis Label
    vis.svg
      .append("text")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 40)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .text("Years");

    // Y-Axis Label
    vis.svg
      .append("text")
      .attr("x", -vis.height / 2)
      .attr("y", -55)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .style("fill", "white")
      .text("Number of Incidents");

    // Legend
    const legendWidth = 20;
    const legendHeight = 20;

    vis.legend = vis.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + (vis.width + 20) + ", 0)"); // Position it on the right side of the chart

    vis.legend
      .selectAll("rect")
      .data(vis.categories)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * (legendHeight + 5)) // Stacking vertically
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", (d, i) => vis.colorScale(i)); // Use the colorScale to assign colors

    vis.legend
      .selectAll("text")
      .data(vis.categories)
      .enter()
      .append("text")
      .attr("x", legendWidth + 5) // Position text to the right of the square
      .attr("y", (d, i) => i * (legendHeight + 5) + legendHeight / 2)
      .attr("dy", ".35em")
      .style("fill", "white")
      .text((d) => d); // Use the category name as the label

    // Initializer slider with our data range for years
    vis.slider = document.getElementById(vis.sliderID);

    const yearExtent = d3.extent(vis.data, (d) => d.year);
    console.log(yearExtent);

    noUiSlider.create(vis.slider, {
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

    vis.tooltip = d3.select("body").append("div").attr("class", "tooltip").attr("id", "LineChartTooltip");

    //  We'll need to re-filter data when our checkbox selection changes.
    document.getElementById(vis.includeCategoriesParentElement).addEventListener("change", () => {
      vis.wrangleData();
    });

    vis.wrangleData();
  }

  /*
   * Data Wrangling: For filter and aggregate the data
   */
  wrangleData() {
    let vis = this;

    // We need to filter the data based on the slider bounds
    // We also need to capture excluded categories from the checkbox group
    const sliderValues = vis.slider.noUiSlider.get();
    const [minYear, maxYear] = sliderValues.map((v) => +v);

    // Whatever is checked, just get the value of it.
    vis.displayCategories = Array.from(document.querySelectorAll(`#${vis.includeCategoriesParentElement} input:checked`)).map((checkbox) => checkbox.value);
    vis.excludedCategoriesArray = Array.from(document.querySelectorAll(`#${vis.includeCategoriesParentElement} input:not(:checked)`)).map(
      (checkbox) => checkbox.value
    );

    console.warn("Categories that got included in line chart are", vis.displayCategories);

    vis.displayData = vis.data
      .filter((d) => d.year >= minYear && d.year <= maxYear)
      .map((d) => {
        // Convert the year integer to a Date object representing January 1st of that year
        const dateObj = new Date(d.year, 0, 1);
        return { ...d, year: dateObj };
      });
    console.log(vis.displayData);

    vis.updateVis();
  }

  /**
   * Update Visualization: For mapping data to visual elements via the D3 update sequence.
   */
  updateVis() {
    let vis = this;

    // Update axis by calling the axis function
    vis.x.domain(d3.extent(vis.displayData, (d) => d.year));
    vis.y.domain([
      0,
      // Which category has the highest count as of now? Filter and find out.
      d3.max(vis.displayData, (d) => {
        return d3.max(vis.displayCategories, (category) => d[category]);
      }),
    ]);

    vis.y.range([this.height, 0]); // The range needs to map to our SVG height

    vis.svg.select(".x-axis").transition().duration(TRANSITION_DURATION).call(vis.xAxis);
    vis.svg.select(".y-axis").transition().duration(TRANSITION_DURATION).call(vis.yAxis);

    // Generate new data points for each category
    console.warn("THE DISPLAY CATEGORIES ARE ", vis.displayCategories, vis.categories);

    vis.displayCategories.forEach((category) => {
      // Next we need to create a line generator and draw a path
      const line = d3
        .line()
        .x((d) => vis.x(d.year))
        .y((d) => vis.y(d[category]))
        .curve(vis.curveType);

      // Select the existing path and bind the data
      // https://stackoverflow.com/questions/52028595/how-to-use-enter-data-join-for-d3-line-graphs
      let path = vis.svg
        .selectAll(`path.line-${category}`)
        .data([vis.displayData])
        .join(
          (enter) => enter.append("path").attr("class", `line-${category}`),
          (update) => update,
          (exit) => exit.remove()
        )
        .attr("stroke", this.colorScale(category))
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("d", line); // and other attributes that change on enter/update here;

      // Add or update circles at each data point
      let circles = vis.svg
        .selectAll(`circle.dot-${category}`)
        .data(vis.displayData)
        .join(
          // Enter - Create new circles and animate the radius from 0 to the desired value
          (enter) =>
            enter
              .append("circle")
              .attr("class", `dot-${category}`)
              .attr("r", 0)
              .attr("fill", this.colorScale(category))
              .style("opacity", 1)
              .attr("cx", (d) => vis.x(d.year))
              .attr("cy", (d) => vis.y(d[category]))
              .transition()
              .duration(TRANSITION_DURATION)
              .attr("r", 5)
              .style("opacity", 1)
              .attr("stroke", "black"),

          // Update
          // New circles are going to "Grow" into the canvas.
          (update) =>
            update
              .transition()
              .duration(TRANSITION_DURATION)
              .attr("cx", (d) => vis.x(d.year))
              .attr("cy", (d) => vis.y(d[category]))
              .attr("r", 5)
              .style("opacity", 1),

          // Exit
          // Circles are going to shrink to 0 before removal
          (exit) => exit.transition().duration(TRANSITION_DURATION).attr("cx", 0).attr("cy", 0).attr("r", 0).style("opacity", 0).remove()
        );

      // Apply handlers separately. We just increase circle radius slightly and show tooltip text.
      const originalColor = vis.colorScale(category);
      circles
        .on("mouseover", function (event, d) {
          d3.select(this).attr("fill", "white");
          d3.select(this).attr("stroke", originalColor);
          d3.select(this).attr("r", 7);

          // const toolTipText = `<strong>${category}</strong><br>Year: ${d3.timeFormat("%Y")(d.year)}<br>Incidents: ${d[category]}`;
          const toolTipText = `<div style="border: thin solid lightgray; border-radius: 5px; background: rgba(0, 0, 0, 0.7); padding: 20px; color: white;">
          <strong>${category}</strong><br>Year: ${d3.timeFormat("%Y")(d.year)}<br>Incidents: ${d[category]}                     
        </div>`;

          vis.tooltip
            .style("opacity", 1)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + "px")
            .html(toolTipText);
        })
        .on("mouseout", function (event, d) {
          d3.select(this).attr("r", 5);
          d3.select(this).attr("stroke", "black");
          d3.select(this).attr("fill", originalColor);

          vis.tooltip.style("opacity", 0).style("left", 0).style("top", 0).html(``);
        });
    });

    // Remove lines and circles for checked categories with transitions
    vis.excludedCategoriesArray.forEach((category) => {
      vis.svg.selectAll(`path.line-${category}`).transition().duration(500).style("opacity", 0).remove();
      vis.svg.selectAll(`circle.dot-${category}`).transition().duration(500).attr("r", 0).style("opacity", 0).remove();
    });
  }
}
