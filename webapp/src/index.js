
import Editor from "./editor";
import { Layer } from "./layer";
import { $, clamp, setDisabled, make, createSVG } from "./utility";

const root = $("#root"),
	  fileInput = $("#file-upload"),
	  undoBtn = $("#undo-btn"),
	  redoBtn = $("#redo-btn"),
	  toolOptionsParent = $("#tool-options"),
	  toolsParent = $("#tools"),
	  toolbarOptions = $("#toolbar-options"),
	  viewportWrapper = $("#viewport-wrapper"),
	  viewport = $("#viewport"),
	  layerCards = $("#layer-cards");

const cl_canvas = "viewport__canvas",
	  cl_canvasParent = "viewport__canvas-wrapper",
	  cl_layerParent = "viewport__layers",
	  cl_layerSelected = "selected",
	  cl_toolOptionsParent2 = "menubar__tool-options2",
	  cl_toolBtn = "toolbar__tool",
	  cl_toolName = "text",
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
	g_editor = new Editor({ viewport: viewportWrapper, innerViewport: viewport });

	const d = g_editor.layerManager.parent;
	d.classList.add(cl_layerParent);
	viewport.appendChild(d);

	const d2 = g_editor.toolOptionsParent;
	d2.classList.add(cl_toolOptionsParent2);
	toolOptionsParent.appendChild(d2);

	root.appendChild(g_editor.colorPicker.root);
	toolbarOptions.appendChild(g_editor.primaryColorBox.root);

	listenCommands();
	listenViewport();
	listenMenubar();
	listenTools();
	listenLayers();

	window.onbeforeunload = () => true;
}

function listenCommands() {
	listenUndoRedo();

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

function listenUndoRedo() {
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

function listenViewport() {
	viewportWrapper.addEventListener("wheel", (evt) => {
		const current = g_editor.stack.current;
		const vp = g_editor.layerManager.innerViewport;
		if (!(current && current.open)) {
			let scale = vp.scaleX;

			scale += evt.deltaY * SCALE_FACTOR;
			scale = clamp(scale, MIN_SCALE, MAX_SCALE);

			vp.scaleX = scale;
			vp.scaleY = scale;
		}
	});
}

function listenMenubar() {
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

function listenTools() {
	g_editor.tools.forEach((t) => {
		const btn = make("button");
		btn.classList.add(cl_toolBtn);
		const name = make("span");
		name.innerText = t;
		name.classList.add(cl_toolName);
		btn.appendChild(name);
		toolsParent.appendChild(btn);

		selectToolOnClick(btn, t);
	});
}

function selectToolOnClick(button, toolName) {
	button.addEventListener("click", () => {
		g_editor.selectTool(toolName);
	});
}

function listenLayers() {
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
		layer.element.classList.add(cl_layerSelected);
		layer["data-card"].classList.add(cl_layerCardSelected);
	});
	g_editor.layerManager.onDeselect.addListener((layer) => {
		layer.element.classList.remove(cl_layerSelected);
		layer["data-card"].classList.remove(cl_layerCardSelected);
	});
}

function createLayerCard(layer) {
	const card = make("div");
	card.classList.add(cl_layerCard);
	card.addEventListener("click", (evt) => {
		if (evt.ctrlKey) {
			if (layer["data-selected"]) {
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

	const canvas = make("canvas");
	canvas.width = 100;
	canvas.height = 100;
	const drawCanvas = () => {
		setTimeout(() => {
			const context = canvas.getContext("2d");
			context.clearRect(0, 0, 100, 100);
			context.drawImage(layer.canvas, 0, 0, layer.sourceWidth, layer.sourceHeight, 0, 0, 100, 100);
		});
	};
	drawCanvas();
	g_editor.stack.onChange.addListener(drawCanvas);
	canvas.classList.add(cl_layerCardCanvas);
	card.appendChild(canvas);

	const span = make("span");
	span.classList.add(cl_layerCardHelper);
	card.appendChild(span);

	const removeBtn = make("button");
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
