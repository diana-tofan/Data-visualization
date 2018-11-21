//----------------------------------------------------------------------------------------
//  READ INPUT FILE
//----------------------------------------------------------------------------------------
const reader = new FileReader();

let chosenDimensions = [];
let data = [];
let columns = [];
let selectedLines = [];

function loadFile() {
  const file = document.querySelector("input[type=file]").files[0];
  reader.addEventListener("load", parseFile, false);
  if (file) {
    reader.readAsText(file);
  }
}

function parseFile(){
  data = d3.csv.parse(reader.result, function(d, i) {
    d.lineClicked = false;
    d.id = i;
    return d;
  });

  columns = d3.keys(data[0]).filter(item => item !== "lineClicked" && item !== "id");

  // Keep only columns with numerical values
  d3.keys(data[0]).map(item => {
    const nested = d3.nest()
      .key(d => d[item])
      .entries(data);
    const numericalData = nested.filter(i => !isNaN(i.key));
    if (numericalData.length === 0) {
      columns = columns.filter(column => column !== item)
    }
  })

  d3.select(".section2").selectAll("*").remove();
  d3.select("svg").remove();
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
    .attr("class", "dimension")
    .classed("selectedDimension", true);

  chosenDimensions = columns;
  drawParallelCoordinates();

  d3.selectAll(".dimension").on("click", function() {
    d3.select("svg").remove();
    d3.select(".resetChart").selectAll("*").remove();
    selectedLines = [];
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

let background,
    foreground,
    isBrushingActive = false;

function createSvg() {
  svg = d3.select("body").select(".svg-elem").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}


function drawParallelCoordinates() {
  d3.select(".loading-spinner")
    .style("display", "unset");

  createSvg();

  d3.select("table").remove();

  let arr = [];

  x.domain(dimensions = chosenDimensions.filter(function(d) {
    return d != "name" && d != "lineClicked" && (y[d] = d3.scale.linear()
        .domain(d3.extent(data, function(p) { return +p[d]; }))
        .range([height, 0]));
  }).sort());

  var f = d3.interpolateHsl('#adf6ff', '#eeff84');
  var colors = [];
  var nColors = data.length;
  for (var i=0; i<nColors; i++)
    colors.push(f(i/(nColors-1)));

  // Add grey background lines for context.
  background = svg.append("g")
      .attr("class", "background")
    .selectAll("path")
      .data(data)
    .enter().append("path")
      .attr("d", path)
      .attr("stroke", "#4c575d")
      .attr("opacity", 0.2);

  // Add blue foreground lines for focus.
  foreground = svg.append("g")
    .attr("class", "foreground")
    .selectAll("path")
      .data(data)
    .enter().append("path")
    .attr("stroke", function(d, i) {
      return colors[i];
    })
    .attr("fill", "none")
      .attr("d", path)
      .attr("id", function(d) {
          return "line-" + d.id
        })
    .on("mouseover", function(d, i) {
      //IF there are no selected lines
      if (!isBrushingActive && selectedLines.length < 1) {
        //select all lines
        d3.selectAll("path")
          .style("opacity", 0.005)
          .style("cursor", "pointer")
        // select current line
        d3.select(this)
        .style("stroke", colors[i])
        .style("opacity", 1)
        .style("stroke-width", 3)
        .style("cursor", "pointer")
        d3.select("table").remove();
        arr.push(d);
        drawTable(arr);
      }
    })
    .on("mouseout", function(d) {
      if (!isBrushingActive && selectedLines.length < 1) {
        d3.selectAll("path")
          .style("opacity", 0.2)
        d3.select(this)
        .style("stroke", "")
        .style("opacity", 0.2)
        .style("stroke-width", 1)
        .style("cursor", "default")
        d3.select("table").remove();
        arr.pop();
      }
    })
    .on("click", function(d, i) {
      d3.select("table").remove();
      d.lineClicked = !d.lineClicked;
      if (selectedLines.filter(e => e === d).length > 0) {
        selectedLines = selectedLines.filter(item => item !== d)
      } else {
        selectedLines.push(d)
      }
      if (d.lineClicked) {
        d3.select(this)
        .style("stroke", colors[i])
        .style("opacity", 1)
        .style("stroke-width", 3)
        .style("cursor", "pointer")
      } else {
        d3.select(this)
        .style("stroke", "")
        .style("opacity", 0.005)
        .style("stroke-width", 1)
      }
      //there is at least one selected line
      if (selectedLines.length > 0) {
        d3.select(".resetChart").select("button").remove();
        drawTable(selectedLines);
        d3.select(".resetChart")
          .append("button")
          .text("Reset")
          .style("cursor", "pointer")
          .on("click", () => {
            selectedLines = [];
            d3.select(".resetChart").select("button").remove();
            d3.select("svg").remove();
            drawParallelCoordinates();
          });
      } else {
        d3.select("table").remove();
      }
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
          x.domain(dimensions)
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
  
  d3.select(".brushMode")
      .style("display", "initial");

  const brushMode = d3.select('#brushMode');

  d3.select('#btnReset').on('click', () => {
    d3.select(".resetChart").selectAll("*").remove();
    d3.select("svg").remove();
    selectedLines = [];
    drawParallelCoordinates();
  });

  brushMode.on('change', function() {
    switch(this.value) {
    case 'None':
      console.log(this.value);
      break;
    case '1D-axes':
      console.log(this.value);
      addBrush(g);
      break;
    case '1D-axes-multi':
      addMultiBrush(g);
      console.log(this.value);
    break;
    case '2D-strums':
      drawStrums(g);
      console.log(this.value);
      break;
    default:
      console.log(this.value);
      break;
    }
  });

  d3.select(".loading-spinner")
  .style("display", "none");
}

function addBrush(g) {
   // Add and store a brush for each axis.
   g.append("g")
   .attr("class", "brush")
   .each(function(d) {
     d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d])
     .on("brushstart", brushStart)
     .on("brush", brush)
     .on("brushend", () => isBrushingActive = false))
   })
 .selectAll("rect")
   .attr("x", -8)
   .attr("width", 16);
}

function addMultiBrush(g) {
  // Add and store a brush for each axis.
  g.append("svg:g")
      .attr("class", "brush")
      .each(function(d) {
				d3.select(this).call(y[d].brush = d3.svg.multibrush()
          .extentAdaption(resizeExtent)
          .y(y[d]).on("brushstart", () => isBrushingActive = true)
          .y(y[d]).on("brush", multiBrush)
          .y(y[d]).on("brushend", () => isBrushingActive = false));
			})
			.selectAll("rect").call(resizeExtent);
}

function resizeExtent(selection){
	selection
		.attr("x", -8)
		.attr("width", 16);
}

// Handles a brush event, toggling the display of foreground lines.
function multiBrush() {
  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
			return extents[i].some(function(e){
				return e[0] <= d[p] && d[p] <= e[1];
			});
    }) ? null : "none";
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
  isBrushingActive = true;
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

// Handles a brush event, toggling the display of foreground lines.
function multiBrush() {
  const actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
  extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
  return actives.every(function(p, i) {
        return extents[i].some(function(e){
            return e[0] <= d[p] && d[p] <= e[1];
        });
  }) ? null : "none";
 });
}

