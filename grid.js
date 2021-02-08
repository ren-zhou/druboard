var cell_px = 40;

const grid = document.getElementById("main-grid");
const clueList = document.getElementById("clue-list");

class Game {
    constructor(gridElement, cluesElement, template) {
        this.grid = gridElement;
        this.clueList = cluesElement;

        this.width = template["width"];
        this.height = template["height"];
        this.answers = template["grid"];
        this.wordclues = template["clues"];
        // Initialize game
        this.state = [];
        let clueidx = 1;
        for (let i = 0; i < this.height; i++) {
            let row = [];
            for (let j = 0; j < this.width; j++) {
                if (this.answers[i][j] != null) {
                    // Check if cell is start of any clues
                    let clues = {
                        "across": null,
                        "down": null
                    };
                    if ((i == 0 || this.answers[i - 1][j] == null) &&
                        !(i == this.height - 1 || this.answers[i + 1][j] == null)) {
                        clues["down"] = clueidx;
                    }
                    if ((j == 0 || this.answers[i][j - 1] == null) &&
                        !(j == this.width - 1 || this.answers[i][j + 1] == null)) {
                        clues["across"] = clueidx;
                    }
                    let label = null;
                    if (clues["across"] || clues["down"]) {
                        label = clueidx;
                        clueidx++;
                    }
                    // Propagate clue association
                    if (i != 0 && this.answers[i - 1][j] != null) {
                        clues["down"] = this.state[i - 1][j]["clues"]["down"];
                    }
                    if (j != 0 && this.answers[i][j - 1] != null) {
                        clues["across"] = row[j - 1]["clues"]["across"];
                    }
                    row.push({
                        "cell": true,
                        "value": "",
                        "locked": false,
                        "clues": clues,
                        "label": label
                    });
                } else {
                    row.push({
                        "cell": false
                    });
                }
            }
            this.state.push(row);
        }
        // Populate clues
        this.clues = [null];
        for (let i = 1; i < clueidx; i++) {
            this.clues.push({
                "across": [],
                "down": []
            });
        }
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.state[i][j]["cell"]) {
                    let clues = this.state[i][j]["clues"];
                    if (clues["across"]) {
                        this.clues[clues["across"]]["across"].push([i, j]);
                    }
                    if (clues["down"]) {
                        this.clues[clues["down"]]["down"].push([i, j]);
                    }
                }
            }
        }
        // Draw to page
        this.renderCells();
        this.renderClues();
        // Initialize UI
        this.selection = {"index": 0, "direction": "across", "position": 0};
        this.selectCell(0, 0);
        this.validateAnswers("grid");
    }

    renderCells() {
        this.grid.innerHTML = "";
        for (let i = 0; i < this.height; i++) {
            let row = document.createElement("tr");
            for (let j = 0; j < this.width; j++) {
                let cell = document.createElement("td");
                cell.className = "cell";
                cell.id = "cell-" + i + "-" + j;
                if (this.state[i][j]["cell"]) {
                    cell.addEventListener("click", clickCell);
                    // Value
                    let value = document.createElement("span");
                    value.innerText = this.state[i][j]["value"];
                    cell.appendChild(value);
                    // Clue label
                    if (this.state[i][j]["label"] != null) {
                        let label = document.createElement("span");
                        label.className = "cell-label";
                        label.innerText = this.state[i][j]["label"];
                        cell.appendChild(label);
                    }
                } else {
                    cell.className = "cell black";
                }
                row.appendChild(cell);
            }
            this.grid.appendChild(row);
        }
        // Initial clue list
        let idx = 0;
        let acrossBox = this.clueList.querySelector("#clues-across");
        for (let c = 1; c < this.clues.length; c++) {
            if (this.clues[c]["across"].length) {
                let div = document.createElement("div");
                div.innerText = c + " " + this.wordclues["across"][idx++];
                acrossBox.appendChild(div);
            }
        }
        idx = 0;
        let downBox = this.clueList.querySelector("#clues-down");
        for (let c = 1; c < this.clues.length; c++) {
            if (this.clues[c]["down"].length) {
                let div = document.createElement("div");
                div.innerText = c + " " + this.wordclues["down"][idx++];
                downBox.appendChild(div);
            }
        }
    }

    renderClues() {
        // TODO
    }

    renderSelection() {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                let cell = this.getCell(i, j);
                cell.classList.remove("selected");
                cell.classList.remove("selected-clue");
            }
        }
        let clue = this.clues[this.selection["index"]][this.selection["direction"]];
        for (let k = 0; k < clue.length; k++) {
            let cell = this.getCell(clue[k][0], clue[k][1]);
            cell.classList.add("selected-clue");
            if (k == this.selection["position"]) {
                cell.classList.add("selected");
            }
        }
    }

    getCell(i, j) {
        return document.getElementById("cell-" + i + "-" + j);
    }

    getSelectedCell() {
        return this.clues[this.selection["index"]][this.selection["direction"]][this.selection["position"]];
    }

    selectCell(i, j) {
        let state = this.state[i][j];
        if (!state["cell"]) {
            return console.error("Tried to select black cell");
        }
        if (state["clues"][this.selection["direction"]] == this.selection["index"]) {
            let selected = this.getSelectedCell();
            if (selected[0] == i && selected[1] == j) {
                // Selecting same cell, try to change clue direction
                let newdir = {"across": "down", "down": "across"}[this.selection["direction"]];
                if (state["clues"][newdir] != null) {
                    this.selection["direction"] = newdir;
                    this.selection["index"] = state["clues"][newdir];
                    this.selection["position"] = indexOf(this.clues[this.selection["index"]][newdir], [i, j]);
                }
            } else {
                // Selecting different cell in same clue
                this.selection["position"] = indexOf(this.clues[this.selection["index"]][this.selection["direction"]], [i, j]);
            }
        } else {
            // Selecting different clue altogether (prioritize across)
            let dir = state["clues"]["across"] ? "across" : "down";
            this.selection["direction"] = dir;
            this.selection["index"] = state["clues"][dir];
            this.selection["position"] = indexOf(this.clues[this.selection["index"]][dir], [i, j]);
        }
        this.renderSelection();
    }

    navigate(dir, forward) {
        var addIndex = (idx, inc) => (idx - 1 + inc + this.clues.length - 1) % (this.clues.length - 1) + 1;
        if (this.selection.direction == dir) {
            if (forward) {
                if (this.selection["position"] + 1 < this.clues[this.selection["index"]][dir].length) {
                    this.selection["position"]++;
                } else {
                    // Skip to next across clue
                    let idx = addIndex(this.selection["index"], 1);
                    while (!this.clues[idx][dir].length) idx = addIndex(idx, 1);
                    this.selection["index"] = idx;
                    this.selection["position"] = 0;
                }
            } else {
                if (this.selection["position"] > 0) {
                    this.selection["position"]--;
                } else {
                    // Skip to previous across clue
                    let idx = addIndex(this.selection["index"], -1);
                    while (!this.clues[idx][dir].length) idx = addIndex(idx, -1);
                    this.selection["index"] = idx;
                    this.selection["position"] = this.clues[idx][dir].length - 1;
                }
            }
        } else {
            let selected = this.getSelectedCell();
            if (this.state[selected[0]][selected[1]]["clues"][dir] != null) {
                return this.selectCell(selected[0], selected[1]);
            }
        }
        this.renderSelection();
    }

    typeCharacter(char) {
        let [i, j] = this.getSelectedCell();
        let state = this.state[i][j];
        if (!state["locked"]) {
            state["value"] = char;
            this.getCell(i, j).firstElementChild.innerText = char;
            this.validateAnswers("clue");
        }
        this.navigate(this.selection["direction"], true);
    }

    deleteCharacter(back) {
        let [i, j] = this.getSelectedCell();
        let state = this.state[i][j];
        if (!state["locked"]) {
            state["value"] = "";
            this.getCell(i, j).firstElementChild.innerText = "";
        }
        if (back && this.selection["position"] != 0) {
            this.navigate(this.selection["direction"], false);
        }
    }

    validateAnswers(vtype) {
        if (vtype == "clue") {
            let clue = this.clues[this.selection["index"]][this.selection["direction"]];
            let correct = true;
            for (let k = 0; k < clue.length; k++) {
                let [i, j] = clue[k];
                if (this.state[i][j]["value"] != this.answers[i][j].toUpperCase()) {
                    correct = false;
                    break;
                }
            }
            if (correct) {
                for (let k = 0; k < clue.length; k++) {
                    let [i, j] = clue[k];
                    this.state[i][j]["locked"] = true;
                    this.getCell(i, j).classList.add("correct");
                }
            }
        }
    }
}

