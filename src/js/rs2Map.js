// /* * * * * * * * * * * * * *
//  *  Rising Insight 2 Map   *
//  * * * * * * * * * * * * * */

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

        // Main SVG container
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Add zoom behavior
        vis.zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on("zoom", (event) => {
                vis.zoomGroup.attr("transform", event.transform);

                // Make crime circles smaller when zooming in
                vis.zoomGroup.selectAll(".crime-circle")
                    .attr("r", 3 / event.transform.k); // scale down radius by zoom level
            });


        vis.svg.call(vis.zoom);

        // Group that will be zoomed
        vis.zoomGroup = vis.svg.append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        // Add title (keep it fixed, not zoomable)
        vis.svg.append("text")
            .attr("class", "map-title")
            .attr("x", vis.width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("Toronto Crime Map by MCI Category");

        // Projection and path generator
        vis.projection = d3.geoMercator().fitSize([vis.width, vis.height], vis.geoData);
        vis.pathGenerator = d3.geoPath().projection(vis.projection);

        // Draw Toronto neighborhoods on zoomGroup
        vis.zoomGroup.selectAll(".neighborhood")
            .data(vis.geoData.features)
            .enter()
            .append("path")
            .attr("class", "neighborhood")
            .attr("d", vis.pathGenerator)
            .attr("fill", "#f0f0f0")
            .attr("stroke", "#ccc");

        // Color scale
        vis.colorScale = d3.scaleOrdinal()
            .domain(["Assault", "Robbery", "Theft Over", "Auto Theft", "Break and Enter"])
            .range(["#1f77b4", "#2ca02c", "#d62728", "#ff7f0e", "#9467bd"]);

        vis.wrangleData();
    }


    wrangleData() {
        let vis = this;

        // The visualizatin should show all active crimes at first. Otherwise, filter based on the selected category.
        vis.displayData = vis.crimeData.filter(d => vis.activeCrimes.has(d.MCI_CATEGORY));

        // Call updateVis to update the visualization
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        let circles = vis.zoomGroup.selectAll(".crime-circle")
            .data(vis.displayData, d => d.EVENT_UNIQUE_ID);

        // Removes existing circles on the map before updating.
        circles.exit().remove();

        // Draws new circles for the crime locations.
        circles.enter()
            .append("circle")
            .attr("class", "crime-circle")
            .attr("cx", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[0])
            .attr("cy", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[1])
            .attr("r", 3)
            .attr("fill", d => vis.colorScale(d.MCI_CATEGORY));

        // Updating circles
        circles.transition().duration(400)
            .attr("cx", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[0])
            .attr("cy", d => vis.projection([d.LONG_WGS84, d.LAT_WGS84])[1])
            .attr("fill", d => vis.colorScale(d.MCI_CATEGORY));
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
            vis.displayData = vis.crimeData.filter(d => d.MCI_CATEGORY === selectedCrime);
        }

        // Update the visualization with the new selection
        vis.updateVis();
    }
}