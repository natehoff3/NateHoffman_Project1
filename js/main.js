// Define CSV file paths
const dataUrl1 = "data/national_health_data_2024.csv"; // First dataset (percent_smoking)
const dataUrl2 = "data/Updated_People.csv"; // Second dataset (ForeignBornPct)

// Load and process the first CSV (percent_smoking data)
d3.csv(dataUrl1).then(data1 => {
    console.log("Raw Data 1:", data1);

    const data1Map = data1.reduce((map, d) => {
        const fips = d["cnty_fips"];
        map[fips] = {
            value: +d["percent_smoking"], 
            state: getStateFromFIPS(fips) // Extract state from FIPS
        };
        return map;
    }, {});

    console.log("Data 1 Map:", data1Map);

    // Load the second CSV (Updated_People.csv)
    d3.csv(dataUrl2).then(data2 => {
        console.log("Raw Data 2:", data2);

        const data2Map = data2.reduce((map, d) => {
            const fips = d["FIPS"];
            const foreignBornPctValue = d["ForeignBornPct"];

            if (foreignBornPctValue !== undefined && foreignBornPctValue !== null) {
                const trimmedValue = foreignBornPctValue.toString().trim();
                map[fips] = {
                    value: trimmedValue && !isNaN(trimmedValue) ? +trimmedValue : 0,
                    state: getStateFromFIPS(fips), // Extract state from FIPS
                    county: d["County"] // Store county name
                };
            }
            return map;
        }, {});

        console.log("Data 2 Map:", data2Map);

        // Combine datasets based on FIPS codes
        const combinedData = [];
        for (const fips in data1Map) {
            if (data2Map[fips]) {
                combinedData.push({
                    fips,
                    state: data1Map[fips].state || data2Map[fips].state, // Assign state from either dataset
                    county: data2Map[fips].county, // Include county name from second dataset
                    column1: data1Map[fips].value, // Data from first CSV (percent_smoking)
                    columnA: data2Map[fips].value  // Data from second CSV (ForeignBornPct)
                });
            }
        }

        console.log("Combined Data:", combinedData);

        const filteredData = combinedData.filter(d => 
            d.state !== "Unknown" && !(d.state === "Alaska" && d.county === "Valdez-Cordova")
        );

        createBarChart(filteredData);
        createScatterplot(filteredData);
        createChoroplethMaps(filteredData);
    }).catch(error => console.error("Error loading second CSV:", error));
}).catch(error => console.error("Error loading first CSV:", error));

/** 
 * Extracts the state name from the first two digits of the FIPS code.
 */
function getStateFromFIPS(fips) {
    if (!fips || fips.length < 2) return "Unknown";
    
    const stateFIPSCodes = {
        "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas", "06": "California",
        "08": "Colorado", "09": "Connecticut", "10": "Delaware", "12": "Florida", "13": "Georgia",
        "15": "Hawaii", "16": "Idaho", "17": "Illinois", "18": "Indiana", "19": "Iowa",
        "20": "Kansas", "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
        "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi", "29": "Missouri",
        "30": "Montana", "31": "Nebraska", "32": "Nevada", "33": "New Hampshire", "34": "New Jersey",
        "35": "New Mexico", "36": "New York", "37": "North Carolina", "38": "North Dakota", "39": "Ohio",
        "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
        "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah", "50": "Vermont",
        "51": "Virginia", "53": "Washington", "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming"
    };

    const stateCode = fips.substring(0, 2); // Extract first two digits
    return stateFIPSCodes[stateCode] || "Unknown";
}

