/* * * * * * * * * * * * * *
 *  Rising Insight 2 Map   *
 * * * * * * * * * * * * * */

class RS2Map {
    constructor(parentElement, geoData, crimeData) {
        this.parentElement = parentElement;
        this.geoData = geoData;
        this.crimeData = crimeData;
        this.displayData = [];
        this.activeCrimes = new Set(["Assault", "Robbery", "Auto Theft", "Theft Over", "Break and Enter"]);

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // Append SVG drawing area
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        // Add title
        vis.svg.append("text")
            .attr("class", "map-title")
            .attr("x", vis.width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("Toronto Crime Map by MCI Category");

        // Projection and path generator
        vis.projection = d3.geoMercator()
            .fitSize([vis.width, vis.height], vis.geoData);
        vis.pathGenerator = d3.geoPath().projection(vis.projection);

        // Draw the map of Toronto and its neighborhoods
        vis.svg.selectAll(".neighborhood")
            .data(vis.geoData.features)
            .enter()
            .append("path")
            .attr("class", "neighborhood")
            .attr("d", vis.pathGenerator)
            .attr("fill", "#f0f0f0")
            .attr("stroke", "#ccc");

        // Color scale
        vis.colorScale = d3.scaleOrdinal()
            .domain(["Assault", "Robbery", "Auto Theft", "Theft Over", "Break and Enter"])
            .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]);

        // Tooltip
        // vis.tooltip = d3.select("body").append("div")
        //     .attr("class", "tooltip")
        //     .attr("id", "crimeTooltip")
        //     .style("opacity", 0);

        // Call wrangleData to process data
        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // Filter crime data based on selections chosen on the filter.
        vis.displayData = vis.crimeData.filter(d => vis.activeCrimes.has(d.MCI_CATEGORY));

        console.log("Filtered crime data:", vis.displayData);

        // Update the visualization
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Bind data
        let circles = vis.svg.selectAll(".crime-circle")
            .data(vis.displayData, d => d.EVENT_UNIQUE_ID);

        // Draw the circles onto the map.
        circles.enter()
            .append("circle")
            .attr("class", "crime-circle")
            .attr("cx", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[0])
            .attr("cy", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[1])
            .attr("r", 3)
            .attr("fill", d => vis.colorScale(d.MCI_CATEGORY));
            // .on("mouseover", function (event, d) {
            //     vis.tooltip.style("opacity", 1)
            //         .html(`
            //             <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 10px">
            //                 <h5>${d.MCI_CATEGORY}</h5>
            //                 <p>Date: ${d.OCC_DATE}</p>
            //                 <p>Location: ${d.PREMISES_TYPE}</p>
            //             </div>
            //         `)
            //         .style("left", (event.pageX + 10) + "px")
            //         .style("top", (event.pageY - 10) + "px");
            // })
            // .on("mouseout", function () {
            //     vis.tooltip.style("opacity", 0);
            // });

        // Updating circles
        circles.transition().duration(400)
            .attr("cx", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[0])
            .attr("cy", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[1])
            .attr("fill", d => vis.colorScale(d.MCI_CATEGORY));

        // Removes unnecessary circles
        circles.exit().remove();
    }

    // Removed something here. I have it saved though.
}