<script>
class ProbabilityPainter {
    constructor() {
        this.colors = {
            red: { hex: '#e74c3c', name: 'Event A', prob: 0.3 },
            blue: { hex: '#3498db', name: 'Event B', prob: 0.4 },
            green: { hex: '#2ecc71', name: 'Event C', prob: 0.2 },
            yellow: { hex: '#f1c40f', name: 'Event D', prob: 0.1 }
        };
        this.currentLevel = 1;
        this.score = 0;
        this.selectedColor = null;
        this.probabilities = {};
        this.cy = null;
        this.currentView = 'graph';
        this.initializeGame();
    }

    initializeGame() {
        this.cy = cytoscape({
            container: document.getElementById('game-board'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#bdc3c7',
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': '60px',
                        'height': '60px',
                        'font-size': '20px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#95a5a6',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'circle'
            }
        });

        this.setupEventListeners();
        this.generateLevel(this.currentLevel);
    }

    setupEventListeners() {
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedColor = e.target.dataset.color;
            });

            // Add hover tooltip
            btn.addEventListener('mouseover', (e) => {
                const color = e.target.dataset.color;
                const prob = this.colors[color].prob;
                this.showTooltip(e, `${this.colors[color].name}: ${prob}`);
            });

            btn.addEventListener('mouseout', () => {
                this.hideTooltip();
            });
        });

        document.querySelectorAll('.color-probability').forEach(input => {
            input.addEventListener('change', (e) => {
                const color = e.target.parentElement.querySelector('.color-btn').dataset.color;
                this.colors[color].prob = parseFloat(e.target.value);
                this.updateProbabilityDisplay();
            });
        });

        this.cy.on('tap', 'node', (evt) => {
            if (this.selectedColor) {
                const node = evt.target;
                node.style('background-color', this.colors[this.selectedColor].hex);
                this.updateProbability(node.id());
                if (this.currentView === 'partition') {
                    this.renderPartitionView();
                }
            }
        });

        document.getElementById('check-solution').addEventListener('click', () => this.checkSolution());
        document.getElementById('next-level').addEventListener('click', () => this.nextLevel());
        document.getElementById('restart-game').addEventListener('click', () => this.restartGame());
        document.getElementById('toggle-view').addEventListener('click', () => this.toggleView());
    }

    showTooltip(event, text) {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.display = 'block';
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        tooltip.textContent = text;
    }

    hideTooltip() {
        document.getElementById('tooltip').style.display = 'none';
    }

    generateLevel(level) {
        this.cy.elements().remove();
        const numNodes = level + 2;

        // Create nodes in a circle layout
        for (let i = 0; i < numNodes; i++) {
            const angle = (2 * Math.PI * i) / numNodes;
            const radius = 200;
            const x = 300 + radius * Math.cos(angle);
            const y = 300 + radius * Math.sin(angle);

            this.cy.add({
                group: 'nodes',
                data: { id: i.toString() },
                position: { x, y }
            });

            this.probabilities[i] = Math.round(Math.random() * 100) / 100;
        }

        // Create edges with increasing complexity based on level
        const edgeProbability = 0.3 + (level * 0.1);
        for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
                if (Math.random() < edgeProbability) {
                    this.cy.add({
                        group: 'edges',
                        data: { id: `${i}-${j}`, source: i.toString(), target: j.toString() }
                    });
                }
            }
        }

        this.updateProbabilityDisplay();
        this.displayMessage(`Level ${level}: Color the vertices so no adjacent vertices share the same color!`);
    }

    toggleView() {
        if (this.currentView === 'graph') {
            this.currentView = 'partition';
            document.getElementById('game-board').style.display = 'none';
            document.getElementById('partition-view').style.display = 'block';
            this.renderPartitionView();
        } else {
            this.currentView = 'graph';
            document.getElementById('game-board').style.display = 'block';
            document.getElementById('partition-view').style.display = 'none';
        }
    }

    renderPartitionView() {
        const nodes = this.cy.nodes();
        const data = [{
            type: 'bar',
            x: nodes.map(node => `Region ${node.id()}`),
            y: nodes.map(node => this.probabilities[node.id()]),
            marker: {
                color: nodes.map(node => node.style('background-color'))
            }
        }];

        const layout = {
            title: 'Probability Distribution by Region',
            xaxis: { title: 'Regions' },
            yaxis: { title: 'Probability', range: [0, 1] },
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff'
        };

        Plotly.newPlot('partition-view', data, layout);
    }

    updateProbability(nodeId) {
        if (!this.selectedColor) return;

        const colorInfo = this.colors[this.selectedColor];
        const prior = this.probabilities[nodeId];
        const likelihood = colorInfo.prob;
        
        // Bayes' Theorem calculation
        const marginal = prior * likelihood + (1 - prior) * (1 - likelihood);
        this.probabilities[nodeId] = Math.round((prior * likelihood / marginal) * 100) / 100;
        
        this.updateProbabilityDisplay();
    }

    updateProbabilityDisplay() {
        const container = document.getElementById('probabilities-container');
        container.innerHTML = '<h3>Region Probabilities:</h3>';
        
        Object.entries(this.probabilities).forEach(([nodeId, prob]) => {
            const node = this.cy.$id(nodeId);
            const color = node.style('background-color');
            const div = document.createElement('div');
            div.className = 'probability-display';
            
            const label = document.createElement('span');
            label.textContent = `Region ${nodeId}:`;
            
            const probBar = document.createElement('div');
            probBar.className = 'probability-bar';
            probBar.style.width = `${prob * 100}%`;
            probBar.style.backgroundColor = color === '#bdc3c7' ? '#95a5a6' : color;
            
            const probValue = document.createElement('span');
            probValue.textContent = prob.toFixed(2);
            
            div.appendChild(label);
            div.appendChild(probBar);
            div.appendChild(probValue);
            container.appendChild(div);
        });
    }

    checkSolution() {
        let valid = true;
        let allColored = true;

        this.cy.nodes().forEach(node => {
            if (node.style('background-color') === '#bdc3c7') {
                allColored = false;
            }
        });

        if (!allColored) {
            this.displayMessage('Please color all regions before checking the solution.');
            return;
        }

        this.cy.edges().forEach(edge => {
            const sourceColor = edge.source().style('background-color');
            const targetColor = edge.target().style('background-color');
            if (sourceColor === targetColor) {
                valid = false;
            }
        });

        if (valid) {
            const levelBonus = this.currentLevel * 100;
            const probabilityBonus = Math.round(Object.values(this.probabilities).reduce((a, b) => a + b, 0) * 50);
            const totalPoints = levelBonus + probabilityBonus;
            
            this.score += totalPoints;
            document.getElementById('score').textContent = this.score;
            this.displayMessage(`Correct! You earned ${totalPoints} points (${levelBonus} level bonus + ${probabilityBonus} probability bonus). Click "Next Level" to continue.`);
        } else {
            this.displayMessage('Invalid solution. Adjacent regions share the same color.');
        }
    }

    nextLevel() {
        this.currentLevel++;
        document.getElementById('level').textContent = this.currentLevel;
        this.generateLevel(this.currentLevel);
    }

    restartGame() {
        this.currentLevel = 1;
        this.score = 0;
        document.getElementById('level').textContent = this.currentLevel;
        document.getElementById('score').textContent = this.score;
        this.generateLevel(this.currentLevel);
    }

    displayMessage(message) {
        const messageBox = document.getElementById('message-box');
        messageBox.textContent = message;
        messageBox.style.opacity = '0';
        setTimeout(() => {
            messageBox.style.opacity = '1';
        }, 100);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new ProbabilityPainter();
});
</script>
</body>
</html>
