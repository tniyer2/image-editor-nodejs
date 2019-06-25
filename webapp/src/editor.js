
import { make, removeChildren, addGetter, extend, isUdf } from "./utility";
import { ConstantDictionary, EventDictionary } from "./dictionary";
import { MultiCommand, ToggleLayerCommand, CommandStack } from "./command";
import { MoveTool, MoveToolUI } from "./transform";
import { PaintTool } from "./paint";
import { SmoothArcPattern, SmoothArcPatternToolUI } from "./pattern";
import { ColorPicker, ColorBox } from "./input";
import { LayerManager } from "./layer";

const DEFAULTS = { viewport: null,
				   primaryColor: [0, 0, 0, 255],
				   stackLimit: null };

export default class {
	constructor(options) {
		this._options = extend(DEFAULTS, options);
		const lm = new LayerManager(this._options.viewport);
		addGetter(this, "layerManager", lm);

		this._initStack();
		this._initGlobals();

		const cp = new ColorPicker();
		addGetter(this, "colorPicker", cp);
		const cb = new ColorBox(cp);
		addGetter(this, "primaryColorBox", cb);
		cb.onChange.addListener((color) => {
			this._globals.put("primaryColor", color);
		});

		this._initTools();
	}

	_initStack() {
		const stack = new CommandStack(this._options.stackLimit);
		addGetter(this, "stack", stack);
	}

	_initGlobals() {
		const g = new EventDictionary();
		addGetter(this, "globals", g);

		g.put("primaryColor", this._options.primaryColor);
	}

	_initTools() {
		const d = make("div");
		addGetter(this, "toolOptionsParent", d);

		this._tools = new ConstantDictionary();

		let t;
		t = new MoveTool(this._layerManager, this._stack, 
						 new MoveToolUI(), 
						 { cursor: "all-scroll" });
		this._tools.put("Move", t);
		t = new PaintTool(this._layerManager, this._stack, 
						  new SmoothArcPatternToolUI(this._globals), 
						  new SmoothArcPattern());
		this._tools.put("Paint", t);
	}

	get tools() {
		return this._tools.keys;
	}

	selectTool(toolName) {
		const tool = this._tools.get(toolName);
		if (isUdf(tool)) {
			throw new Error(`Tool with name '${toolName}' does not exist.`);
		}

		if (this._selectedTool) {
			this._selectedTool.disable();
		}

		tool.enable(this._toolOptionsParent);
		this._selectedTool = tool;
	}

	addLayer(layer) {
		const c = new ToggleLayerCommand(this._layerManager, layer, true);
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
