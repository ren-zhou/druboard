// Additional actors
class ClueController {
    constructor(gridController, acrossElement, downElement) {
        this.controller = gridController;
        this.element = {
            "across": acrossElement,
            "down": downElement
        };
        // Handlers
        this.focusHandler = null;
        this.moveUpHandler = null;
        this.moveDownHandler = null;
        this.deleteHandler = null;
    }

    init() {
        let cc = this;
        // Handlers
        this.focusHandler = function(event) {
            let clueidx = this.parentNode.querySelector(".clue-label").innerText;
            if (clueidx) {
                let idx = parseInt(clueidx) - 1;
                let dir = cc.element["down"].contains(this) ? "down" : "across";
                cc.controller.selector.selectClue(idx, dir);
            }
        };
        this.moveUpHandler = function(event) {
            let entry = this.parentNode;
            if (entry.previousElementSibling != null) {
                entry.parentNode.insertBefore(entry, entry.previousElementSibling);
            }
            cc.refresh();
            entry.querySelector(".clue-desc").focus();
        };
        this.moveDownHandler = function(event) {
            let entry = this.parentNode;
            if (entry.nextElementSibling != null) {
                entry.parentNode.insertBefore(entry.nextElementSibling, entry);
            }
            cc.refresh();
            entry.querySelector(".clue-desc").focus();
        };
        this.deleteHandler = function(event) {
            this.parentNode.remove();
            cc.refresh();
        }
        // Bind handlers
        for (let element of document.querySelectorAll("div.add-item")) {
            element.addEventListener("click", function(event) {
                let entry = cc.addClue(this.getAttribute("data-value"));
                entry.querySelector(".clue-desc").focus();
            });
        }
    }

    doAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        return action;
    }

    undoAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        return action;
    }

    refresh() {
        for (let dir of ["across", "down"]) {
            let idx = 0;
            for (let entry of this.element[dir].querySelectorAll(".clue-entry")) {
                while (idx < this.controller.structure.clueToCell.length &&
                        !this.controller.structure.clueToCell[idx][dir].length) idx++;
                if (idx < this.controller.structure.clueToCell.length) {
                    entry.querySelector(".clue-label").innerText = idx + 1;
                    idx++;
                } else {
                    entry.querySelector(".clue-label").innerText = "";
                }
            }
        }
    }

    addClue(dir) {
        let entry = document.createElement("div");
        entry.className = "clue-entry";
        let label = document.createElement("span");
        label.className = "clue-label";
        entry.appendChild(label);
        let clue = document.createElement("div");
        clue.setAttribute("contentEditable", "true");
        clue.className = "clue-desc";
        clue.innerText = "";
        clue.addEventListener("focus", this.focusHandler);
        entry.appendChild(clue);
        let moveup = document.createElement("div");
        moveup.className = "clue-action moveup";
        moveup.addEventListener("click", this.moveUpHandler);
        let movedown = document.createElement("div");
        movedown.className = "clue-action movedown";
        movedown.addEventListener("click", this.moveDownHandler);
        let del = document.createElement("div");
        del.className = "clue-action delete";
        del.addEventListener("click", this.deleteHandler);
        entry.appendChild(moveup);
        entry.appendChild(movedown);
        entry.appendChild(del);
        this.element[dir].appendChild(entry);
        entry.scrollIntoView();
        this.refresh();
        return entry;
    }

    clear() {
        this.element["across"].innerHTML = "";
        this.element["down"].innerHTML = "";
    }
}


class WordSuggestor {
    constructor(gridController, gridSelector, suggestElement) {
        this.controller = gridController;
        this.selector = gridSelector;
        this.element = suggestElement;
        // State
        this.searching = false;
        this.promise = null;
        this.previousQuery = "";
        this.clueidx = 0;
        this.cluedir = "across";
        // Handlers
        this.searchHandler = null;
        this.closeHandler = null;
        this.clickHandler = null;
    }

    queryInfo() {
        if (!this.searching && this.selector.selected) {
            let letters = this.selector.selectedClue().map(cell => {
                return this.controller.grid.state[cell[0]][cell[1]]["value"];
            });
            if (letters.reduce((a, x) => a || x, false) && !letters.reduce((a, x) => a && x, true)) {
                let word = letters.reduce((a, x) => a + (x || "?"), "");
                let clueidx = this.controller.structure.getClue(...this.selector.cell, this.selector.direction);
                let cluedir = this.selector.direction;
                return [word, clueidx, cluedir];
            }
        }
        return null;
    }