// Function to create the visualization
function createBarChart(combinedData) {
    const width = 900;
    const height = 450;
    const margin = { top: 60, right: 150, bottom: 50, left: 60 };

    // Extract unique states from data (sorted alphabetically)
    const states = [...new Set(combinedData.map(d => d.state))].sort();

    // Select the chart container
    const container = d3.select("#chart").style("position", "relative");

    // Create a state filter dropdown
    const dropdown = container.insert("select", ":first-child")
        .attr("id", "stateFilter")
        .style("position", "absolute")
        .style("top", "10px")
        .style("left", "10px")
        .on("change", updateChart);

    // Populate state dropdown
    dropdown.selectAll("option")
        .data(states)
        .enter().append("option")
        .text(d => d)
        .attr("value", d => d);

    dropdown.property("value", states[0]); // Default to first state

    // Create a sorting dropdown next to the state filter
    const sortingDropdown = container.insert("select", ":first-child")
        .attr("id", "sortingFilter")
        .style("position", "absolute")
        .style("top", "10px")
        .style("left", "180px") // Positioned next to the state filter
        .on("change", updateChart);

    // Sorting options
    const sortingOptions = [
        { value: "alphabetical", text: "Alphabetical Order" },
        { value: "smokers_high_low", text: "Smokers % (High to Low)" },
        { value: "smokers_low_high", text: "Smokers % (Low to High)" },
        { value: "foreign_high_low", text: "Foreign Born % (High to Low)" },
        { value: "foreign_low_high", text: "Foreign Born % (Low to High)" }
    ];

    // Populate sorting dropdown
    sortingDropdown.selectAll("option")
        .data(sortingOptions)
        .enter().append("option")
        .attr("value", d => d.value)
        .text(d => d.text);

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Define x and y scales
    const xScale = d3.scaleBand().range([0, width]).padding(0.2);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Add X Axis
    const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .attr("class", "x-axis");

    // Add Y Axis
    const yAxis = svg.append("g").attr("class", "y-axis");

    // Add Y Axis Title
    svg.append("text")
        .attr("class", "y-axis-title")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 20)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("fill", "#333")
        .text("Percentage");

    // ** Add Legend **
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, -50)`);

    // Legend items
    const legendData = [
        { color: "steelblue", label: "Percentage of Residents Who Smoke" },
        { color: "orange", label: "Percentage of Foreign Born Residents" }
    ];

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 25)
        .attr("y", (d, i) => i * 25 + 13)
        .text(d => d.label)
        .style("font-size", "14px")
        .style("fill", "#333");

    function updateChart() {
        const selectedState = d3.select("#stateFilter").property("value");
        const sortingMethod = d3.select("#sortingFilter").property("value");
    
        // Filter data based on selected state
        let filteredData = combinedData.filter(d => d.state === selectedState);
    
        // Apply sorting method
        switch (sortingMethod) {
            case "smokers_high_low":
                filteredData.sort((a, b) => b.column1 - a.column1);
                break;
            case "smokers_low_high":
                filteredData.sort((a, b) => a.column1 - b.column1);
                break;
            case "foreign_high_low":
                filteredData.sort((a, b) => b.columnA - a.columnA);
                break;
            case "foreign_low_high":
                filteredData.sort((a, b) => a.columnA - b.columnA);
                break;
            default: // Alphabetical Order
                filteredData.sort((a, b) => a.county.localeCompare(b.county));
        }
    
        // Update scales
        xScale.domain(filteredData.map(d => d.fips));
        yScale.domain([0, d3.max(filteredData, d => Math.max(d.column1, d.columnA)) * 1.1]);
    
        // Update axes
        xAxis.transition().duration(500).call(d3.axisBottom(xScale).tickValues([]));
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));
    
        // Select tooltip
        const tooltip = d3.select("#tooltip");
    
        // Update bars (Smokers)
        const bars1 = svg.selectAll(".bar1").data(filteredData, d => d.fips);
        bars1.enter().append("rect")
            .attr("class", "bar1")
            .merge(bars1)
            .transition().duration(500)
            .attr("x", d => xScale(d.fips))
            .attr("y", d => yScale(d.column1))
            .attr("width", xScale.bandwidth() / 2)
            .attr("height", d => height - yScale(d.column1))
            .attr("fill", "steelblue");
        bars1.exit().remove();
    
        // Update bars (Foreign Born)
        const bars2 = svg.selectAll(".bar2").data(filteredData, d => d.fips);
        bars2.enter().append("rect")
            .attr("class", "bar2")
            .merge(bars2)
            .transition().duration(500)
            .attr("x", d => xScale(d.fips) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.columnA))
            .attr("width", xScale.bandwidth() / 2)
            .attr("height", d => height - yScale(d.columnA))
            .attr("fill", "orange");
        bars2.exit().remove();
    
        // Restore tooltip functionality
        svg.selectAll(".bar1, .bar2")
            .on("mouseover", function (event, d) {
                // Highlight both bars of the same county
                d3.selectAll(`.bar1, .bar2`).style("opacity", 0.5);
                d3.select(this).style("opacity", 1).style("stroke", "black").style("stroke-width", "2px");
                d3.selectAll(`.bar1[data-fips='${d.fips}'], .bar2[data-fips='${d.fips}']`).style("opacity", 1);
    
                // Show tooltip with county details
                tooltip.style("visibility", "visible")
                    .html(`<strong>${d.county}, ${d.state}</strong><br>
                        Smokers: ${d.column1}%<br>
                        Foreign Born: ${d.columnA}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function (event) {
                // Move tooltip with the mouse
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function () {
                // Reset bar styles
                d3.selectAll(`.bar1, .bar2`).style("opacity", 1).style("stroke", "none");
    
                // Hide tooltip
                tooltip.style("visibility", "hidden");
            });
    }

    // Initialize chart with first state in the dropdown
    updateChart();
}

