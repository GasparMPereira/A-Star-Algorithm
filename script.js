class Graph {
    constructor() {
        this.nodes = new Set();
        this.edges = new Map();
    }

    addNode(node) {
        this.nodes.add(node);
        this.edges.set(node, []);
    }

    addEdge(node1, node2, weight) {
        this.edges.get(node1).push({ node: node2, weight: weight });
        this.edges.get(node2).push({ node: node1, weight: weight });
    }

    async aStar(start, end, highlightEdge, speed) {
        let distances = {};
        let prev = {};
        let pq = new PriorityQueue();
        let heuristics = {};

        this.nodes.forEach(node => {
            distances[node] = Infinity;
            heuristics[node] = this.heuristic(node, end);
            prev[node] = null;
        });

        distances[start] = 0;
        pq.enqueue(start, heuristics[start]);

        while (!pq.isEmpty()) {
            let { node: current } = pq.dequeue();

            if (current === end) {
                break;
            }

            for (let neighbor of this.edges.get(current)) {
                await highlightEdge(current, neighbor.node, speed);
                let alt = distances[current] + neighbor.weight;
                if (alt < distances[neighbor.node]) {
                    distances[neighbor.node] = alt;
                    prev[neighbor.node] = current;
                    pq.enqueue(neighbor.node, alt + heuristics[neighbor.node]);
                }
            }
        }

        return { distances, prev };
    }

    heuristic(node, end) {
        let pos1 = positions[node];
        let pos2 = positions[end];
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    }

    getPath(prev, start, end) {
        let path = [];
        for (let at = end; at !== null; at = prev[at]) {
            path.push(at);
        }
        path.reverse();
        if (path[0] === start) {
            return path;
        }
        return [];
    }
}

class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    enqueue(node, priority) {
        this.queue.push({ node, priority });
        this.queue.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.queue.shift();
    }

    isEmpty() {
        return this.queue.length === 0;
    }
}

// Canvas rendering
let canvas = document.getElementById('graphCanvas');
let ctx = canvas.getContext('2d');

function drawNode(x, y, label, isMain = false) {
    ctx.beginPath();
    ctx.arc(x, y, isMain ? 10 : 5, 0, Math.PI * 2, true);
    ctx.fillStyle = isMain ? '#ff0000' : '#0000ff'; // Red for main nodes, Blue for others
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = isMain ? '16px Arial' : '12px Arial';
    ctx.fillText(label, x - 5, y - 10);
}

function drawEdge(x1, y1, x2, y2, highlight = false, final = false) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = final ? '#00ff00' : (highlight ? '#ffff00' : '#000'); // Green for final path, Yellow for highlight
    ctx.lineWidth = final ? 3 : (highlight ? 2 : 1);
    ctx.stroke();
}

function generateNodeName(index) {
    let letter = String.fromCharCode(65 + Math.floor(index / 26));
    let number = (index % 26) + 1;
    return letter + number;
}

function createGraph(nodeCount) {
    let graph = new Graph();
    let positions = {};

    graph.addNode('A');
    let startX = Math.random() * (canvas.width - 40) + 20;
    let startY = Math.random() * (canvas.height - 40) + 20;
    positions['A'] = { x: startX, y: startY };

    graph.addNode('B');
    let endX = Math.random() * (canvas.width - 40) + 20;
    let endY = Math.random() * (canvas.height - 40) + 20;
    positions['B'] = { x: endX, y: endY };

    for (let i = 1; i <= nodeCount - 2; i++) {
        let nodeName = generateNodeName(i);
        graph.addNode(nodeName);
        let x = Math.random() * (canvas.width - 40) + 20;
        let y = Math.random() * (canvas.height - 40) + 20;
        positions[nodeName] = { x, y };
    }

    let nodes = Array.from(graph.nodes);

    function calculateDistance(node1, node2) {
        let pos1 = positions[node1];
        let pos2 = positions[node2];
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    }

    // Connect each node to its three nearest neighbors
    for (let i = 0; i < nodes.length; i++) {
        let distances = [];
        for (let j = 0; j < nodes.length; j++) {
            if (i !== j) {
                distances.push({ node: nodes[j], distance: calculateDistance(nodes[i], nodes[j]) });
            }
        }
        distances.sort((a, b) => a.distance - b.distance);
        for (let k = 0; k < 3 && k < distances.length; k++) {
            let weight = Math.floor(distances[k].distance);
            graph.addEdge(nodes[i], distances[k].node, weight);
        }
    }

    return { graph, positions };
}

async function highlightEdge(node1, node2, speed) {
    let pos1 = positions[node1];
    let pos2 = positions[node2];
    drawEdge(pos1.x, pos1.y, pos2.x, pos2.y, true);
    await new Promise(resolve => setTimeout(resolve, speed));
    drawEdge(pos1.x, pos1.y, pos2.x, pos2.y);
}

document.getElementById('startButton').addEventListener('click', async () => {
    document.getElementById('path').innerText = 'A calcular...';
    let nodeCount = parseInt(document.getElementById('nodeCount').value);
    let speed = parseInt(document.getElementById('speed').value);

    ({ graph, positions } = createGraph(nodeCount));

    // Clear and redraw canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw nodes and edges
    Object.keys(positions).forEach(node => {
        let pos = positions[node];
        drawNode(pos.x, pos.y, node, node === 'A' || node === 'B');
    });

    graph.edges.forEach((edges, node) => {
        let pos1 = positions[node];
        edges.forEach(edge => {
            let pos2 = positions[edge.node];
            drawEdge(pos1.x, pos1.y, pos2.x, pos2.y);
        });
    });

    let startNode = 'A';
    let endNode = 'B';
    let { distances, prev } = await graph.aStar(startNode, endNode, highlightEdge, speed);
    let path = graph.getPath(prev, startNode, endNode);

    if (path.length === 0) {
        document.getElementById('path').innerText = `Não foi possível encontrar um caminho de ${startNode} para ${endNode}`;
        return;
    }

    document.getElementById('path').innerText = `Melhor caminho de (${startNode} -> ${endNode}): ${path.join(' -> ')} com distância de ${distances[endNode]}`;

    // Highlight the best path
    for (let i = 0; i < path.length - 1; i++) {
        let pos1 = positions[path[i]];
        let pos2 = positions[path[i + 1]];
        drawEdge(pos1.x, pos1.y, pos2.x, pos2.y, false, true);
    }
});
