
import Editor from "./editor";
import { Layer } from "./layer";
import { createSVG, setDisabled, forEach, clamp, noop } from "./utility";

const fileInput = document.getElementById("file-upload"),
	  undoBtn = document.getElementById("undo-btn"),
	  redoBtn = document.getElementById("redo-btn"),
	  toolOptionsParent = document.getElementById("tool-options"),
	  viewportWrapper = document.getElementById("viewport-wrapper"),
	  viewport = document.getElementById("viewport"),
	  layerCards = document.getElementById("layer-cards");

const cl_canvas = "viewport__canvas",
	  cl_canvasParent = "viewport__canvas-wrapper",
	  cl_layerParent = "viewport__layers",
	  cl_layerCard = "infobar__layer-card",
	  cl_layerCardSelected = "selected",
	  cl_layerCardHelper = "helper",
	  cl_layerCardCanvas = "canvas",
	  cl_layerCardRemoveBtn = "remove",
	  svg_remove = "#icon-trash";

const SCALE_FACTOR = -0.0005,
	  MAX_SCALE = 4, 
	  MIN_SCALE = 0.25, 
	  UNDO_DELAY = 100;

let g_editor;

function main() {
	g_editor = new Editor({ viewport: viewportWrapper });

	const parent = g_editor.layerManager.parent;
	parent.classList.add(cl_layerParent);
	viewport.appendChild(parent);
	toolOptionsParent.appendChild(g_editor.toolOptionsParent);

	attachCommandListeners();
	attachViewportListeners();
	attachMenubarListeners();
	attachToolListeners();
	attachLayerListeners();

	window.onbeforeunload = () => true;
}

function attachCommandListeners() {
	attachUndoRedoListeners();

	viewportWrapper.addEventListener("keydown", deleteListener);
	layerCards.addEventListener("keydown", deleteListener);
}

function deleteListener(evt) {
	if (evt.key === "Delete") {	
		const selected = g_editor.layerManager.selected;
		if (selected.length) {
			g_editor.removeLayers(selected);
		}
	}
}

function attachUndoRedoListeners() {
	const listener = (evt) => {
		if (evt.ctrlKey) {
			const key = evt.key.toLowerCase(),
				  z = key === "z";

			if ((z && evt.shiftKey) || key === "y") {
				if (g_editor.stack.canRedo) {
					reset();
					g_editor.stack.redo();
				}
			} else if (z) {
				if (g_editor.stack.canUndo) {
					reset();
					g_editor.stack.undo();
				}
			}
		}
	};
	const attach = () => {
		document.addEventListener("keydown", listener);
	};
	const reset = () => {
		document.removeEventListener("keydown", listener);
		setTimeout(attach, UNDO_DELAY);
	};
	attach();
}

function attachViewportListeners() {
	viewportWrapper.addEventListener("wheel", (evt) => {
		const current = g_editor.stack.current;
		if (!(current && current.open)) {
			let scale = g_editor.layerManager.scale;

			scale += evt.deltaY * SCALE_FACTOR;
			scale = clamp(scale, MIN_SCALE, MAX_SCALE);

			g_editor.layerManager.scale = scale;
		}
	});
}

function attachMenubarListeners() {
	fileInput.addEventListener("change", (evt) => {
		const file = evt.target.files[0];
		if (!file) return;
		evt.target.value = null;

		const image = new Image();
		image.addEventListener("load", () => {
			const layer = new Layer(image);
			g_editor.addLayer(layer);
		});
		image.addEventListener("error", () => {
			console.warn("Failed to create layer, image could not load.");
		});
		image.src = URL.createObjectURL(file);
	});
	g_editor.stack.onChange.addListener(() => {
		const current = g_editor.stack.current;
		setDisabled(undoBtn, !g_editor.stack.canUndo);
		setDisabled(redoBtn, !g_editor.stack.canRedo);
	});
	undoBtn.addEventListener("click", () => {
		g_editor.stack.undo();
	});
	redoBtn.addEventListener("click", () => {
		g_editor.stack.redo();
	});
}

function attachToolListeners() {
	const tools = document.querySelectorAll(".toolbar__tool");
	forEach(tools, g_editor.tools, selectToolOnClick);
}

function selectToolOnClick(button, toolName) {
	button.addEventListener("click", () => {
		g_editor.selectTool(toolName);
	});
}

function attachLayerListeners() {
	g_editor.layerManager.onAdd.addListener((layer) => {
		layer.canvas.classList.add(cl_canvas);
		layer.element.classList.add(cl_canvasParent);
		
		const card = createLayerCard(layer);
		layerCards.appendChild(card);
		layer["data-card"] = card;
	});
	g_editor.layerManager.onRemove.addListener((layer) => {
		layerCards.removeChild(layer["data-card"]);
	});
	g_editor.layerManager.onSelect.addListener((layer) => {
		layer["data-card"].classList.add(cl_layerCardSelected);
	});
	g_editor.layerManager.onDeselect.addListener((layer) => {
		layer["data-card"].classList.remove(cl_layerCardSelected);
	});
}

function createLayerCard(layer) {
	const card = document.createElement("div");
	card.classList.add(cl_layerCard);
	card.addEventListener("click", (evt) => {
		if (evt.ctrlKey) {
			if (layer.selected) {
				g_editor.layerManager.deselect(layer);
			} else {
				g_editor.layerManager.select(layer);
			}
		}
		else {
			g_editor.layerManager.deselectAll();
			g_editor.layerManager.select(layer);
		}
	});

	const canvas = document.createElement("canvas");
	canvas.width = 100;
	canvas.height = 100;
	const drawCanvas = () => {
		setTimeout(() => {
			const ctxt = canvas.getContext("2d");
			ctxt.clearRect(0, 0, 100, 100);
			ctxt.drawImage(layer.canvas, 0, 0, layer.sourceWidth, layer.sourceHeight, 0, 0, 100, 100);
		})
	};
	drawCanvas();
	g_editor.stack.onChange.addListener(drawCanvas);
	canvas.classList.add(cl_layerCardCanvas);
	card.appendChild(canvas);

	const span = document.createElement("span");
	span.classList.add(cl_layerCardHelper);
	card.appendChild(span);

	const removeBtn = document.createElement("button");
	removeBtn.classList.add(cl_layerCardRemoveBtn);
	removeBtn.addEventListener("click", (evt) => {
		evt.stopPropagation();
		g_editor.removeLayer(layer);
		g_editor.stack.onChange.removeListener(drawCanvas);
	});
	const svg = createSVG(svg_remove);
	removeBtn.appendChild(svg);
	card.appendChild(removeBtn);

	return card;
}

main();
