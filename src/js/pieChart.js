class PieChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = 500;
        vis.height = 500;
        vis.radius = Math.min(vis.width, vis.height) / 2;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("viewBox", `0 0 ${vis.width} ${vis.height + 40}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("display", "block")
            .style("margin", "0 auto")
            .append("g")
            .attr("transform", `translate(${vis.width / 2}, ${vis.height / 2})`);

        vis.color = d3.scaleOrdinal()
            .domain(["Assault", "Robbery", "Break & Enter", "Auto Theft", "Other"])
            .range(["#1f77b4", "#2ca02c", "#9467bd", "#ff7f00", "#d62728"]);

        vis.pie = d3.pie().value(d => d.value);
        vis.arc = d3.arc().innerRadius(0).outerRadius(vis.radius);

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.displayData = Object.keys(vis.data).map(key => ({
            category: key,
            value: vis.data[key]
        }));

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        let total = d3.sum(vis.displayData, d => d.value);

        let pieSlices = vis.svg.selectAll(".arc")
            .data(vis.pie(vis.displayData));

        pieSlices.exit().remove();

        pieSlices.enter()
            .append("path")
            .attr("class", "arc")
            .merge(pieSlices)
            .attr("d", vis.arc)
            .attr("fill", d => vis.color(d.data.category))
            .attr("stroke", "#fff")
            .style("stroke-width", "2px");

        vis.svg.selectAll(".label").remove();

        vis.svg.selectAll(".label")
            .data(vis.pie(vis.displayData))
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("transform", d => `translate(${vis.arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", "14px")
            .text(d => {
                const percentage = (d.data.value / total) * 100;
                return percentage >= 10
                    ? `${d.data.category}\n${percentage.toFixed(1)}%`
                    : `${percentage.toFixed(1)}%`;
            })
            .call(text => {
                text.each(function (d) {
                    const percentage = (d.data.value / total) * 100;
                    const el = d3.select(this);
                    if (percentage >= 10) {
                        const [label, percent] = [`${d.data.category}`, `${percentage.toFixed(1)}%`];
                        el.text(null);
                        el.append("tspan")
                            .attr("x", 0)
                            .attr("dy", "0")
                            .text(label);
                        el.append("tspan")
                            .attr("x", 0)
                            .attr("dy", "1.2em")
                            .text(percent);
                    }
                });
            });

        d3.select("#" + vis.parentElement + " svg").selectAll(".legend").remove();

        const legend = d3.select("#" + vis.parentElement + " svg")
            .append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width / 2 - 130 - 40}, ${vis.height + 10})`);

        const legendItems = legend.selectAll(".legend-item")
            .data(vis.displayData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .style("fill", "white")
            .attr("transform", (d, i) => `translate(${(i % 3) * 130}, ${Math.floor(i / 3) * 20})`);

        legendItems.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", d => vis.color(d.category));

        legendItems.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .text(d => d.category)
            .style("font-size", "12px");
    }
}