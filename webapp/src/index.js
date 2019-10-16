
import { $, setBooleanAttribute } from "./util/util";
import Editor from "./core/editor";

const UNDO_DELAY = 100;

let g_editor;

function main() {
	g_editor = new Editor($("#editor-content"));

	listenUndoRedoCommands();
	listenUndoRedoButtons();
	listenSaveButton();

	window.onbeforeunload = () => true;
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
		const canvas = g_editor.getFinalImage();
		if (canvas) {
			canvas.toBlob((blob) => {
				const url = URL.createObjectURL(blob);

				const link = document.createElement("a");
				link.href = url;
				link.download = "image";

				link.style.display = "none";
				document.body.appendChild(link);
				link.click();
				link.remove();
			});
		}
	});
}

main();
