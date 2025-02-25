// Define CSV file paths
const dataUrl1 = "data/national_health_data_2024.csv"; // Path to the first dataset (percent_smoking)
const dataUrl2 = "data/Updated_People.csv"; // Path to the second dataset (ForeignBornPct)

// Load and process the first CSV (percent_smoking data)
d3.csv(dataUrl1).then(data1 => {
    console.log("Raw Data 1:", data1); // Log the raw data for debugging purposes

    // Convert data1 into a map for quick lookup by FIPS code
    const data1Map = data1.reduce((map, d) => {
        const fips = d["cnty_fips"]; // Get the FIPS code for the county
        map[fips] = {
            value: +d["percent_smoking"], // Convert smoking percentage to a number
            state: getStateFromFIPS(fips) // Extract the state from the FIPS code
        };
        return map;
    }, {});

    console.log("Data 1 Map:", data1Map); // Log the map for debugging

    // Load the second CSV (Updated_People.csv)
    d3.csv(dataUrl2).then(data2 => {
        console.log("Raw Data 2:", data2); // Log the raw second dataset for debugging

        // Convert data2 into a map for quick lookup by FIPS code
        const data2Map = data2.reduce((map, d) => {
            const fips = d["FIPS"]; // Get the FIPS code from the second dataset
            const foreignBornPctValue = d["ForeignBornPct"]; // Get the foreign-born percentage

            // Ensure the value exists before storing it in the map
            if (foreignBornPctValue !== undefined && foreignBornPctValue !== null) {
                const trimmedValue = foreignBornPctValue.toString().trim(); // Trim whitespace from the value
                map[fips] = {
                    value: trimmedValue && !isNaN(trimmedValue) ? +trimmedValue : 0, // Convert to number, set to 0 if invalid
                    state: getStateFromFIPS(fips), // Extract the state from the FIPS code
                    county: d["County"] // Store the county name
                };
            }
            return map;
        }, {});

        console.log("Data 2 Map:", data2Map); // Log the map for debugging

        // Combine datasets based on matching FIPS codes
        const combinedData = [];
        for (const fips in data1Map) {
            if (data2Map[fips]) { // Only combine entries with matching FIPS codes in both datasets
                combinedData.push({
                    fips,
                    state: data1Map[fips].state || data2Map[fips].state, // Get state from either dataset
                    county: data2Map[fips].county, // Get county name from the second dataset
                    column1: data1Map[fips].value, // Smoking percentage from the first dataset
                    columnA: data2Map[fips].value  // Foreign-born percentage from the second dataset
                });
            }
        }

        console.log("Combined Data:", combinedData); // Log the combined data for debugging

        // Filter out bad data (e.g., "Unknown" states or a specific county in Alaska)
        const filteredData = combinedData.filter(d => 
            d.state !== "Unknown" && !(d.state === "Alaska" && d.county === "Valdez-Cordova")
        );

        // Create all the visualizations (bar chart, scatterplot, choropleth maps)
        createBarChart(filteredData);
        createScatterplot(filteredData);
        createChoroplethMaps(filteredData);

    }).catch(error => console.error("Error loading second CSV:", error)); // Catch errors from loading the second CSV
}).catch(error => console.error("Error loading first CSV:", error)); // Catch errors from loading the first CSV

/**
 * Function to get state abbreviation from FIPS code
 * 
 * @param {string} fips - FIPS county code
 * 
 * @returns {string} State abbreviation (e.g., "AL" for Alabama)
 */
function getStateFromFIPS(fips) {
    if (!fips || fips.length < 2) return "Unknown"; // If FIPS code is invalid, return "Unknown"
    
    // Map of state FIPS codes to state names
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

    const stateCode = fips.substring(0, 2); // Extract the first two digits from the FIPS code
    return stateFIPSCodes[stateCode] || "Unknown"; // Return the state name or "Unknown" if not found
}

/** 
 * Function to create the bar chart
 * 
 * @param combinedData - All the county data, including smoking and foreign-born percentages
 */
