/*
 * Interactive behaviour for the cascading manufacturing visualisation.
 * - Grid layout organized by degree (cascade level)
 * - Fixed, tunable node size
 * - Larger transparent hit area for easy tapping
 * - Word-per-line label wrapping via <tspan>, centered on the node
 * - D3 zoom & pan
 * - Search/filter, reset
 * - Popup wired to #overlay, #infoPanel, #panelTitle, #panelContent (matches index.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof d3 === 'undefined') {
    console.error('D3.js is not loaded. Include d3.v7.min.js before this script.');
    return;
  }

  // ===== TUNE THESE SIZES TO YOUR LIKING =====
  const VISIBLE_R = 34;     // visible circle radius (px)
  const HIT_PAD   = 20;     // extra padding for hit area (px)
  const HIT_R     = VISIBLE_R + HIT_PAD;
  const FONT_PX   = 10;     // label font (px)
  const LINE_EM   = 1.0;    // line height for tspans (em)
  const COL_SPACING = 180;  // horizontal spacing between nodes
  const ROW_SPACING = 150;  // vertical spacing between rows
  // ===========================================

  const svg       = d3.select('#diagram');
  const container = document.getElementById('diagramWrapper');
  const graph     = svg.append('g').attr('class', 'graph');

  let currentTransform = d3.zoomIdentity;

  // Organize nodes by degree for grid layout
  function calculateGridPositions() {
    // Group nodes by degree
    const nodesByDegree = {};
    window.nodes.forEach(node => {
      if (!nodesByDegree[node.deg]) {
        nodesByDegree[node.deg] = [];
      }
      nodesByDegree[node.deg].push(node);
    });

    // Assign grid positions
    const degrees = Object.keys(nodesByDegree).map(Number).sort((a, b) => a - b);
    
    degrees.forEach((deg, rowIndex) => {
      const nodesInRow = nodesByDegree[deg];
      const rowWidth = (nodesInRow.length - 1) * COL_SPACING;
      const startX = -rowWidth / 2; // Center the row
      
      nodesInRow.forEach((node, colIndex) => {
        node.x = startX + colIndex * COL_SPACING;
        node.y = rowIndex * ROW_SPACING;
      });
    });

    // Calculate bounds
    const xs = window.nodes.map(n => n.x);
    const ys = window.nodes.map(n => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }

  function drawGraph() {
    graph.selectAll('*').remove();

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Calculate positions
    const bounds = calculateGridPositions();

    // Fit to view with a small margin
    const kx = w / bounds.width;
    const ky = h / bounds.height;
    const k  = Math.min(kx, ky) * 0.85;
    const tx = (w - bounds.width * k) / 2 - bounds.minX * k;
    const ty = (h - bounds.height * k) / 2 - bounds.minY * k + 50; // Add top margin
    currentTransform = d3.zoomIdentity.translate(tx, ty).scale(k);

    // ----- LINKS -----
    graph.selectAll('line.link')
      .data(window.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => {
        const src = window.nodes.find(n => n.id === d[0]);
        return window.colors[src?.cat] || '#999';
      })
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1.5)
      .attr('x1', d => window.nodes.find(n => n.id === d[0]).x)
      .attr('y1', d => window.nodes.find(n => n.id === d[0]).y)
      .attr('x2', d => window.nodes.find(n => n.id === d[1]).x)
      .attr('y2', d => window.nodes.find(n => n.id === d[1]).y);

    // ----- NODES -----
    const nodes = graph.selectAll('g.node')
      .data(window.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', d => d.id);

    // Visible circle
    nodes.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', VISIBLE_R)
      .attr('fill', d => window.colors[d.cat] || '#aaa')
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (_, d) => showPanel(d));

    // Transparent hit circle (larger tap target)
    nodes.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', HIT_R)
      .attr('fill', 'transparent')
      .style('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', (_, d) => showPanel(d));

    // Labels: word-per-line tspans, vertically centered
    nodes.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('font-size', `${FONT_PX}px`)
      .attr('fill', '#000')
      .style('pointer-events', 'auto')
      .style('cursor', 'pointer')
      .each(function(d) {
        const words = (d.label || '').split(/\s+/);
        const text  = d3.select(this);
        const startDy = -((words.length - 1) * LINE_EM) / 2;
        words.forEach((word, i) => {
          text.append('tspan')
            .text(word)
            .attr('x', d.x)
            .attr('dy', (i === 0 ? startDy : LINE_EM) + 'em');
        });
      })
      .on('click', (_, d) => showPanel(d));

    // Apply initial fit transform
    graph.attr('transform', currentTransform.toString());
  }

  // Initial draw
  drawGraph();

  // Zoom/pan
  const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (ev) => {
      currentTransform = ev.transform;
      graph.attr('transform', currentTransform.toString());
    });
  svg.call(zoom);

  // Preserve zoom state on resize
  window.addEventListener('resize', () => {
    drawGraph();
    svg.call(zoom.transform, currentTransform);
  });

  /* ========================
     SEARCH
     ======================== */
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLowerCase();
      graph.selectAll('g.node').each(function(d) {
        const match = d.label.toLowerCase().includes(term);
        const vis = d3.select(this).select('circle');
        vis.attr('stroke-width', match && term ? 4 : 1.5)
           .attr('stroke', match && term ? '#e74c3c' : '#333');

        const fade = term && !match ? 0.2 : 1;
        d3.select(this).selectAll('circle').attr('opacity', fade);
        d3.select(this).select('text').attr('opacity', fade);
      });
      svg.selectAll('line.link').attr('opacity', term ? 0.2 : 1);
    });
  }

  /* ========================
     BUTTON HOOKS (from HTML)
     ======================== */
  window.toggleLabels = function() {
    const texts = graph.selectAll('text');
    const cur = texts.style('display');
    texts.style('display', cur === 'none' ? 'block' : 'none');
  };

  window.resetView = function() {
    graph.selectAll('g.node').each(function() {
      d3.select(this).selectAll('circle')
        .attr('opacity', 1)
        .attr('stroke', '#333')
        .attr('stroke-width', 1.5);
      d3.select(this).select('text').attr('opacity', 1);
    });
    svg.selectAll('line.link')
      .attr('opacity', 1)
      .attr('stroke-width', 1.5);
    if (searchInput) searchInput.value = '';
    svg.transition().duration(500).call(zoom.transform, currentTransform);
  };

  /* ========================
     POPUP PANEL
     ======================== */
  let selectedNode = null;

  function showPanel(node) {
    // de-select previous
    if (selectedNode) {
      const prev = graph.select(`g.node[data-id="${selectedNode.id}"]`);
      prev.select('circle').classed('selected', false);
    }
    selectedNode = node;
    const group = graph.select(`g.node[data-id="${node.id}"]`);
    group.select('circle').classed('selected', true);

    const overlay      = document.getElementById('overlay');
    const infoPanel    = document.getElementById('infoPanel');
    const panelTitle   = document.getElementById('panelTitle');
    const panelContent = document.getElementById('panelContent');

    panelTitle.textContent = node.label;

    panelContent.innerHTML = `
      <div class="info-section">
        <div>${window.descriptions[node.id] || 'No description available.'}</div>
      </div>
    `;

    overlay.classList.add('visible');
    infoPanel.classList.add('visible');
  }

  window.closePanel = function() {
    if (selectedNode) {
      const prev = graph.select(`g.node[data-id="${selectedNode.id}"]`);
      prev.select('circle').classed('selected', false);
      selectedNode = null;
    }
    document.getElementById('overlay').classList.remove('visible');
    document.getElementById('infoPanel').classList.remove('visible');
  };
});