let strums = {},
  strumRect;

function drawStrums(g) {
  isBrushingActive = true;

  const drag = d3.behavior.drag();

  strums.active = undefined;
    strums.width = function(id) {
      var strum = strums[id];

      if (strum === undefined) {
        return undefined;
      }

      return strum.maxX - strum.minX;
    };

    d3.select("svg").on("axesreorder.strums", function() {
      var ids = Object.getOwnPropertyNames(strums).filter(function(d) {
        return !isNaN(d);
      });

      // Checks if the first dimension is directly left of the second dimension.
      function consecutive(first, second) {
        var length = chosenDimensions.length;
        return chosenDimensions.some(function(d, i) {
          return (d === first)
            ? i + i < length && chosenDimensions[i + 1] === second
            : false;
        });
      }

      if (ids.length > 0) { // We have some strums, which might need to be removed.
        ids.forEach(function(d) {
          var dims = strums[d].dims;
          strums.active = d;
          // If the two dimensions of the current strum are not next to each other
          // any more, than we'll need to remove the strum. Otherwise we keep it.
          if (!consecutive(dims.left, dims.right)) {
            removeStrum(strums);
          }
        });
        onDragEnd(strums)();
      }
    });

  d3.select("svg").append("g")
      .attr("id", "strums")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  drag
    .on("dragstart", onDragStart(strums))
    .on("drag", onDrag(strums))
    .on("dragend", onDragEnd(strums));

  strumRect = d3.select("svg").insert("rect", "g#strums")
    .attr("id", "strum-events")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", height + 2)
    .style("opacity", 0)
    .call(drag);
}