function createBarChart(combinedData) {
    const width = 900; // Chart width
    const height = 450; // Chart height
    const margin = { top: 60, right: 150, bottom: 50, left: 60 }; // Margins for chart layout

    // Extract unique states from data, sort them alphabetically
    const states = [...new Set(combinedData.map(d => d.state))].sort();

    // Select the chart container by its ID and set the position for the dropdown
    const container = d3.select("#chart").style("position", "relative");

    // Create a dropdown to filter by state
    const dropdown = container.insert("select", ":first-child")
        .attr("id", "stateFilter")
        .style("position", "absolute")
        .style("top", "10px")
        .style("left", "10px")
        .on("change", updateChart); // Update chart when selection changes

    // Populate state dropdown with unique states
    dropdown.selectAll("option")
        .data(states)
        .enter().append("option")
        .text(d => d) // Display state name
        .attr("value", d => d); // Set value to state name

    dropdown.property("value", states[0]); // Default to the first state in the list

    // Create a sorting dropdown next to the state filter
    const sortingDropdown = container.insert("select", ":first-child")
        .attr("id", "sortingFilter")
        .style("position", "absolute")
        .style("top", "10px")
        .style("left", "150px")
        .on("change", updateChart); // Update chart when sorting method changes

    // Sorting options to choose from
    const sortingOptions = [
        { value: "alphabetical", text: "Alphabetical Order" },
        { value: "smokers_high_low", text: "Smokers % (High to Low)" },
        { value: "smokers_low_high", text: "Smokers % (Low to High)" },
        { value: "foreign_high_low", text: "Foreign Born % (High to Low)" },
        { value: "foreign_low_high", text: "Foreign Born % (Low to High)" }
    ];

    // Populate sorting dropdown with options
    sortingDropdown.selectAll("option")
        .data(sortingOptions)
        .enter().append("option")
        .attr("value", d => d.value) // Set value to sorting method
        .text(d => d.text); // Display option text

    // Create the SVG element for the chart
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right) // Add margins to width
        .attr("height", height + margin.top + margin.bottom) // Add margins to height
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`); // Position the chart

    // Define x and y scales for the bar chart
    const xScale = d3.scaleBand().range([0, width]).padding(0.2); // X scale for counties
    const yScale = d3.scaleLinear().range([height, 0]); // Y scale for percentages

    // Add X Axis to the SVG
    const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .attr("class", "x-axis");

    // Add Y Axis to the SVG
    const yAxis = svg.append("g")
        .attr("class", "y-axis");

    // Add Y Axis Title to the chart
    svg.append("text")
        .attr("class", "y-axis-title")
        .attr("x", -height / 2) // Rotate the text
        .attr("y", -margin.left + 20)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("fill", "#333")
        .text("Percentage");

    // ** Add Legend **
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, -50)`); // Position legend

    // Legend items with their respective colors and labels
    const legendData = [
        { color: "steelblue", label: "Percentage of Residents Who Smoke" },
        { color: "orange", label: "Percentage of Foreign Born Residents" }
    ];

    // Append colored rectangles for the legend
    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25) // Space legend items vertically
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => d.color);

    // Append text labels to the legend
    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 25)
        .attr("y", (d, i) => i * 25 + 13)
        .text(d => d.label)
        .style("font-size", "14px")
        .style("fill", "#333");

    /**
     * Function to update the chart when a selection is made
     */
    function updateChart() {
        const selectedState = d3.select("#stateFilter").property("value"); // Get selected state
        const sortingMethod = d3.select("#sortingFilter").property("value"); // Get selected sorting method
    
        // Filter data based on selected state
        let filteredData = combinedData.filter(d => d.state === selectedState);
    
        // Apply sorting method
        switch (sortingMethod) {
            case "smokers_high_low":
                filteredData.sort((a, b) => b.column1 - a.column1); // Sort by smokers % (high to low)
                break;
            case "smokers_low_high":
                filteredData.sort((a, b) => a.column1 - b.column1); // Sort by smokers % (low to high)
                break;
            case "foreign_high_low":
                filteredData.sort((a, b) => b.columnA - a.columnA); // Sort by foreign-born % (high to low)
                break;
            case "foreign_low_high":
                filteredData.sort((a, b) => a.columnA - b.columnA); // Sort by foreign-born % (low to high)
                break;
            default: // Default to alphabetical order by county
                filteredData.sort((a, b) => a.county.localeCompare(b.county));
        }
    
        // Update scales based on filtered data
        xScale.domain(filteredData.map(d => d.fips));
        yScale.domain([0, d3.max(filteredData, d => Math.max(d.column1, d.columnA)) * 1.1]);
    
        // Update axes with smooth transitions
        xAxis.transition().duration(500).call(d3.axisBottom(xScale).tickValues([]));
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));
    
        // Select tooltip element
        const tooltip = d3.select("#tooltip");
    
        // Update bars (Smokers data)
        const bars1 = svg.selectAll(".bar1").data(filteredData, d => d.fips);
        bars1.enter().append("rect")
            .attr("class", "bar1")
            .merge(bars1)
            .attr("data-fips", d => d.fips)
            .transition().duration(500)
            .attr("x", d => xScale(d.fips))
            .attr("y", d => yScale(d.column1))
            .attr("width", xScale.bandwidth() / 2)
            .attr("height", d => height - yScale(d.column1))
            .attr("fill", "steelblue");
        bars1.exit().remove();
    
        // Update bars (Foreign Born data)
        const bars2 = svg.selectAll(".bar2").data(filteredData, d => d.fips);
        bars2.enter().append("rect")
            .attr("class", "bar2")
            .merge(bars2)
            .attr("data-fips", d => d.fips)
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
                // Reduce opacity for all bars
                d3.selectAll(".bar1, .bar2").style("opacity", 0.5);
            
                // Highlight bars for the hovered county
                d3.selectAll(`.bar1[data-fips='${d.fips}'], .bar2[data-fips='${d.fips}']`)
                    .style("opacity", 1)
                    .style("stroke", "black")
                    .style("stroke-width", "2px");
            
                // Show tooltip with county information
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

    // Initialize chart with the first state in the dropdown
    updateChart();
}