    init() {
        let ws = this;
        // Handlers
        this.searchHandler = function(event) {
            let refresh = event === null;
            let newQuery = ws.queryInfo();
            if (newQuery !== null) {
                let [word, clueidx, cluedir] = newQuery;
                ws.previousQuery = word, ws.clueidx = clueidx, ws.cluedir = cluedir;
                // Search up word
                ws.searching = true;
                let maxwords = Math.floor(48 / Math.max(word.length, 4));
                let promise = ws.promise = requestAutofill(word, maxwords, refresh);
                promise.then(function(wordlist) {
                    // Abort if no longer needed
                    if (ws.promise !== promise) return;
                    // Update list
                    let listElement = ws.element.querySelector("#suggestions");
                    let lastElement = ws.element.querySelector("div.close");
                    listElement.querySelectorAll("div.suggestion-result").forEach(x => x.remove());
                    for (let word of wordlist) {
                        let result = document.createElement("div");
                        result.className = "suggestion-result";
                        result.innerText = word;
                        result.addEventListener("click", ws.clickHandler);
                        listElement.insertBefore(result, lastElement);
                    }
                    ws.element.classList.add("open-bar");
                    ws.element.querySelector("#suggest").removeEventListener("click", ws.searchHandler);
                    ws.element.querySelector("#suggest").addEventListener("click", ws.closeHandler);
                    ws.searching = false;
                });
            }
        };
        this.closeHandler = function(event) {
            // Start closing results bar
            ws.element.classList.remove("open-bar");
            let listElement = ws.element.querySelector("#suggestions");
            listElement.querySelectorAll("div.suggestion-result").forEach(x => x.removeEventListener("click", ws.clickHandler));
            ws.searching = false;
            ws.promise = null;
            ws.element.querySelector("#suggest").removeEventListener("click", ws.closeHandler);
            ws.element.querySelector("#suggest").removeEventListener("click", ws.searchHandler);
            ws.element.querySelector("#suggest").addEventListener("click", ws.searchHandler);
            // Re-initiate search if on different clue
            if (this == ws.element.querySelector("#suggest")) {
                let newQuery = ws.queryInfo();
                if (newQuery !== null) {
                    let [word, clueidx, cluedir] = newQuery;
                    if (word != ws.previousQuery || clueidx != ws.clueidx || cluedir != ws.cluedir) {
                        ws.searchHandler(null);
                    }
                }
            }
        };
        this.clickHandler = function(event) {
            let word = this.innerText.replace(/[^A-Z]/g, "");
            let cells = ws.controller.structure.clueToCell[ws.clueidx][ws.cluedir];
            if (word.length == cells.length) {
                let actions = [];
                for (let i = 0; i < word.length; i++) {
                    actions = [...actions, ...ws.controller.grid.actionEditCell(...cells[i], word[i])];
                }
                ws.controller.takeAction(actions);
            }
            ws.closeHandler(null);
        };
        // Bind handlers
        this.element.querySelector("#suggest").addEventListener("click", this.searchHandler);
        this.element.querySelector("#suggestions div.close").addEventListener("click", this.closeHandler);
    }

    doAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.reset();
            case "edit":
            default:
        }
        return action;
    }

    undoAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.reset();
            case "edit":
            default:
        }
        return action;
    }

    reset() {
        this.searching = false;
        this.promise = null;
        this.closeHandler(null);
    }
}

// Word suggestion using Datamuse API
// https://www.datamuse.com/

const maxCacheSize = 100;
autofillCache = new Map();

async function requestAutofill(pattern, maxwords, refresh) {
    let query = pattern.toLowerCase();
    let words;
    if (autofillCache.has(query)) {
        words = [...autofillCache.get(query)];
    } else {
        let url = "https://api.datamuse.com/words?sp=" + query;
        const response = await fetch(url);
        words = await response.json();
        // Process words
        let unique = [], parsed = [];
        for (let w of words) {
            console.log(w);
            w = w["word"].toUpperCase();
            let p = w.replace(/\W/g, "");
            if (!parsed.includes(p)) {
                unique.push(w);
                parsed.push(p);
            }
        }
        words = unique;
        // Add to cache
        autofillCache.set(query, [...words]);
        if (autofillCache.size > maxCacheSize) {
            for (let firstkey of autofillCache.keys()) {
                autofillCache.delete(firstkey);
                break;
            }
        }
    }
    if (refresh) await new Promise(r => setTimeout(r, 200));
    if (words.length > maxwords) words.length = maxwords;
    return words;
}