function indexOf(arrayOfArrays, array) {
    let index = -1;
    for (let k = 0; k < arrayOfArrays.length; k++) {
        if (arrayOfArrays[k].length == array.length) {
            let equal = true;
            for (let i = 0; i < array.length; i++) {
                if (array[i] != arrayOfArrays[k][i]) {
                    equal = false;
                    break;
                }
            }
            if (equal) {
                index = k;
                break;
            }
        }
    }
    return index;
}

function clickCell(event) {
    let selection = event.target.id.match(/cell-(\d+)-(\d+)/);
    let i = parseInt(selection[1]);
    let j = parseInt(selection[2]);
    game.selectCell(i, j);
    event.preventDefault();
}

document.addEventListener("keydown", function(event) {
    if (event.repeat || event.ctrlKey || event.altKey) return;
    if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(event.key.toUpperCase())) {
        game.typeCharacter(event.key.toUpperCase());
    } else switch (event.code) {
        case "Backspace":
            game.deleteCharacter(true);
            break;
        case "Delete":
            game.deleteCharacter(false);
            break;
        case "ArrowLeft":
        case "ArrowRight":
            game.navigate("across", event.code == "ArrowRight");
            break;
        case "ArrowUp":
        case "ArrowDown":
            game.navigate("down", event.code == "ArrowDown");
            break;
        default:
            return;
    }
    event.preventDefault();
});

var game = new Game(grid, clueList, {
    "width": 3,
    "height": 3,
    "grid": [
        ["W", "H", "O"],
        ["A", null, null],
        ["Y", "A", "K"]
    ],
    "clues": {
        "across": [
            "Which person makes owl sounds",
            "Throw up bovine"
        ],
        "down": [
            "Ottawa yetis have direction"
        ]
    }
});