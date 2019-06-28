
import { isUdf, addGetter, make } from "./utility";
import { ConstantDictionary, EventDictionary } from "./dictionary";
import { MultiCommand, ToggleLayerCommand, CommandStack } from "./command";
import { MoveTool, MoveToolUI } from "./transform";
import { PaintTool } from "./paint";
import { SmoothCirclePattern, SmoothCirclePatternToolUI } from "./pattern";
import { ColorPicker, ColorBox } from "./colorInput";
import { LayerManager } from "./layer";
import { addOptions } from "./options";

const DEFAULTS = { viewport: null,
				   primaryColor: [0, 0, 0, 255],
				   stackLimit: null };

export default class {
	constructor(options) {
		addOptions(this, DEFAULTS, options);

		const lm = new LayerManager(this._options.get("viewport"),
									this._options.get("innerViewport"));
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
		const stack = new CommandStack(this._options.get("stackLimit"));
		addGetter(this, "stack", stack);
	}

	_initGlobals() {
		const g = new EventDictionary();
		addGetter(this, "globals", g);

		g.put("primaryColor", this._options.get("primaryColor"));
	}

	_initTools() {
		const d = make("div");
		addGetter(this, "toolOptionsParent", d);

		this._tools = new ConstantDictionary();

		const t1 = {};
		t1.tool = new MoveTool(this._layerManager, this._stack, { cursor: "all-scroll" });
		t1.ui 	= new MoveToolUI(t1.tool.options, this._globals);
		this._tools.put("Move", t1);

		const t2 = {};
		const pattern1 = new SmoothCirclePattern();
		t2.tool = new PaintTool(this._layerManager, this._stack, pattern1);
		t2.ui 	= new SmoothCirclePatternToolUI(t2.tool.options, 
												pattern1.options, 
												this._globals);
		this._tools.put("Paint", t2);
	}

	get tools() {
		return this._tools.keys;
	}

	selectTool(toolName) {
		const toolInfo = this._tools.get(toolName);
		if (isUdf(toolInfo)) {
			throw new Error(`Tool with name '${toolName}' does not exist.`);
		}

		if (this._selectedTool) {
			this._selectedTool.tool.disable();
			this._selectedTool.ui.disable();
		}

		toolInfo.tool.enable();
		toolInfo.ui.enable(this._toolOptionsParent);
		this._selectedTool = toolInfo;
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
		const commands = layers.map((l) => {
			return new ToggleLayerCommand(this._layerManager, l, false);
		});
		const c = new MultiCommand(commands);
		this._stack.add(c);
		c.execute();
	}
}