class SaveLoad {
    constructor(gridController, clueController) {
        this.gridController = gridController;
        this.clueController = clueController;
        this.importMode = false;
        this.lastDropTarget = null;
        // Handlers
        this.exportHandler = null;
        this.importHandler = null;
        this.pasteHandler = null;
        this.downloadHandler = null;
        // Export/import
        this.exportFormat = {
            "json": JSON.stringify,
            "exf": function(puzzle) {
                let data = [puzzle["metadata"], puzzle["dimensions"]];
                let answerStr = "";
                for (let i = 0; i < puzzle["dimensions"][1]; i++) {
                    for (let j = 0; j < puzzle["dimensions"][0]; j++) {
                        let ans = puzzle["answers"][i][j];
                        answerStr += (ans === null) ? "0" : (ans || " ");
                    }
                }
                data.push(answerStr);
                data = [...data, puzzle["clues"]["across"], puzzle["clues"]["down"]];
                return "*" + btoa(JSON.stringify(data));
            }
        };
        this.importFormat = {
            "json": JSON.parse,
            "exf": function(str) {
                let data = JSON.parse(atob(str.substring(1)));
                let puzzle = {};
                puzzle["metadata"] = data[0];
                puzzle["dimensions"] = data[1];
                puzzle["answers"] = [];
                for (let i = 0; i < puzzle["dimensions"][1]; i++) {
                    let row = [];
                    for (let j = 0; j < puzzle["dimensions"][0]; j++) {
                        let ans = data[2][i * puzzle["dimensions"][0] + j];
                        row.push(ans == "0" ? null : ans == " " ? "" : ans);
                    }
                    puzzle["answers"].push(row);
                }
                puzzle["clues"] = {
                    "across": data[3],
                    "down": data[4]
                };
                return puzzle;
            }
        };
    }

    init() {
        let sl = this;
        // Handlers
        this.exportHandler = function(event) {
            let data = sl.exportFormat[this.getAttribute("data-value")](sl.exportObject());
            if (data) {
                navigator.clipboard.writeText(data).then(
                    () => alert("Successfully copied to clipboard!"),
                    () => alert("Error: Failed to copy to clipboard")
                );
            }
        };
        this.textHandler = function(data, source) {
            if (data) {
                let fmt = sl.detectFormat(data);
                if (fmt) {
                    sl.importObject(sl.importFormat[fmt](data));
                    console.log("Imported data from " + source + ".");
                } else {
                    alert("Error: Unrecognized format");
                }
            } else {
                console.error("No data from " + source + " to import");
            }
        };
        this.pasteHandler = function(event) {
            let data = (event.clipboardData || window.clipboardData).getData("text");
            sl.textHandler(data, 'clipboard');
            document.querySelectorAll("div.option[data-action=import]").forEach(
                x => x.innerText = "Import"
            );
            this.removeEventListener("paste", sl.pasteHandler);
        };
        this.dropHandler = function(event) {
            event.preventDefault();
            document.querySelector(".dropzone").classList.remove("active");
            let reader = new FileReader();
            reader.readAsText(event.dataTransfer.files[0]);
            reader.onloadend = () => sl.textHandler(reader.result, 'file');
        }
        this.importHandler = function(event) {
            if (!sl.importMode) {
                this.innerText = "Ctrl + V";
                document.addEventListener("paste", sl.pasteHandler);
            } else {
                this.innerText = "Import";
                document.removeEventListener("paste", sl.pasteHandler);
            }
            sl.importMode = !sl.importMode;
        };
        this.downloadHandler = function(event) {
            // Update download link(s)
            let puzzle = sl.exportObject();
            let filename = puzzle["metadata"]["title"].replace(/\W/g, "") || "puzzle";
            let data = sl.exportFormat[this.getAttribute("data-value")](puzzle);
            if (data) {
                this.setAttribute("href", "data:;base64," + btoa(data));
                this.setAttribute("download", filename + "." + this.getAttribute("data-value"));
            } else {
                this.removeAttribute("href");
                this.removeAttribute("download");
            }
        }
        // Bind handlers
        document.querySelectorAll("div.option[data-action=export]").forEach(
            x => x.addEventListener("click", this.exportHandler)
        );
        document.querySelectorAll("div.option[data-action=import]").forEach(
            x => x.addEventListener("click", this.importHandler)
        );
        document.querySelectorAll("a.option[data-action=download]").forEach(
            x => x.addEventListener("click", this.downloadHandler)
        );
        window.addEventListener("dragenter", function(event) {
            sl.lastDropTarget = event.target;
            document.querySelector(".dropzone").classList.add("active");
        });
        window.addEventListener("dragleave", function(event) {
            if (event.target === sl.lastDropTarget || event.target === document) {
                document.querySelector(".dropzone").classList.remove("active");
            }
        });
        window.addEventListener("drop", this.dropHandler);
        window.addEventListener("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    doAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
            case "edit":
                if (last) this.refresh();
            default:
        }
        return action;
    }

    undoAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
            case "edit":
                if (last) this.refresh();
            default:
        }
        return action;
    }

    refresh() {
        // Do nothing
    }

    exportObject() {
        let puzzle = {
            "metadata": {
                "valid": true,
                "title": "",
                "author": ""
            },
            "dimensions": [],
            "answers": [],
            "clues": {
                "across": [],
                "down": []
            }
        };
        let gc = this.gridController, cc = this.clueController;
        // Metadata
        puzzle["metadata"]["title"] = document.querySelector(".head-title").innerText;
        puzzle["metadata"]["author"] = document.querySelector(".head-byline").innerText;
        // Get dimensions
        puzzle["dimensions"] = [gc.grid.width, gc.grid.height];
        // Fill in answers
        for (let i = 0; i < gc.grid.height; i++) {
            let row = [];
            for (let j = 0; j < gc.grid.width; j++) {
                if (gc.grid.isOpen(i, j)) {
                    let value = gc.grid.state[i][j]["value"];
                    if (gc.structure.cellToClue[i][j]["across"] === null &&
                            gc.structure.cellToClue[i][j]["down"] === null)
                        value = "";
                    row.push(value);
                    if (!value) {
                        puzzle["metadata"]["valid"] = false;
                    }
                } else {
                    row.push(null);
                }
            }
            puzzle["answers"].push(row);
        }
        // Retrieve clues
        for (let dir of ["across", "down"]) {
            let clues = cc.element[dir].querySelectorAll(".clue-entry")
            for (let entry of clues) {
                puzzle["clues"][dir].push(entry.querySelector(".clue-desc").innerText);
            }
            let nclues = gc.structure.clueToCell.reduce((a, c) => a + (c[dir].length != 0), 0);
            if (clues.length != nclues) {
                puzzle["metadata"]["valid"] = false;
            }
        }
        return puzzle;
    }

    importObject(puzzle) {
        let gc = this.gridController, cc = this.clueController;
        gc.takeAction(gc.grid.actionResize("width", puzzle["dimensions"][0]));
        gc.takeAction(gc.grid.actionResize("height", puzzle["dimensions"][1]));
        // Answers
        let actions = [];
        for (let i = 0; i < gc.grid.height; i++) {
            for (let j = 0; j < gc.grid.width; j++) {
                actions = [...gc.grid.actionToggleCell(i, j, puzzle["answers"][i][j] !== null), ...actions];
                if (puzzle["answers"][i][j] !== null) {
                    actions = [...gc.grid.actionEditCell(i, j, puzzle["answers"][i][j]), ...actions];
                }
            }
        }
        gc.takeAction(actions);
        // Clues
        cc.clear();
        for (let dir of ["across", "down"]) {
            for (let clue of puzzle["clues"][dir]) {
                cc.addClue(dir).querySelector(".clue-desc").innerText = clue;
            }
        }
        // Metadata
        document.querySelector(".head-title").innerText = puzzle["metadata"]["title"] || "";
        document.querySelector(".head-byline").innerText = puzzle["metadata"]["author"] || "";
        this.refresh();
    }

    detectFormat(data) {
        if (data.startsWith("{")) return "json";
        if (data.startsWith("*")) return "exf";
        return "";
    }
}