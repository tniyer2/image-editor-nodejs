
import { removeChildren, addGetter, extend, isUdf } from "./utility";
import { ConstantDictionary, EventDictionary } from "./dictionary";
import { MultiCommand, ToggleLayerCommand, CommandStack } from "./command";
import { TestTool } from "./tool";
import { MoveTool } from "./transform";
import { PaintTool } from "./paint";
import { CirclePattern } from "./pattern";
import { LayerManager } from "./layer";

const DEFAULTS = { viewport: null,
				   primaryColor: "#fff",
				   secondaryColor: "#000",
				   stackLimit: null };

export default class {
	constructor(options) {
		this._options = extend(DEFAULTS, options);
		const lm = new LayerManager(this._options.viewport);
		addGetter(this, "layerManager", lm);

		this._initStack();
		this._initGlobals();
		this._initTools();
	}

	_initStack() {
		const stack = new CommandStack(this._options.stackLimit);
		addGetter(this, "stack", stack);
	}

	_initGlobals() {
		const globals = new EventDictionary();
		addGetter(this, "globals", globals);

		globals.put("primary_color", this._options.primaryColor);
		globals.put("secondary_color", this._options.secondaryColor);
	}

	_initTools() {
		let d = document.createElement("div");
		addGetter(this, "toolOptionsParent", d);

		this._tools = new ConstantDictionary();

		let t;
		t = new MoveTool(this._layerManager, this._stack, { cursor: "all-scroll" });
		this._tools.put("Move", t);
		t = new PaintTool(this._layerManager, this._stack, new CirclePattern());
		this._tools.put("Paint", t);
		t = new TestTool(this._layerManager, this._stack);
		this._tools.put("Test", t);
	}

	get tools() {
		return this._tools.keys;
	}

	selectTool(toolName) {
		let tool = this._tools.get(toolName);
		if (isUdf(tool)) {
			throw new Error(`Tool with name '${toolName}' does not exist.`);
		}

		if (this._selectedTool) {
			this._selectedTool.disable();
		}
		// removeChildren(this._toolOptionsParent);
		// this._toolOptionsParent.appendChild(tool.ui.parent);
		tool.enable();
		this._selectedTool = tool;
	}

	addLayer(layer) {
		let c = new ToggleLayerCommand(this._layerManager, layer, true);
		this._stack.add(c);
		c.execute();
	}

	removeLayer(layer) {
		const c = new ToggleLayerCommand(this._layerManager, layer, false);
		this._stack.add(c);
		c.execute();
	}

	removeLayers(layers) {
		const commands = layers.map((layer) => {
			return new ToggleLayerCommand(this._layerManager, layer, false);
		});
		const c = new MultiCommand(commands);
		this._stack.add(c);
		c.execute();
	}
}