/** 
 * Function to create scatterplot with state filter
 * 
 * @param data - The dataset containing county information with columns for smoking and foreign-born percentages
 */
function createScatterplot(data) {
    const width = 900; // Width of the scatterplot
    const height = 450; // Height of the scatterplot
    const margin = { top: 60, right: 100, bottom: 50, left: 60 }; // Margins for chart layout

    // Extract unique states and add "All States" at the top
    const uniqueStates = [...new Set(data.map(d => d.state))].sort();
    uniqueStates.unshift("All States"); // Add "All States" to the dropdown

    // Create state filter dropdown
    const dropdown = d3.select("#scatterplot")
        .append("select")
        .attr("id", "stateFilter")
        .on("change", updateScatterplot); // Update the chart when a new state is selected

    // Populate dropdown options with states
    dropdown.selectAll("option")
        .data(uniqueStates)
        .enter()
        .append("option")
        .attr("value", d => (d === "All States" ? "all" : d))
        .text(d => d);

    // Add Reset Brush button
    d3.select("#scatterplot")
        .append("button")
        .attr("id", "resetBrush")
        .text("Reset Brush")
        .on("click", resetBrush); // Reset the brush selection when clicked
    
    // Create SVG container for the scatterplot
    const svg = d3.select("#scatterplot")
        .append("svg")
        .attr("width", width + margin.left + margin.right) // Total width including margins
        .attr("height", height + margin.top + margin.bottom) // Total height including margins
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`); // Adjust for margins

    // Define x and y scales based on the data range
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.column1), d3.max(data, d => d.column1)]) // Set x domain to min/max of smokers percentage
        .nice() // Apply nice formatting for domain
        .range([0, width - margin.right]); // Set range based on chart width

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.columnA), d3.max(data, d => d.columnA)]) // Set y domain to min/max of foreign-born percentage
        .nice() // Apply nice formatting for domain
        .range([height, 0]); // Set range based on chart height

    // Define color scale for states
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(uniqueStates); // Assign different colors to different states

    // Add X Axis to SVG
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale)); // Create the x-axis at the bottom

    // Add Y Axis to SVG
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale)); // Create the y-axis on the left

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

    // Define brushing behavior
    const brush = d3.brush()
        .extent([[0, 0], [width, height]]) // Define the area for brushing
        .on("end", ({ selection }) => {
            if (!selection) return;
            const [[x0, y0], [x1, y1]] = selection;
            circles.style("display", d =>
                x0 <= xScale(d.column1) && xScale(d.column1) <= x1 &&
                y0 <= yScale(d.columnA) && yScale(d.columnA) <= y1 ? "block" : "none"
            ); // Hide circles that are outside the brushed area
        });

    // Append brush to the SVG container
    const brushGroup = svg.append("g")
        .attr("class", "brush")
        .call(brush);
    brushGroup.style("pointer-events", "none"); // Disable interaction with the brush area

    /**
     * // Function to handle brushing even
     * 
     * @param {Object} event - The event object generated by the brush interaction.
     */
    function brushed(event) {
        if (!event.selection) return; // Ignore if no selection

        const [[x0, y0], [x1, y1]] = event.selection;

        // Highlight circles within the brushed area
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

    /**
     * Function to reset the brush selection
     */
    function resetBrush() {
        brushGroup.call(brush.move, null); // Remove the brush selection
        circles.style("display", "block"); // Make all circles visible again
    }

    /**
     * Function to enable or disable the brush
     * 
     * @param {Boolean} enable - A flag indicating whether to enable (true) or disable (false) the brush tool.
     */
    function toggleBrush(enable) {
        brushGroup.selectAll(".overlay").style("display", enable ? "block" : "none"); // Show or hide brush overlay
        brushGroup.selectAll(".selection").style("display", enable ? "block" : "none"); // Show or hide the selection area

        if (enable) {
            brushGroup.call(brush); // Enable the brush functionality
        } else {
            brushGroup.on(".brush", null); // Disable brush events
        }
    }

    // Initially, disable the brush
    toggleBrush(true);

    // Draw circles for each data point
    const circles = svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScale(d.column1)) // Set x position based on smokers percentage
        .attr("cy", d => yScale(d.columnA)) // Set y position based on foreign-born percentage
        .attr("r", 5) // Set circle radius
        .attr("fill", d => colorScale(d.state)) // Set circle color based on state
        .attr("opacity", 0.8) // Set initial opacity
        .attr("class", d => `state-${d.state.replace(/\s+/g, '-')}`); // Create class based on state for targeting

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
            .style("visibility", "hidden") // Initially hide the tooltip
            .style("pointer-events", "none");
    }

    // Tooltip functionality for circle hover
    circles.on("mouseover", function (event, d) {
            d3.select(this)
                .attr("stroke", "black")
                .attr("stroke-width", 2); // Add border to highlighted circle

            tooltip.style("visibility", "visible")
                .html(`<strong>${d.county}, ${d.state}</strong><br>
                    Smokers: ${d.column1}%<br>
                    Foreign Born: ${d.columnA}%`) // Display county and data in tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px"); // Move tooltip with the mouse
        })
        .on("mouseout", function () {
            d3.select(this)
                .attr("stroke", "none"); // Remove circle border on mouse out

            tooltip.style("visibility", "hidden"); // Hide tooltip
        });

    /**
     * Function to update the scatterplot based on selected state.
     * The function may update axes, data points, and other chart elements dynamically.
     */
    function updateScatterplot() {
        const selectedState = dropdown.property("value");

        // Filter data for selected state
        const filteredData = selectedState === "all" ? data : data.filter(d => d.state === selectedState);

        // Update scale domains based on filtered data
        xScale.domain(d3.extent(filteredData, d => d.column1)).nice();
        yScale.domain(d3.extent(filteredData, d => d.columnA)).nice();

        // Transition axes to reflect new scales
        svg.select(".x-axis")
            .transition().duration(500)
            .call(d3.axisBottom(xScale));

        svg.select(".y-axis")
            .transition().duration(500)
            .call(d3.axisLeft(yScale));

        // Update circle positions based on new scales
        circles.transition().duration(500)
            .attr("cx", d => xScale(d.column1))
            .attr("cy", d => yScale(d.columnA))
            .style("display", d => (selectedState === "all" || d.state === selectedState) ? "block" : "none");

        // Enable or disable brush functionality based on selection
        if (selectedState === "all") {
            toggleBrush(true); // Enable brush
            d3.select("#resetBrush").attr("disabled", null); // Enable reset button
        } else {
            toggleBrush(false); // Disable brush
            d3.select("#resetBrush").attr("disabled", "true"); // Disable reset button
        }
    }
}

/**
 * Function to create choropleth maps with synchronized zooming and locked panning
 * 
 * @param {Array} countyData - An array of objects containing county-level data for smoking rates 
 *                              and foreign-born population percentages.
 */
function createChoroplethMaps(countyData) {
    const width = 870, height = 470;

    // Define color scales for the two data variables (smoking and foreign-born percentages)
    const colorScaleSmokers = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(countyData, d => d.column1)]); // Map column1 (smokers data) to a blue color scale
    const colorScaleForeignBorn = d3.scaleSequential(d3.interpolateOranges)
        .domain([0, d3.max(countyData, d => d.columnA)]); // Map columnA (foreign-born data) to an orange color scale

    // Create a shared zoom behavior for both maps
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Min zoom = 1 (default), Max zoom = 8
        .translateExtent([[0, 0], [width, height]]) // Restrict panning area to within map bounds
        .on("zoom", zoomed); // Apply zooming behavior

    // Store the two maps' SVG groups in this object
    let mapContainers = {};

    // Load GeoJSON data for the US counties from the given JSON file
    d3.json("data/counties-10m.json").then(topology => {
        const geojson = topojson.feature(topology, topology.objects.counties); // Convert topology to GeoJSON format

        // Loop through two maps: "map1" for smokers and "map2" for foreign-born data
        ["map1", "map2"].forEach((mapId, index) => {
            const container = d3.select(`#${mapId}`); // Select the container for the current map

            // Add title for each map based on the data type
            const titleText = index === 0 ? 
                "Percentage of Residents Who Smoke" : 
                "Percentage of Foreign Born Residents";

            container.append("h3")
                .attr("class", "map-title")
                .text(titleText) // Set title text
                .style("text-align", "center")
                .style("margin-bottom", "10px");

            // Create an SVG element for the map and enable zoom behavior
            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height)
                .call(zoom); // Enable zooming for the map

            const projection = d3.geoAlbersUsa().fitSize([width, height], geojson); // Define projection
            const path = d3.geoPath().projection(projection); // Path generator for GeoJSON features

            // Create a group element that will hold the map and be zoomed
            const g = svg.append("g");

            // Draw the county boundaries on the map
            g.selectAll(".county")
                .data(geojson.features)
                .enter().append("path")
                .attr("class", d => `county county-${d.id}`) // Add unique class for each county
                .attr("d", path) // Generate path based on GeoJSON feature
                .attr("fill", d => {
                    const fips = d.id;
                    const county = countyData.find(c => c.fips === fips); // Find corresponding county data
                    return county ? 
                        (index === 0 ? colorScaleSmokers(county.column1) : colorScaleForeignBorn(county.columnA)) 
                        : "#ccc"; // Color counties based on data or set to grey if no data
                })
                .attr("stroke", "#fff") // White stroke color for county boundaries
                .attr("stroke-width", "0.5px")
                .on("mouseover", function (event, d) {
                    const fips = d.id;
                    const county = countyData.find(c => c.fips === fips);
                    if (county) {
                        // Display tooltip with county information on hover
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

                    // Hide tooltip on mouseout
                    d3.select("#tooltip").style("visibility", "hidden");

                    // Reset county highlighting in both maps
                    d3.selectAll(`.county-${fips}`)
                        .attr("stroke", "#fff")
                        .attr("stroke-width", "0.5px");
                });

            // Store the map's group element in the mapContainers object for later reference
            mapContainers[mapId] = g;

            // Create and add the legend for each map
            const legendWidth = 300, legendHeight = 10;
            const legendScale = d3.scaleLinear()
                .domain(index === 0 ? [0, d3.max(countyData, d => d.column1)] : 
                                      [0, d3.max(countyData, d => d.columnA)]) // Set domain for legend scale based on map index
                .range([0, legendWidth]); // Set range of the scale to the legend width

            const legendSvg = container.append("svg")
                .attr("width", legendWidth + 50)
                .attr("height", 50)
                .style("display", "block")
                .style("margin", "10px auto");

            const gradientId = index === 0 ? "gradient-smokers" : "gradient-foreignborn"; // Set gradient ID based on map index

            const defs = legendSvg.append("defs"); // Create definitions for gradient
            const gradient = defs.append("linearGradient")
                .attr("id", gradientId)
                .attr("x1", "0%").attr("y1", "0%")
                .attr("x2", "100%").attr("y2", "0%");

            const colorScale = index === 0 ? colorScaleSmokers : colorScaleForeignBorn; // Choose color scale based on map index

            // Define gradient color stops based on the color scale
            gradient.selectAll("stop")
                .data(d3.range(0, 1.01, 0.1))
                .enter().append("stop")
                .attr("offset", d => `${d * 100}%`)
                .attr("stop-color", d => colorScale(d * d3.max(countyData, d => index === 0 ? d.column1 : d.columnA)));

            // Append the gradient color to the legend
            legendSvg.append("rect")
                .attr("x", 20)
                .attr("y", 10)
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", `url(#${gradientId})`)
                .style("stroke", "#000");

            // Add axis to the legend to represent data scale
            const legendAxis = d3.axisBottom(legendScale).ticks(5);
            legendSvg.append("g")
                .attr("transform", `translate(20, ${legendHeight + 10})`)
                .call(legendAxis);
        });
    });

    /**
     * Zoom function with panning restrictions to keep the maps within bounds
     * 
     * @param {Object} event - The zoom event object
     */
    function zoomed(event) {
        Object.values(mapContainers).forEach(g => {
            const { k, x, y } = event.transform;

            // ** Restrict panning to prevent maps from being dragged offscreen **
            const maxX = width * (1 - k); // Prevents dragging too far right
            const maxY = height * (1 - k); // Prevents dragging too far down
            const minX = 0; // Prevents dragging too far left
            const minY = 0; // Prevents dragging too far up

            const clampedX = Math.min(Math.max(x, maxX), minX); // Clamping panning position
            const clampedY = Math.min(Math.max(y, maxY), minY); // Clamping panning position

            g.attr("transform", `translate(${clampedX}, ${clampedY}) scale(${k})`); // Apply the zoom and panning transformation
        });
    }
}

// Event listener to toggle between the choropleth maps and other views
document.getElementById("toggleView").addEventListener("click", function () {
    const view1 = document.getElementById("view1");
    const view2 = document.getElementById("view2");
    const button = document.getElementById("toggleView");

    // Toggle the visibility of the two views
    if (view1.style.display === "none") {
        view1.style.display = "flex";
        view2.style.display = "none";
        button.textContent = "Switch to Choropleth Maps"; // Change button text accordingly
    } else {
        view1.style.display = "none";
        view2.style.display = "flex";
        button.textContent = "Switch to Bar Chart & Scatterplot";

        // Ensure maps are created only once
        if (!document.querySelector("#map1 svg")) {
            createChoroplethMap("map1", data1Map, d3.interpolateBlues); // Create map 1 for smoking rates
        }
        if (!document.querySelector("#map2 svg")) {
            createChoroplethMap("map2", data2Map, d3.interpolateOranges); // Create map 2 for foreign-born rates
        }
    }
})
