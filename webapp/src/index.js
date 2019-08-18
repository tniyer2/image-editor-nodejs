
import { $, setBooleanAttribute } from "./utility";
import Editor from "./editor";

const CLASSES =
{ top2: "menubar__tool-options2",
  nop2: "menubar__node-options2" };

const UNDO_DELAY = 100;

let g_editor;

function main() {
	g_editor = new Editor($("#editor-content"));

	const area1 = g_editor.areaManager.getArea();
	const area2 = g_editor.areaManager.getArea();
	g_editor.areaManager.root.appendChild(area1);
	g_editor.areaManager.root.appendChild(area2);

	appendDOM();
	listenUndoRedoCommands();
	listenUndoRedoButtons();
	listenSaveButton();

	window.onbeforeunload = () => true;
}

function appendDOM() {
	const top = g_editor.toolOptionsParent;
	top.classList.add(CLASSES.top2);
	$("#tool-options").appendChild(top);

	const nop = g_editor.nodeManager.nodeOptionsParent;
	nop.classList.add(CLASSES.nop2);
	$("#node-options").appendChild(nop);

	$("#root").appendChild(g_editor.colorPicker.root);
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

function listenSaveButton() {
	$("#save-image").addEventListener("click", () => {
		const uri = g_editor.layerManager.getImage();
		if (uri) {
			const link = document.createElement("a");
			link.href = uri;
			link.download = "image";

			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			link.remove();
		}
	});
}

main();
