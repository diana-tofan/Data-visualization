var arcs = {},
    anglesRect;

function drawAngle(arc, activePoint) {
  var svg = d3.select("svg").select("g#arcs"),
      id = arc.dims.i,
      points = [arc.p2, arc.p3],
      line = svg.selectAll("line#arc-" + id).data([{p1:arc.p1,p2:arc.p2},{p1:arc.p1,p2:arc.p3}]),
      circles = svg.selectAll("circle#arc-" + id).data(points),
      drag = d3.behavior.drag(),
      path = svg.selectAll("path#arc-" + id).data([arc]);

  path.enter()
    .append("path")
    .attr("id", "arc-" + id)
    .attr("class", "arc")
    .style("fill", "orange")
    .style("opacity", 0.5);

  path
    .attr("d", arc.arc)
    .attr("transform", "translate(" + arc.p1[0] + "," + arc.p1[1] + ")");

  line.enter()
    .append("line")
    .attr("id", "arc-" + id)
    .attr("class", "arc");

  line
    .attr("x1", function(d) { return d.p1[0]; })
    .attr("y1", function(d) { return d.p1[1]; })
    .attr("x2", function(d) { return d.p2[0]; })
    .attr("y2", function(d) { return d.p2[1]; })
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  drag
    .on("drag", function(d, i) {
      var ev = d3.event,
        angle = 0;

      i = i + 2;

      arc["p" + i][0] = Math.min(Math.max(arc.minX + 1, ev.x), arc.maxX);
      arc["p" + i][1] = Math.min(Math.max(arc.minY, ev.y), arc.maxY);

      angle = i === 3 ? arcs.startAngle(id) : arcs.endAngle(id);

      if ((arc.startAngle < Math.PI && arc.endAngle < Math.PI && angle < Math.PI) ||
          (arc.startAngle >= Math.PI && arc.endAngle >= Math.PI && angle >= Math.PI)) {

        if (i === 2) {
          arc.endAngle = angle;
          arc.arc.endAngle(angle);
        } else if (i === 3) {
          arc.startAngle = angle;
          arc.arc.startAngle(angle);
        }

      }

      drawAngle(arc, i - 2);
    })
    .on("dragend", onDragAngleEnd());

  circles.enter()
    .append("circle")
    .attr("id", "arc-" + id)
    .attr("class", "arc");

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

function onDragAngleStart() {
  return function() {
    isBrushingActive = true;

    var p = d3.mouse(anglesRect[0][0]),
        dims,
        arc;

    p[0] = p[0] - margin.left;
    p[1] = p[1] - margin.top;

    dims = getDimensions(p),
    arc = {
      p1: p,
      dims: dims,
      minX: x(dims.left),
      maxX: x(dims.right),
      minY: 0,
      maxY: height,
      startAngle: undefined,
      endAngle: undefined,
      arc: d3.svg.arc().innerRadius(0)
    };

    arcs[dims.i] = arc;
    arcs.active = dims.i;

    // Make sure that the point is within the bounds
    arc.p1[0] = Math.min(Math.max(arc.minX, p[0]), arc.maxX);
    arc.p2 = arc.p1.slice();
    arc.p3 = arc.p1.slice();
  };
}

function onDragAngle() {
  return function() {
    var ev = d3.event,
    arc = arcs[arcs.active];

    // Make sure that the point is within the bounds
    arc.p2[0] = Math.min(Math.max(arc.minX + 1, ev.x - margin.left), arc.maxX);
    arc.p2[1] = Math.min(Math.max(arc.minY, ev.y - margin.top), arc.maxY);
    arc.p3 = arc.p2.slice();
  //      console.log(arcs.angle(arcs.active));
  //      console.log(signedAngle(arcs.unsignedAngle(arcs.active)));
    drawAngle(arc, 1);
  };
}

// some helper functions
function hypothenuse(a, b) {
  return Math.sqrt(a*a + b*b);
}

var rad = (function() {
  var c = Math.PI / 180;
  return function(angle) {
    return angle * c;
  };
})();

var deg = (function() {
  var c = 180 / Math.PI;
  return function(angle) {
    return angle * c;
  };
})();

// [0, 2*PI] -> [-PI/2, PI/2]
var signedAngle = function(angle) {
  var ret = angle;
  if (angle > Math.PI) {
    ret = angle - 1.5 * Math.PI;
    ret = angle - 1.5 * Math.PI;
  } else {
    ret = angle - 0.5 * Math.PI;
    ret = angle - 0.5 * Math.PI;
  }
  return -ret;
}

/**
 * angles are stored in radians from in [0, 2*PI], where 0 in 12 o'clock.
 * However, one can only select lines from 0 to PI, so we compute the
 * 'signed' angle, where 0 is the horizontal line (3 o'clock), and +/- PI/2
 * are 12 and 6 o'clock respectively.
 */
function containmentTestAngle(arc) {
  var startAngle = signedAngle(arc.startAngle);
  var endAngle = signedAngle(arc.endAngle);

  if (startAngle > endAngle) {
    var tmp = startAngle;
    startAngle = endAngle;
    endAngle = tmp;
  }

  // test if segment angle is contained in angle interval
  return function(a) {

    if (a >= startAngle && a <= endAngle) {
      return true;
    }

    return false;
  };
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

function getSelectedLines() {
  var ids = Object.getOwnPropertyNames(arcs),
      brushed = data;

  // Get the ids of the currently active arcs.
  ids = ids.filter(function(d) {
    return !isNaN(d);
  });

  const dims = applyDimensionDefaults();

  function crossesAngle(d, id) {
    var arc = arcs[id],
        test = containmentTestAngle(arc),
        d1 = arc.dims.left,
        d2 = arc.dims.right,
        y1 = dims[d1].yScale;
        y2 = dims[d2].yScale;
        a = arcs.width(id),
        b = y1(d[d1]) - y2(d[d2]),
        c = hypothenuse(a, b),
        angle = Math.asin(b/c);	// rad in [-PI/2, PI/2]
    return test(angle);
  }

  if (ids.length === 0) { return brushed; }
 
  return brushed.filter(function(d) {
    if (predicate === 'AND') {
      return ids.every(function(id) { return crossesAngle(d, id); });
    } else {
      return ids.some(function(id) { return crossesAngle(d, id); });
    }
  });
}

function removeAngle() {
  var arc = arcs[arcs.active],
      svg = d3.select("svg").select("g#arcs");

  delete arcs[arcs.active];
  arcs.active = undefined;
  svg.selectAll("line#arc-" + arc.dims.i).remove();
  svg.selectAll("circle#arc-" + arc.dims.i).remove();
  svg.selectAll("path#arc-" + arc.dims.i).remove();
}

function onDragAngleEnd() {
  return function() {    
    var brushed = data,
        arc = arcs[arcs.active];

    // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
    // considered a drag without move. So we have to deal with that case
    if (arc && arc.p1[0] === arc.p2[0] && arc.p1[1] === arc.p2[1]) {
      removeAngle(arcs);
    }

    if (arc) {
      var angle = arcs.startAngle(arcs.active);

      arc.startAngle = angle;
        arc.endAngle = angle;
        arc.arc
          .outerRadius(arcs.length(arcs.active))
          .startAngle(angle)
          .endAngle(angle);
    }


    brushed = getSelectedLines(arcs);
    arcs.active = undefined;
    renderBrushed(brushed);
    updateCounter(brushed.length);
    isBrushingActive = false;
  };
}

function renderBrushed(brushed) {
  foreground.style("display", function(d) {
    return brushed.includes(d) ? null : "none";
  });
}

function brushReset(arcs) {
  return function() {
    var ids = Object.getOwnPropertyNames(arcs).filter(function(d) {
      return !isNaN(d);
    });

    ids.forEach(function(d) {
      arcs.active = d;
      removeAngle(arcs);
    });
    onDragAngleEnd(arcs)();
  };
}

function drawAngles() {
  var drag = d3.behavior.drag();

  d3.select("svg").select("g#arcs").remove();
  d3.select("svg").select("rect#arc-events").remove();
  d3.select("svg").on("axesreorder.arcs", undefined);
  // delete pc.brushReset;

  anglesRect = undefined;

  arcs.active = undefined;
  
  arcs.width = function(id) {
    var arc = arcs[id];

    if (arc === undefined) {
      return undefined;
    }

    return arc.maxX - arc.minX;
  };

  // returns angles in [-PI/2, PI/2]
  var angle = function(p1, p2) {
      var a = p1[0] - p2[0],
        b = p1[1] - p2[1],
        c = hypothenuse(a, b);

      return Math.asin(b/c);
  }

  // returns angles in [0, 2 * PI]
  arcs.endAngle = function(id) {
    var arc = arcs[id];
    if (arc === undefined) {
          return undefined;
      }
    var sAngle = angle(arc.p1, arc.p2),
      uAngle = -sAngle + Math.PI / 2;

    if (arc.p1[0] > arc.p2[0]) {
      uAngle = 2 * Math.PI - uAngle;
    }

    return uAngle;
  }

  arcs.startAngle = function(id) {
    var arc = arcs[id];
    if (arc === undefined) {
          return undefined;
      }

    var sAngle = angle(arc.p1, arc.p3),
      uAngle = -sAngle + Math.PI / 2;

    if (arc.p1[0] > arc.p3[0]) {
      uAngle = 2 * Math.PI - uAngle;
    }

    return uAngle;
  }

  arcs.length = function(id) {
    var arc = arcs[id];

      if (arc === undefined) {
        return undefined;
      }

      var a = arc.p1[0] - arc.p2[0],
        b = arc.p1[1] - arc.p2[1],
        c = hypothenuse(a, b);

      return(c);
  }

  d3.select("svg").on("axesreorder.arcs", function() {
    var ids = Object.getOwnPropertyNames(arcs).filter(function(d) {
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

    if (ids.length > 0) { // We have some arcs, which might need to be removed.
      ids.forEach(function(d) {
        var dims = arcs[d].dims;
        arcs.active = d;
        // If the two dimensions of the current arc are not next to each other
        // any more, than we'll need to remove the arc. Otherwise we keep it.
        if (!consecutive(dims.left, dims.right)) {
          removeAngle(arcs);
        }
      });
      onDragAngleEnd(arcs)();
    }
  });

  // Add a new svg group in which we draw the arcs.
  d3.select("svg").append("g")
    .attr("id", "arcs")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  drag
    .on("dragstart", onDragAngleStart(arcs))
    .on("drag", onDragAngle(arcs))
    .on("dragend", onDragAngleEnd(arcs));

  anglesRect = d3.select("svg").insert("rect", "g#arcs")
    .attr("id", "arc-events")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", height + 2)
    .style("opacity", 0)
    .call(drag);
}