function onDragStart() {
  return function() {
    var p = d3.mouse(strumRect[0][0]),
    dims,
    strum;

    p[0] = p[0] - margin.left;
    p[1] = p[1] - margin.top;

    dims = getDimensions(p); // find out between which 2 axes the strum was started

    strum = {
      p1: p,
      dims: dims,
      minX: x(dims.left),
      maxX: x(dims.right),
      minY: 0,
      maxY: height
    };

    strums[dims.i] = strum;
    strums.active = dims.i;

    // Make sure that the point is within the bounds
    strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
    strum.p2 = strum.p1.slice();
  }
}

function orderDimensions() {
  return chosenDimensions.sort();
};

function getDimensions(p) {
  var dims = { i: -1, left: undefined, right: undefined };
    chosenDimensions.some((dim, i) => {
      if (x(dim) < p[0]) {
        var next = chosenDimensions[orderDimensions().indexOf(dim)+1];
        dims.i = i;
        dims.left = dim;
        dims.right = next;
        return false;
      }
      return true;
    });

    if (dims.left === undefined) {
      // Event on the left side of the first axis.
      dims.i = 0;
      dims.left = orderDimensions()[0];
      dims.right = orderDimensions()[1];
    } else if (dims.right === undefined) {
      // Event on the right side of the last axis
      dims.i = chosenDimensions.length - 1;
      dims.right = dims.left;
      dims.left = orderDimensions()[chosenDimensions.length - 2];
    }

    return dims;
}

function onDrag() {
  return function() {
    var ev = d3.event,
        strum = strums[strums.active];
    // Make sure that the point is within the bounds
    strum.p2[0] = Math.min(Math.max(strum.minX + 1, ev.x - margin.left), strum.maxX);
    strum.p2[1] = Math.min(Math.max(strum.minY, ev.y - margin.top), strum.maxY);
    drawStrum(strum, 1);
  };
}

function drawStrum(strum, activePoint) {
  var svg = d3.select("svg").select("g#strums"),
      id = strum.dims.i,
      points = [strum.p1, strum.p2],
      line = svg.selectAll("line#strum-" + id).data([strum]),
      circles = svg.selectAll("circle#strum-" + id).data(points),
      drag = d3.behavior.drag();

  line.enter()
    .append("line")
    .attr("id", "strum-" + id)
    .attr("class", "strum");

  line
    .attr("x1", function(d) {
      return d.p1[0]; })
    .attr("y1", function(d) {
      return d.p1[1]; })
    .attr("x2", function(d) {
      return d.p2[0]; })
    .attr("y2", function(d) {
      return d.p2[1]; })
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  drag
    .on("drag", function(d, i) {
      var ev = d3.event;
      i = i + 1;
      strum["p" + i][0] = Math.min(Math.max(strum.minX + 1, ev.x), strum.maxX);
      strum["p" + i][1] = Math.min(Math.max(strum.minY, ev.y), strum.maxY);
      drawStrum(strum, i - 1);
    })
    .on("dragend", onDragEnd());

  circles.enter()
    .append("circle")
    .attr("id", "strum-" + id)
    .attr("class", "strum");

  circles
    .attr("cx", function(d) { return d[0]; })
    .attr("cy", function(d) { return d[1]; })
    .attr("r", 5)
    .style("opacity", function(d, i) {
      return (activePoint !== undefined && i === activePoint) ? 0.8 : 0;
    })
    .on("mouseover", function() {
      d3.select(this).style("opacity", 0.8);
    })
    .on("mouseout", function() {
      d3.select(this).style("opacity", 0);
    })
    .call(drag);
}

function onDragEnd() {
  return function() {
    var brushed = data,
        strum = strums[strums.active];

    // Okay, somewhat unexpected, but not totally unsurprising, a mouseclick is
    // considered a drag without move. So we have to deal with that case
    if (strum && strum.p1[0] === strum.p2[0] && strum.p1[1] === strum.p2[1]) {
      removeStrum(strums);
    }

    brushed = selected(strums);
    // console.log(brushed);
    strums.active = undefined;
    renderBrushed(brushed);
    isBrushingActive = false;
  };
}

function renderBrushed(brushed) {
  foreground.style("display", function(d) {
    return brushed.includes(d) ? null : "none";
  });
}

function getYScale(d) {
  return d3.scale.linear()
  .domain(d3.extent(data, function(p) { return +p[d]; }))
  .range([height, 0])
}

