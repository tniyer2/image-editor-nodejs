
import Editor from "./editor";
import { Layer } from "./layer";
import { $, clamp, setDisabled, make, createSVG } from "./utility";

const elm_root = $("#root"),
	  elm_fileInput = $("#file-upload"),
	  elm_undoBtn = $("#undo-btn"),
	  elm_redoBtn = $("#redo-btn"),
	  elm_toolOptionsParent = $("#tool-options"),
	  elm_toolsParent = $("#tools"),
	  elm_toolbarOptions = $("#toolbar-options"),
	  elm_viewportWrapper = $("#viewport-wrapper"),
	  elm_viewport = $("#viewport");

const cl_canvas = "viewport__canvas",
	  cl_canvasParent = "viewport__canvas-wrapper",
	  cl_layerParent = "viewport__layers",
	  cl_layerSelected = "selected",
	  cl_toolOptionsParent2 = "menubar__tool-options2",
	  cl_toolBtn = "toolbar__tool",
	  cl_toolName = "text",
	  svg_remove = "#icon-trash";

const SCALE_FACTOR = -0.0005,
	  MAX_SCALE = 4, 
	  MIN_SCALE = 0.25, 
	  UNDO_DELAY = 100;

let g_editor;

function main() {
	g_editor = new Editor({ viewport: elm_viewportWrapper, 
							innerViewport: elm_viewport });

	appendDOM();
	listenUndoRedoCommands();
	elm_viewportWrapper.addEventListener("keydown", deleteLayerListener);
	listenViewportScroll();
	listenFileUpload();
	listenUndoRedoButtons();
	createToolButtons();
	listenLayerEvents();

	window.onbeforeunload = () => true;
}

function appendDOM() {
	const d = g_editor.layerManager.parent;
	d.classList.add(cl_layerParent);
	elm_viewport.appendChild(d);

	const d2 = g_editor.toolOptionsParent;
	d2.classList.add(cl_toolOptionsParent2);
	elm_toolOptionsParent.appendChild(d2);

	elm_root.appendChild(g_editor.colorPicker.root);
	elm_toolbarOptions.appendChild(g_editor.primaryColorBox.root);
}

function listenUndoRedoCommands() {
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

function deleteLayerListener(evt) {
	if (evt.key === "Delete") {	
		const selected = g_editor.layerManager.selected;
		if (selected.length) {
			g_editor.removeLayers(selected);
		}
	}
}

function listenViewportScroll() {
	elm_viewportWrapper.addEventListener("wheel", (evt) => {
		const current = g_editor.stack.current;
		const vp = g_editor.layerManager.innerViewport;

		if (!current || !current.open) {
			let scale = vp.scaleX;

			scale += evt.deltaY * SCALE_FACTOR;
			scale = clamp(scale, MIN_SCALE, MAX_SCALE);

			vp.scaleX = vp.scaleY = scale;
		}
	});
}

function listenFileUpload() {
	elm_fileInput.addEventListener("change", (evt) => {
		const file = evt.target.files[0];
		evt.target.value = null;
		if (!file) return;

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
}

function listenUndoRedoButtons() {
	g_editor.stack.onChange.addListener(() => {
		setDisabled(elm_undoBtn, !g_editor.stack.canUndo);
		setDisabled(elm_redoBtn, !g_editor.stack.canRedo);
	});
	elm_undoBtn.addEventListener("click", () => {
		g_editor.stack.undo();
	});
	elm_redoBtn.addEventListener("click", () => {
		g_editor.stack.redo();
	});
}

function createToolButtons() {
	g_editor.tools.forEach((t) => {
		const btn = make("button");
		btn.classList.add(cl_toolBtn);
		const name = make("span");
		name.innerText = t;
		name.classList.add(cl_toolName);
		btn.appendChild(name);
		elm_toolsParent.appendChild(btn);

		selectToolOnClick(btn, t);
	});
}

function selectToolOnClick(button, toolName) {
	button.addEventListener("click", () => {
		g_editor.selectTool(toolName);
	});
}

function listenLayerEvents() {
	g_editor.layerManager.onAdd.addListener((layer) => {
		layer.canvas.classList.add(cl_canvas);
		layer.element.classList.add(cl_canvasParent);
	});
	g_editor.layerManager.onSelect.addListener((layer) => {
		layer.element.classList.add(cl_layerSelected);
	});
	g_editor.layerManager.onDeselect.addListener((layer) => {
		layer.element.classList.remove(cl_layerSelected);
	});
}

main();
