class Screen {
  constructor(canvas) {
    this.canvas = canvas;
    this.artist = new Artist(canvas.getContext("2d"));
  }

  draw(board) {
    this.artist.clear(this.canvas.width, this.canvas.height);
    const boxsize = this.getBoxSize(board);

    var toVisit = [0];
    var alreadyDrawn = [];
    while (toVisit.length > 0) {
      var p = toVisit.shift();
      var sp = this.mapPointToScreen(p, board);

      const adjacentEdges = Object.entries(board.edgePool[p]).map(
        entry => entry[1]
      );


      // Each Adjacent edge
      adjacentEdges.forEach(edge => {
        // Each Adjacent Face
        edge.faces.forEach(adjacentFace => {
          if (adjacentFace.owner && !alreadyDrawn.includes(adjacentFace)) {
            const points = _.uniq(adjacentFace.edges.flatMap(e => e.ends));
            const min = points
              .slice(1)
              .reduce((min, p) => Math.min(min, p), points[0]);
            const loc = this.mapPointToScreen(min, board);
            this.artist.drawFace(adjacentFace.owner.color, loc, boxsize);
            alreadyDrawn.push(adjacentFace);
          }
        });

        // Draw Edge
        if (!alreadyDrawn.includes(edge)) {
          const spA = sp;
          const otherEnd = edge.ends.find(end => end != p);
          const spB = this.mapPointToScreen(otherEnd, board);
          this.artist.drawEdge(spA, spB, edge.owner);
          alreadyDrawn.push(edge);
        }
      });

      // draw current point
      if (!alreadyDrawn.includes(p)) {
        // check if connected edges are owned
        const ownedAdjacent = adjacentEdges.some(edge => edge.owner);
        this.artist.drawPoint(sp, ownedAdjacent);
        alreadyDrawn.push(p);
      }
      
      // queue next points
      Object.keys(board.edgePool[p]).forEach(endP => {
        if (!alreadyDrawn.includes(endP) && !toVisit.includes(endP)) {
          // if not processed or queued, queue it
          toVisit.push(endP);
        }
      });
    }
  }

  mapPointToScreen(point, board) {
    // factors represent location as a scale
    const xFactor = (point % board.width) / board.width;
    const yFactor = Math.trunc(point / board.width) / board.height;

    const boxSize = this.getBoxSize(board);
    return {
      x: this.canvas.clientWidth * xFactor + boxSize.x / 2,
      y: this.canvas.clientHeight * yFactor + boxSize.y / 2
    };
  }

  getBoxSize(board) {
    const clientWidth = this.canvas.clientWidth;
    const clientHeight = this.canvas.clientHeight;
    return {
      x: clientWidth / board.width,
      y: clientHeight / board.height
    };
  }

  getScreenMargin(board) {
    const boxSize = this.getBoxSize(board);
    return {
      x: boxSize.x / 2,
      y: boxSize.y / 2
    };
  }

  mapScreenToEdge(sp, board) {
    const boxSize = this.getBoxSize(board);
    const margin = this.getScreenMargin(board);

    // factors represent a percentage in board coordinates
    const xFactor = (sp.x - margin.x) / (this.canvas.clientWidth - boxSize.x);
    const yFactor = (sp.y - margin.y) / (this.canvas.clientHeight - boxSize.y);
    debugLog("xFactor:" + xFactor + " yFactor:" + yFactor);

    // ratios are the scaled board coordinate
    const xRatio = xFactor * (board.width - 1),
      yRatio = yFactor * (board.height - 1);
    debugLog("Ratio: " + xRatio + ", " + yRatio);

    // round is the nearest actual coordinate
    const xRound = Math.round(xRatio),
      yRound = Math.round(yRatio);
    debugLog("Rounded: " + xRound + ", " + yRound);

    var p1, p2;
    // check if mouse is closer to a horizontal or vertical edge, then translate to edge endpoints.
    debugLog(
      "x: " + Math.abs(xRound - xRatio) + " vs y: " + Math.abs(yRound - yRatio)
    );
    if (Math.abs(yRound - yRatio) < Math.abs(xRound - xRatio)) {
      p1 = yRound * board.width + Math.floor(xRatio);
      p2 = p1 + 1;
    } else {
      p1 = Math.floor(yRatio) * board.width + xRound;
      p2 = p1 + board.width;
    }
    // with the endpoints, the edge obj can be pulled from the edge pool
    return board.getEdge(p1, p2);
  }

  selectEdge(evt, player, board) {
    const margin = this.getScreenMargin(board);
    const mousePos = this.getMousePos(evt, margin);

    const edge = this.mapScreenToEdge(mousePos, board);
    if (edge) {
      board.play(edge, player);
      this.draw(board);
    }
  }

  getMousePos(evt, margin) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: this.clamp(evt.clientX - rect.left, margin.x, rect.right - margin.x),
      y: this.clamp(evt.clientY - rect.top, margin.y, rect.bottom - margin.y)
    };
  }

  clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }
}