function applyDimensionDefaults(dims) {
  dims = dims || chosenDimensions;
  var newDims = {};
  var currIndex = 0;
  dims.forEach(function(k) {
    newDims[k] = {};
    newDims[k].yScale = getYScale(k);
    newDims[k].index = newDims[k].index != null ? newDims[k].index : currIndex;
    currIndex++;
  });
  return newDims;
};

function selected() {
  var ids = Object.getOwnPropertyNames(strums),
      brushed = data;

  // Get the ids of the currently active strums.
  ids = ids.filter(function(d) {
    return !isNaN(d);
  });

  const dims = applyDimensionDefaults();

  function crossesStrum(d, id) {  
    var strum = strums[id],
        test = containmentTest(strum, strums.width(id)),
        d1 = strum.dims.left,
        d2 = strum.dims.right,
        y1 = dims[d1].yScale;
        y2 = dims[d2].yScale;
        point = [y1(d[d1]) - strum.minX, y2(d[d2]) - strum.minX];
    return test(point);
  }

  if (ids.length === 0) { return brushed; }
  
  
  return brushed.filter(function(d) {
      return ids.every(function(id) { return crossesStrum(d, id); });
    });
}


function containmentTest(strum, width) {
  var p1 = [strum.p1[0] - strum.minX, strum.p1[1] - strum.minX],
      p2 = [strum.p2[0] - strum.minX, strum.p2[1] - strum.minX],
      m1 = 1 - width / p1[0],
      b1 = p1[1] * (1 - m1),
      m2 = 1 - width / p2[0],
      b2 = p2[1] * (1 - m2);

  // test if point falls between lines
  return function(p) {
    var x = p[0],
        y = p[1],
        y1 = m1 * x + b1,
        y2 = m2 * x + b2;

    if (y > Math.min(y1, y2) && y < Math.max(y1, y2)) {
      return true;
    }

    return false;
  };
}

function removeStrum() {
  var strum = strums[strums.active],
      svg = d3.select("svg").select("g#strums");

  delete strums[strums.active];
  strums.active = undefined;
  svg.selectAll("line#strum-" + strum.dims.i).remove();
  svg.selectAll("circle#strum-" + strum.dims.i).remove();
}


function hideTicks() {
  // hack to hide ticks beyond extent
  var b = d3.selectAll('.dimension')[0]
    .forEach(function(element, i) {
      var dimension = d3.select(element).data()[0];
        var extent = extents[actives.indexOf(dimension)];
        d3.select(element)
          .selectAll('text')
          .style('font-weight', 'bold')
          .style('font-size', '13px')
          .style('display', function() {
            var value = d3.select(this).data();
            return extent[0] <= value && value <= extent[1] ? null : "none"
          });
        d3.select(element)
          .selectAll('text')
          .style('font-size', null)
          .style('font-weight', null)
          .style('display', null);
      d3.select(element)
        .selectAll('.label')
        .style('display', null);
    });
}

function drawTable(data) {
  var table = d3.select('.table').append('table');
  var titles = d3.keys(data[0]).filter(item => item !== "lineClicked" && item !== "id"); //chosenDimensions;
  var headers = table.append('thead').append('tr')
                  .selectAll('th')
                  .data(titles).enter()
                  .append('th')
                  .text(function (d) {
                    return d;
                  });

  var rows = table.append('tbody').selectAll('tr')
               .data(data).enter()
               .append('tr')
               .attr("id", function(d) {
                 return "row-" + d.id;
               })
                .on("mouseover", d => {
                  d3.select("#line-" + d.id).style("stroke", "pink");
                  selectedLines.forEach(line => {
                    d3.select("#line-" + line.id).style("opacity", 0.35)
                  })
                  d3.select("#line-" + d.id).style("opacity", 1);
                  d3.select("#row-" + d.id).style("background-color", "#4c575d")
                })
                .on("mouseout", d => {
                  selectedLines.forEach(line => {
                    d3.select("#line-" + line.id).style("opacity", 1)
                  })
                  d3.select("#line-" + d.id).style("stroke", "");
                  d3.select("#row-" + d.id).style("background-color", "#3B4347")
                })

  rows.selectAll('td')
    .data(function (d) {
      return titles.map(function (k) {
        return { 'value': d[k], 'name': k};
      });
    }).enter()
    .append('td')
    .attr('data-th', function (d) {
      return d.name;
    })
    .text(function (d) {
      return d.value;
    })
}