// Function to create scatterplot with state filter
function createScatterplot(data) {
    const width = 900;
    const height = 450;
    const margin = { top: 60, right: 100, bottom: 50, left: 60 };

    // Sort unique states alphabetically and add "All States" at the top
    const uniqueStates = [...new Set(data.map(d => d.state))].sort();
    uniqueStates.unshift("All States");

    // Create dropdown
    const dropdown = d3.select("#scatterplot")
        .append("select")
        .attr("id", "stateFilter")
        .on("change", updateScatterplot);

    dropdown.selectAll("option")
        .data(uniqueStates)
        .enter()
        .append("option")
        .attr("value", d => (d === "All States" ? "all" : d))
        .text(d => d);

    // Create SVG container
    const svg = d3.select("#scatterplot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Define scales with nice formatting
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.column1), d3.max(data, d => d.column1)])
        .nice()
        .range([0, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.columnA), d3.max(data, d => d.columnA)])
        .nice()
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(uniqueStates);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    svg.append("g").call(d3.axisLeft(yScale));

    // Add X Axis Title
    svg.append("text")
    .attr("class", "x-axis-title")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("fill", "#333")
    .text("Percentage of Residents Who Smoke");

    // Add Y Axis Title
    svg.append("text")
    .attr("class", "y-axis-title")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("fill", "#333")
    .text("Percentage of Foreign Born Residents");

    // Draw circles
    const circles = svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScale(d.column1))
        .attr("cy", d => yScale(d.columnA))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.state))
        .attr("opacity", 0.8)
        .attr("class", d => `state-${d.state.replace(/\s+/g, '-')}`);

    // Create tooltip if it doesn't exist
    let tooltip = d3.select("#scatterplot-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("id", "scatterplot-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.9)")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("visibility", "hidden")
            .style("pointer-events", "none");
    }

    // Add tooltip functionality
    circles.on("mouseover", function (event, d) {
            d3.select(this)
                .attr("stroke", "black")
                .attr("stroke-width", 2);

            tooltip.style("visibility", "visible")
                .html(`<strong>${d.county}, ${d.state}</strong><br>
                    Smokers: ${d.column1}%<br>
                    Foreign Born: ${d.columnA}%`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .attr("stroke", "none");

            tooltip.style("visibility", "hidden");
        });

    // Define brushing behavior
    const brush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on("end", ({ selection }) => {
            if (!selection) return;
            const [[x0, y0], [x1, y1]] = selection;
            circles.style("display", d =>
                x0 <= xScale(d.column1) && xScale(d.column1) <= x1 &&
                y0 <= yScale(d.columnA) && yScale(d.columnA) <= y1 ? "block" : "none"
            );
        });

    // Append brush to SVG
    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // Function to handle brushing
    function brushed(event) {
        if (!event.selection) return; // Ignore if no selection

        const [[x0, y0], [x1, y1]] = event.selection;

        // Highlight circles within brushed area
        svg.selectAll("circle")
            .style("stroke", "none") // Reset all first
            .filter(d => {
                const cx = xScale(d.column1);
                const cy = yScale(d.columnA);
                return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            })
            .style("stroke", "black")
            .style("stroke-width", "2px");
    }

    // Function to update scatterplot based on state selection
    function updateScatterplot() {
        const selectedState = dropdown.property("value");

        circles.style("display", d =>
            selectedState === "all" || d.state === selectedState ? "block" : "none"
        );
    }
}

