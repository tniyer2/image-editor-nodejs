
import { LayerManager } from "./layer";
import { MultiCommand, CommandStack } from "./command";
import { AddLayerCommand, RemoveLayerCommand } from "./defaultCommands";
import { MoveTool, TestTool } from "./tool";
import { removeChildren, addGetter, extend, isUdf } from "./utility";
import { ConstantDictionary, EventDictionary } from "./dictionary";

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
		this._tools.put("move", t);
		t = new TestTool(this._layerManager, this._stack);
		this._tools.put("test", t);
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
		let c = new AddLayerCommand(this._layerManager, layer);
		this._stack.add(c);
		c.execute();
	}

	removeLayer(layer) {
		const c = new RemoveLayerCommand(this._layerManager, layer);
		this._stack.add(c);
		c.execute();
	}

	removeLayers(layers) {
		const commands = layers.map((layer) => {
			return new RemoveLayerCommand(this._layerManager, layer);
		});
		const c = new MultiCommand(commands);
		this._stack.add(c);
		c.execute();
	}
}
