
import { isUdf, isFunction, addGetter, make } from "./utility";
import { addOptions } from "./options";
import { ConstantDictionary, EventDictionary } from "./dictionary";
import { ColorPicker, ColorBox } from "./colorInput";
import { Command, MultiCommand, CommandStack } from "./command";
import { SmoothCirclePattern, SmoothCirclePatternToolUI } from "./pattern";
import { PaintTool } from "./paint";
import { MoveTool, MoveToolUI } from "./moveTool";
import { LayerManager } from "./layer";
import { NodeManager, TestNode } from "./node";

class ToggleItemCommand extends Command {
	constructor(collection, item, add, addName="add", removeName="remove") {
		super(Command.IMMEDIATE);
		this._collection = collection;
		this._item = item;
		this._add = add;
		this._addName = addName;
		this._removeName = removeName;
	}

	_doAction(b) {
		if (this._add === b) {
			this._collection[this._addName](this._item);
		} else {
			this._collection[this._removeName](this._item);
		}
	}

	_execute() {
		this._doAction(true);
	}

	_undo() {
		this._doAction(false);
	}

	_redo() {
		this._doAction(true);
	}
}

const DEFAULTS = { viewport: null,
				   primaryColor: [0, 0, 0, 255],
				   stackLimit: null };

export default class {
	constructor(options) {
		addOptions(this, DEFAULTS, options);

		this._initLayerManager();
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
		this._initNodes();
		this._initNodeAutoComplete();
		this._initNodeManager();
	}

	_initLayerManager() {
		const v  = this._options.get("viewport"),
			  iv = this._options.get("innerViewport");
		const lm = new LayerManager(v, iv);
		addGetter(this, "layerManager", lm);
	}

	_initStack() {
		const s = new CommandStack(this._options.get("stackLimit"));
		addGetter(this, "stack", s);
	}

	_initGlobals() {
		const g = new EventDictionary();
		addGetter(this, "globals", g);

		g.put("primaryColor", this._options.get("primaryColor"));
	}

	get tools() {
		return this._tools.keys;
	}

	_initTools() {
		const d = make("div");
		addGetter(this, "toolOptionsParent", d);

		this._tools = new ConstantDictionary();

		const t1 = {};
		t1.tool = new MoveTool(this);
		t1.ui 	= new MoveToolUI(t1.tool.options, this._globals);
		this._tools.put("Move", t1);

		const t2 = {};
		const pattern1 = new SmoothCirclePattern();
		t2.tool = new PaintTool(this, pattern1);
		t2.ui 	= new SmoothCirclePatternToolUI(t2.tool.options, 
												pattern1.options, 
												this._globals);
		this._tools.put("Paint", t2);
	}

	_initNodes() {
		this._nodes = new ConstantDictionary();
		this._nodes.put("test_node", TestNode);
	}

	_initNodeAutoComplete() {
		const ac = this._options.get("nodeAutoComplete");
		ac.options.put("values", this._nodes.keys);
		ac.onConfirm.addListener((value, input) => {
			if (this._nodes.has(value)) {
				const createNode = this._nodes.get(value);
				if (isFunction(createNode)) {
					const node = new createNode();
					this._addNode(node);
				} else {
					console.warn("createNode is not of type Node:", createNode);
				}
			}
		});
		addGetter(this, "nodeAutoComplete", ac);
	}

	_initNodeManager() {
		const ns = this._options.get("nodeSpace"),
			  ins = this._options.get("innerNodeSpace"),
			  links = this._options.get("linksContainer");
		const nm = new NodeManager(this, ns, ins, links);
		addGetter(this, "nodeManager", nm);
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
		const c = new ToggleItemCommand(this._layerManager.layers, layer, true);
		this._stack.add(c);
		c.execute();
	}

	removeLayer(layer) {
		const c = new ToggleItemCommand(this._layerManager.layers, layer, false);
		this._stack.add(c);
		c.execute();
	}

	removeLayers(layers) {
		const commands = layers.map((l) => {
			return new ToggleItemCommand(this._layerManager.layers, l, false);
		});
		const c = new MultiCommand(commands);
		this._stack.add(c);
		c.execute();
	}

	_addNode(node) {
		const c = new ToggleItemCommand(this._nodeManager.nodes, node, true);
		this._stack.add(c);
		c.execute();
	}

	removeNode(node) {
		const c = new ToggleItemCommand(this._nodeManager.nodes, node, false);
		this._stack.add(c);
		c.execute();
	}

	removeNodes(nodes) {
		const commands = nodes.map((n) => {
			return new ToggleItemCommand(this._nodeManager.nodes, n, false);
		});
		const c = new MultiCommand(commands);
		this._stack.add(c);
		c.execute();
	}
}
