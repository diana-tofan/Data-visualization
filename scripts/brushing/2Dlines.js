let strums = {},
  strumRect;

function drawLines() {
  isBrushingActive = true;

  d3.select("svg").select("g#strums").remove();
  d3.select("svg").select("rect#strum-events").remove();
  d3.select("svg").on("axesreorder.strums", undefined);
  
  strumRect = undefined;

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
