//----------------------------------------------------------------------------------------
//  READ INPUT FILE                                                                        
//----------------------------------------------------------------------------------------
const reader = new FileReader();  

let chosenDimensions = [];
let data = [];
let columns = [];
  
function loadFile() {   
  const file = document.querySelector("input[type=file]").files[0];      
  reader.addEventListener("load", parseFile, false);
  if (file) {
    reader.readAsText(file);
  } 
}

function parseFile(){
  data = d3.csv.parse(reader.result, function(d){
    return d;   
  });
  columns = d3.keys(data[0]);
  d3.select(".section2").selectAll("*").remove();
  d3.select("svg").remove();
  chosenDimensions = [];
  d3.select(".section2")
    .append("p")
    .text("Choose dimensions");
  d3.select(".section2").selectAll("button")
    .data(columns)
    .enter()
    .append("button")
    .text(function(d) {
      return d;
    })
    .style("color", "white")
    .attr("class", "dimension");

  d3.selectAll(".dimension").on("click", function() {
    d3.select("svg").remove();
    const dimension = d3.select(this);
    if (dimension.classed("selectedDimension")) {
      dimension.classed("selectedDimension", false);
      chosenDimensions = chosenDimensions.filter(item => !dimension.text().includes(item));
      drawParallelCoordinates();
    } else {
      dimension.classed("selectedDimension", true);    
      chosenDimensions.push(dimension.text());
      drawParallelCoordinates();
    }
  });
}

//----------------------------------------------------------------------------------------
//  RENDER PARALLEL COORDINATES                                                                        
//----------------------------------------------------------------------------------------

const margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = 1400 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

const x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {},
    dragging = {};

const line = d3.svg.line(),
    axis = d3.svg.axis().orient("left");

function createSvg() {
  svg = d3.select("body").select(".svg-elem").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // const defs = svg.append("defs");

  // const gradient = defs.append("linearGradient")
  //   .attr("id", "svgGradient")
  //   .attr("x1", "0%")
  //   .attr("x2", "100%")
  //   .attr("y1", "0%")
  //   .attr("y2", "100%");

  // gradient.append("stop")
  //   .attr('class', 'start')
  //   .attr("offset", "0%")
  //   .attr("stop-color", "#adf6ff")
  //   .attr("stop-opacity", 0.3);

  // gradient.append("stop")
  //   .attr('class', 'end')
  //   .attr("offset", "100%")
  //   .attr("stop-color", "#eeff84")
  //   .attr("stop-opacity", 0.3);

  // const gradientHov = defs.append("linearGradient")
  //   .attr("id", "svgGradientHov")
  //   .attr("x1", "0%")
  //   .attr("x2", "100%")
  //   .attr("y1", "0%")
  //   .attr("y2", "100%");

  // gradientHov.append("stop")
  //   .attr('class', 'start')
  //   .attr("offset", "0%")
  //   .attr("stop-color", "#adf6ff")
  //   .attr("stop-opacity", 1);

  // gradientHov.append("stop")
  //   .attr('class', 'end')
  //   .attr("offset", "100%")
  //   .attr("stop-color", "#eeff84")
  //   .attr("stop-opacity", 1);
}

function drawParallelCoordinates() {
  createSvg();

  // Extract the list of numerical dimensions and create a scale for each.
  x.domain(dimensions = chosenDimensions.filter(function(d) {
    return d != "name" && (y[d] = d3.scale.linear()
        .domain(d3.extent(data, function(p) { return +p[d]; }))
        .range([height, 0]));
  }).sort());
  
  var f = d3.interpolateHsl('#adf6ff', '#eeff84');
  var colors = [];
  var nColors = data.length;
  for (var i=0; i<nColors; i++)
    colors.push(f(i/(nColors-1)));

  // Add grey background lines for context.
  const background = svg.append("g")
      .attr("class", "background")
    .selectAll("path")
      .data(data)
    .enter().append("path")
      .attr("d", path)
      .attr("stroke", "#4c575d")
      .attr("opacity", 0.2);

  // Add blue foreground lines for focus.
  const foreground = svg.append("g")
      .attr("class", "foreground")
    .selectAll("path")
      .data(data)
    .enter().append("path")
    .attr("stroke", function(d, i) {
      return colors[i];
    })
    .attr("fill", "none")
      .attr("d", path)
    .on("mouseover", function(d, i) {
      d3.selectAll("path")
        .style("opacity", 0.005)
      d3.select(this)
      .style("stroke", colors[i])
      .style("opacity", 1)
      .style("stroke-width", 3)
      .style("cursor", "pointer")
    })
    .on("mouseout", function(d) {
      d3.selectAll("path")
        .style("opacity", 0.2)
      d3.select(this)
      .style("stroke", "")
      .style("opacity", 0.2)
      .style("stroke-width", 1)
      .style("cursor", "default")
    });

  // Add a group element for each dimension.
  const g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .call(d3.behavior.drag()
        .origin(function(d) { return {x: x(d)}; })
        .on("dragstart", function(d) {
          dragging[d] = x(d);
          background.attr("visibility", "hidden");
        })
        .on("drag", function(d) {
          dragging[d] = Math.min(width, Math.max(0, d3.event.x));
          foreground.attr("d", path);
          dimensions.sort(function(a, b) { return position(a) - position(b); });
          x.domain(dimensions);
          g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
        })
        .on("dragend", function(d) {
          delete dragging[d];
          transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
          transition(foreground).attr("d", path);
          background
              .attr("d", path)
            .transition()
              .delay(500)
              .duration(0)
              .attr("visibility", null);
        }));

  // Add an axis and title.
  g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });


  const brushMode = d3.select('#brushMode');

  d3.select('#btnReset').on('click', () => {
    if (g) {
      g.selectAll('.brush').remove();
      drawLines(data);
    }
  });

  brushMode.on('change', function() {
    switch(this.value) {
    case 'None':
      console.log(this.value);
      // d3.selectAll(".brush").remove();
      break;
    case '1D-axes':
      addBrush(g);
      break;
    case '2D-strums':
      console.log(this.value);
      break;
    default:
      console.log(this.value);
      break;
    }
  });
}

function addBrush(g) {
   // Add and store a brush for each axis.
   g.append("g")
   .attr("class", "brush")
   .each(function(d) {
     d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushStart", brushStart).on("brush", brush));
   })
 .selectAll("rect")
   .attr("x", -8)
   .attr("width", 16);
}

function drawLines(data) {
  foreground = svg.append("g")
    .attr("class", "foreground")
      .selectAll("path")
        .data(data)
      .enter().append("path")
      .attr("stroke", "url(#svgGradient)")
      .attr("fill", "none")
        .attr("d", path)
      .on("mouseover", function(d) {
        d3.selectAll("path")
          .style("opacity", 0.1)
        d3.select(this)
        .style("stroke", "url(#svgGradientHov)")
        .style("opacity", 1)
        .style("stroke-width", 3)
        .style("cursor", "pointer")
      })
      .on("mouseout", function(d) {
        d3.selectAll("path")
          .style("opacity", 0.3)
        d3.select(this)
        .style("stroke", "")
        .style("opacity", 0.3)
        .style("stroke-width", 1)
        .style("cursor", "default")
      });
}

function position(d) {
  const v = dragging[d];
  return v == null ? x(d) : v;
}

function transition(g) {
  return g.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
  return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
}

function brushStart() {
  d3.event.sourceEvent.stopPropagation();
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
  const actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });
}