// Function to create choropleth maps with synchronized zooming and locked panning
function createChoroplethMaps(countyData) {
    const width = 870, height = 470;

    // Define color scales
    const colorScaleSmokers = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(countyData, d => d.column1)]);
    const colorScaleForeignBorn = d3.scaleSequential(d3.interpolateOranges)
        .domain([0, d3.max(countyData, d => d.columnA)]);

    // Create a shared zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Min zoom = 1 (default), Max zoom = 8
        .translateExtent([[0, 0], [width, height]]) // Restrict panning area
        .on("zoom", zoomed);

    // Store the two maps' SVG groups
    let mapContainers = {};

    d3.json("data/counties-10m.json").then(topology => {
        const geojson = topojson.feature(topology, topology.objects.counties);

        ["map1", "map2"].forEach((mapId, index) => {
            const container = d3.select(`#${mapId}`);

            // Add title
            const titleText = index === 0 ? 
                "Percentage of Residents Who Smoke" : 
                "Percentage of Foreign Born Residents";

            container.append("h3")
                .attr("class", "map-title")
                .text(titleText)
                .style("text-align", "center")
                .style("margin-bottom", "10px");

            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height)
                .call(zoom); // Enable zooming

            const projection = d3.geoAlbersUsa().fitSize([width, height], geojson);
            const path = d3.geoPath().projection(projection);

            // Create a group for the map that will be zoomed
            const g = svg.append("g");

            // Draw counties
            g.selectAll(".county")
                .data(geojson.features)
                .enter().append("path")
                .attr("class", d => `county county-${d.id}`)
                .attr("d", path)
                .attr("fill", d => {
                    const fips = d.id;
                    const county = countyData.find(c => c.fips === fips);
                    return county ? 
                        (index === 0 ? colorScaleSmokers(county.column1) : colorScaleForeignBorn(county.columnA)) 
                        : "#ccc";
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", "0.5px")
                .on("mouseover", function (event, d) {
                    const fips = d.id;
                    const county = countyData.find(c => c.fips === fips);
                    if (county) {
                        d3.select("#tooltip")
                            .style("visibility", "visible")
                            .html(`<strong>${county.county}, ${county.state}</strong><br>
                                   Smokers: ${county.column1}%<br>
                                   Foreign Born: ${county.columnA}%`)
                            .style("left", `${event.pageX + 10}px`)
                            .style("top", `${event.pageY - 20}px`);

                        // Highlight corresponding counties in both maps
                        d3.selectAll(`.county-${fips}`)
                            .attr("stroke", "#000")
                            .attr("stroke-width", "2px");
                    }
                })
                .on("mouseout", function (event, d) {
                    const fips = d.id;

                    // Hide tooltip
                    d3.select("#tooltip").style("visibility", "hidden");

                    // Reset county highlighting in both maps
                    d3.selectAll(`.county-${fips}`)
                        .attr("stroke", "#fff")
                        .attr("stroke-width", "0.5px");
                });

            // Store map group in the mapContainers object
            mapContainers[mapId] = g;

            // Add legend
            const legendWidth = 300, legendHeight = 10;
            const legendScale = d3.scaleLinear()
                .domain(index === 0 ? [0, d3.max(countyData, d => d.column1)] : 
                                      [0, d3.max(countyData, d => d.columnA)])
                .range([0, legendWidth]);

            const legendSvg = container.append("svg")
                .attr("width", legendWidth + 50)
                .attr("height", 50)
                .style("display", "block")
                .style("margin", "10px auto");

            const gradientId = index === 0 ? "gradient-smokers" : "gradient-foreignborn";

            const defs = legendSvg.append("defs");
            const gradient = defs.append("linearGradient")
                .attr("id", gradientId)
                .attr("x1", "0%").attr("y1", "0%")
                .attr("x2", "100%").attr("y2", "0%");

            const colorScale = index === 0 ? colorScaleSmokers : colorScaleForeignBorn;

            // Define color stops
            gradient.selectAll("stop")
                .data(d3.range(0, 1.01, 0.1))
                .enter().append("stop")
                .attr("offset", d => `${d * 100}%`)
                .attr("stop-color", d => colorScale(d * d3.max(countyData, d => index === 0 ? d.column1 : d.columnA)));

            // Append color gradient
            legendSvg.append("rect")
                .attr("x", 20)
                .attr("y", 10)
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", `url(#${gradientId})`)
                .style("stroke", "#000");

            // Add legend axis
            const legendAxis = d3.axisBottom(legendScale).ticks(5);
            legendSvg.append("g")
                .attr("transform", `translate(20, ${legendHeight + 10})`)
                .call(legendAxis);
        });
    });

    // Zoom function with panning restrictions
    function zoomed(event) {
        Object.values(mapContainers).forEach(g => {
            const { k, x, y } = event.transform;

            // ** Restrict panning to prevent maps from being dragged offscreen **
            const maxX = width * (1 - k); // Prevents dragging too far right
            const maxY = height * (1 - k); // Prevents dragging too far down
            const minX = 0; // Prevents dragging too far left
            const minY = 0; // Prevents dragging too far up

            const clampedX = Math.min(Math.max(x, maxX), minX);
            const clampedY = Math.min(Math.max(y, maxY), minY);

            g.attr("transform", `translate(${clampedX}, ${clampedY}) scale(${k})`);
        });
    }
}

document.getElementById("toggleView").addEventListener("click", function () {
    const view1 = document.getElementById("view1");
    const view2 = document.getElementById("view2");
    const button = document.getElementById("toggleView");

    if (view1.style.display === "none") {
        view1.style.display = "flex";
        view2.style.display = "none";
        button.textContent = "Switch to Choropleth Maps";
    } else {
        view1.style.display = "none";
        view2.style.display = "flex";
        button.textContent = "Switch to Bar Chart & Scatterplot";

        // Ensure maps are created only once
        if (!document.querySelector("#map1 svg")) {
            createChoroplethMap("map1", data1Map, d3.interpolateBlues); // Smoking rates
        }
        if (!document.querySelector("#map2 svg")) {
            createChoroplethMap("map2", data2Map, d3.interpolateOranges); // Foreign-born rates
        }
    }
});
