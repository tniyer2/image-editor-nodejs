
import { AutoComplete } from "./input";
import Editor from "./editor";
import { Layer } from "./layer";
import { $, clamp, setDisabled, make } from "./utility";

const elm_root = $("#root"),
	  elm_fileInput = $("#file-upload"),
	  elm_undoBtn = $("#undo-btn"),
	  elm_redoBtn = $("#redo-btn"),
	  elm_toolOptionsParent = $("#tool-options"),
	  elm_toolsParent = $("#tools"),
	  elm_toolbarOptions = $("#toolbar-options"),
	  elm_viewportWrapper = $("#viewport-wrapper"),
	  elm_viewport = $("#viewport"),
	  elm_nodeSearch = $("#node-search"),
	  elm_nodeSearchBar = $("#node-search-bar"),
	  elm_nodeSearchForm = $("#node-search-form"),
	  elm_nodeSpaceWrapper = $("#node-space-wrapper"),
	  elm_nodeSpace = $("#node-space"),
	  elm_linksContainer = $("#links-container");

const cl_canvas = "viewport__canvas",
	  cl_canvasParent = "viewport__canvas-wrapper",
	  cl_layerParent = "viewport__layers",
	  cl_layerSelected = "selected",
	  cl_toolOptionsParent2 = "menubar__tool-options2",
	  cl_toolBtn = "toolbar__tool",
	  cl_toolName = "text",
	  cl_autoComplete = "auto-complete";

const SCALE_FACTOR = -0.0005,
	  MAX_SCALE = 4, 
	  MIN_SCALE = 0.25, 
	  UNDO_DELAY = 100;

let g_editor;

function main() {
	const ac = createNodeAutoComplete();

	g_editor = new Editor(
	{ viewport: 	   elm_viewportWrapper,
	  innerViewport:   elm_viewport,
	  nodeSpace: 	   elm_nodeSpaceWrapper,
	  innerNodeSpace:  elm_nodeSpace,
	  linksContainer:  elm_linksContainer,
	  nodeAutoComplete: ac });

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

function createNodeAutoComplete() {
	const ac = new AutoComplete(elm_nodeSearch, 
	{ form: elm_nodeSearchForm });
	ac.list.classList.add(cl_autoComplete);
	elm_nodeSearchBar.appendChild(ac.list);
	return ac;
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
			const z = evt.key === "z" || evt.key === "Z",
				  y = evt.key === "y" || evt.key === "Y";

			if ((z && evt.shiftKey) || y) {
				evt.preventDefault();
				if (g_editor.stack.canRedo) {
					g_editor.stack.redo();
					reset();
				}
			} else if (z) {
				evt.preventDefault();
				if (g_editor.stack.canUndo) {
					g_editor.stack.undo();
					reset();
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
		const selected = g_editor.layerManager.layers.selected;
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
	}, { passive: true });
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
	const layers = g_editor.layerManager.layers;

	layers.onAdd.addListener((l) => {
		l.canvas.classList.add(cl_canvas);
		l.element.classList.add(cl_canvasParent);
	});
	layers.onSelect.addListener((l) => {
		l.element.classList.add(cl_layerSelected);
	});
	layers.onDeselect.addListener((l) => {
		l.element.classList.remove(cl_layerSelected);
	});
}

main();
