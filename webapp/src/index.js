
import { AutoComplete } from "./input";
import Editor from "./editor";
import { Layer } from "./layer";
import { $, setBooleanAttribute } from "./utility";

const CLASSES =
{ toolBtn: "toolbar__tool",
  toolName: "text",
  autoComplete: "auto-complete",
  top2: "menubar__tool-options2",
  nop2: "menubar__node-options2" };

const UNDO_DELAY = 100;

let g_editor;

function main() {
	const ac = createNodeAutoComplete();

	g_editor = new Editor(
	{ viewport: 	   $("#viewport-wrapper"),
	  innerViewport:   $("#viewport"),
	  nodeSpace: 	   $("#node-space-wrapper"),
	  innerNodeSpace:  $("#node-space"),
	  nodeAutoComplete: ac });

	appendDOM();
	createToolButtons();
	listenUndoRedoCommands();
	listenUndoRedoButtons();
	listenFileUpload();

	window.onbeforeunload = () => true;
}

function createNodeAutoComplete() {
	const ac = new AutoComplete($("#node-search-input"), 
		{ form: $("#node-search") });
	ac.list.classList.add(CLASSES.autoComplete);
	$("#node-search-w2").appendChild(ac.list);
	return ac;
}

function appendDOM() {
	const top = g_editor.toolOptionsParent;
	top.classList.add(CLASSES.top2);
	$("#tool-options").appendChild(top);

	const nop = g_editor.nodeManager.nodeOptionsParent;
	nop.classList.add(CLASSES.nop2);
	$("#node-options").appendChild(nop);

	$("#root").appendChild(g_editor.colorPicker.root);
	$("#toolbar-options").appendChild(g_editor.primaryColorBox.root);
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

function listenUndoRedoButtons() {
	const undoBtn = $("#undo-btn"),
		  redoBtn = $("#redo-btn");

	g_editor.stack.onChange.addListener(() => {
		setBooleanAttribute(undoBtn, "disabled", !g_editor.stack.canUndo);
		setBooleanAttribute(redoBtn, "disabled", !g_editor.stack.canRedo);
	});
	undoBtn.addEventListener("click", () => {
		g_editor.stack.undo();
	});
	redoBtn.addEventListener("click", () => {
		g_editor.stack.redo();
	});
}

function listenFileUpload() {
	$("#file-upload").addEventListener("change", (evt) => {
		const file = evt.target.files[0];
		evt.target.value = null;
		if (!file) return;

		const image = new Image();
		image.addEventListener("load", () => {
			const layer = new Layer(image);
			g_editor.layerManager.addLayer(layer);
		});
		image.addEventListener("error", () => {
			console.warn("Failed to create layer, image could not load.");
		});
		image.src = URL.createObjectURL(file);
	});
}

function createToolButtons() {
	g_editor.tools.forEach((t) => {
		const btn = document.createElement("button");
		btn.classList.add(CLASSES.toolBtn);
		const name = document.createElement("span");
		name.innerText = t;
		name.classList.add(CLASSES.toolName);
		btn.appendChild(name);
		$("#tools").appendChild(btn);

		selectToolOnClick(btn, t);
	});
}

function selectToolOnClick(button, toolName) {
	button.addEventListener("click", () => {
		g_editor.selectTool(toolName);
	});
}

main();
