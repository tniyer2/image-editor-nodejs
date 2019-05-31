
import Editor from "./editor";
import { Layer } from "./layer";
import { removeChildren, createSVG, setDisabled, hide, noop } from "./utility";

const fileInput = document.getElementById("file-upload"),
	  undoBtn = document.getElementById("undo-btn"),
	  redoBtn = document.getElementById("redo-btn"),
	  toolOptionsParent = document.getElementById("tool-options"),
	  viewport = document.getElementById("viewport"),
	  layerCards = document.getElementById("layer-cards");

const cl_canvas = "viewport__canvas",
	  cl_canvasParent = "viewport__canvas-wrapper",
	  cl_layerParent = "viewport__layers",
	  cl_layerCard = "infobar__layer-card",
	  cl_layerCardSelected = "selected",
	  cl_layerCardHelper = "helper",
	  cl_layerCardRemoveBtn = "remove",
	  svg_remove = "#icon-trash";

const UNDO_DELAY = 300;

let g_editor;

function main()
{
	g_editor = new Editor();

	let parent = g_editor.layerManager.parent;
	parent.classList.add(cl_layerParent);
	viewport.appendChild(parent);
	toolOptionsParent.appendChild(g_editor.toolOptionsParent);

	attachCommandListeners();
	attachMenubarListeners();
	attachToolListeners();
	attachLayerListeners();

	window.onbeforeunload = () => true;
}

function attachCommandListeners()
{
	const listener = (evt) => {
		if (evt.ctrlKey)
		{
			let key = evt.key.toLowerCase(),
				z = key === "z";
			if ((z && evt.shiftKey) || key === "y")
			{
				reset();
				g_editor.stack.redo();
			}
			else if (z)
			{
				reset();
				g_editor.stack.undo();
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

function attachMenubarListeners()
{
	fileInput.addEventListener("change", (evt) => {
		let file = evt.target.files[0];
		if (!file) return;
		evt.target.value = null;

		let image = new Image();
		image.addEventListener("load", () => {
			let layer = new Layer(image);
			g_editor.createLayer(layer);
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

function attachToolListeners()
{
	const tools = document.querySelectorAll(".toolbar__tool");
	g_editor.tools.forEach((n, i) => {
		selectToolOnClick(tools[i], n);
	});
}

function selectToolOnClick(button, toolName)
{
	button.addEventListener("click", () => {
		g_editor.selectTool(toolName);
	});
}

function attachLayerListeners()
{
	g_editor.layerManager.onAdd.addListener((layer) => {
		layer.canvas.classList.add(cl_canvas);
		layer.parent.classList.add(cl_canvasParent);
		let card = createLayerCard(layer);
		card.dataset.id = layer.id;
		layerCards.appendChild(card);
	});
	g_editor.layerManager.onRemove.addListener((layer) => {
		let card = Array.from(layerCards.childNodes).find(c => c.dataset.id === layer.id);
		layerCards.removeChild(card);
	});
	g_editor.layerManager.onSelectedChange.addListener(() => {
		Array.from(layerCards.childNodes).forEach((child) => {
			if (g_editor.layerManager.selected.find(l => l.id === child.dataset.id))
			{
				child.classList.add(cl_layerCardSelected);
			}
			else
			{
				child.classList.remove(cl_layerCardSelected);	
			}
		});
	});
}

function createLayerCard(layer)
{
	let root = document.createElement("div");
	root.classList.add(cl_layerCard);
	root.dataset.id = layer.id;
	root.addEventListener("click", (evt) => {
		if (evt.ctrlKey)
		{
			g_editor.layerManager.select(layer);
		}
		else
		{
			g_editor.layerManager.deselectAll();
			g_editor.layerManager.select(layer);
		}
	});

	let image = layer.image.cloneNode();
	root.appendChild(image);

	let span = document.createElement("span");
	span.classList.add(cl_layerCardHelper);
	root.appendChild(span);

	let removeBtn = document.createElement("button");
	removeBtn.classList.add(cl_layerCardRemoveBtn);
	removeBtn.addEventListener("click", (evt) => {
		evt.stopPropagation();
		g_editor.removeLayer(layer);
	});
	let svg = createSVG(svg_remove);
	removeBtn.appendChild(svg);
	root.appendChild(removeBtn);

	return root;
}

main();
