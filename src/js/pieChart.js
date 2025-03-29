class PieChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;

        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set dimensions and radius
        vis.width = 400;
        vis.height = 400;
        vis.radius = Math.min(vis.width, vis.height) / 2;

        // Create SVG container
        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .append("g")
            .attr("transform", `translate(${vis.width / 2}, ${vis.height / 2})`);

        // Define color scale
        vis.color = d3.scaleOrdinal()
            .domain(["Assault", "Robbery", "Break & Enter", "Auto Theft", "Other"])
            .range(["#1f77b4", "#2ca02c", "#9467bd", "#ff7f00", "#d62728"]);

        // Define pie layout
        vis.pie = d3.pie().value(d => d.value);
        vis.arc = d3.arc().innerRadius(0).outerRadius(vis.radius);

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // Convert data into required format
        vis.displayData = Object.keys(vis.data).map(key => ({
            category: key,
            value: vis.data[key]
        }));

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
    
        // Compute total sum of values for percentages
        let total = d3.sum(vis.displayData, d => d.value);
    
        // Bind data
        let pieSlices = vis.svg.selectAll(".arc")
            .data(vis.pie(vis.displayData));
    
        // Remove old elements
        pieSlices.exit().remove();
    
        // Enter selection
        pieSlices.enter()
            .append("path")
            .attr("class", "arc")
            .merge(pieSlices) // Merge enter + update selections
            .attr("d", vis.arc)
            .attr("fill", d => vis.color(d.data.category))
            .attr("stroke", "#fff")
            .style("stroke-width", "2px");
    
        // Remove old labels
        vis.svg.selectAll(".label").remove();
    
        // Add text labels outside with percentage values
        vis.svg.selectAll(".label")
            .data(vis.pie(vis.displayData))
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("transform", d => `translate(${vis.arc.centroid(d)[0] * 1.5}, ${vis.arc.centroid(d)[1] * 1.5})`)
            .attr("text-anchor", "middle")
            .style("fill", "black")
            .style("font-size", "12px")
            .text(d => `${d.data.category}: ${(d.data.value / total * 100).toFixed(1)}%`);
    }
    
    
}
