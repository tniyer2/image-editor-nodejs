
import { isUdf, isFunction, addGetter, make } from "./utility";
import { addOptions } from "./options";
import { ConstantDictionary, EventDictionary } from "./dictionary";
import { ColorPicker, ColorBox } from "./colorInput";
import { CommandStack } from "./command";
import { SmoothCirclePattern, SmoothCirclePatternToolUI } from "./pattern";
import { PaintTool } from "./paint";
import { MoveTool, MoveToolUI } from "./moveTool";
import { LayerManager } from "./layer";
import { TestNode, AsyncTestNode } from "./basicNodes";
import NodeManager from "./nodeManager";

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
		const lm = new LayerManager(this, v, iv);
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

		this.selectTool("Move");
	}

	_initNodes() {
		this._nodes = new ConstantDictionary();
		this._nodes.put("test_node", TestNode);
		this._nodes.put("async_test_node", AsyncTestNode);
	}

	_initNodeAutoComplete() {
		const ac = this._options.get("nodeAutoComplete");
		ac.options.put("values", this._nodes.keys);
		ac.onConfirm.addListener((value, input) => {
			if (this._nodes.has(value)) {
				const createNode = this._nodes.get(value);
				if (isFunction(createNode)) {
					const node = new createNode();
					this._nodeManager.addNode(node);
				} else {
					console.warn("createNode is not of type Node:", createNode);
				}
			}
		});
		addGetter(this, "nodeAutoComplete", ac);
	}

	_initNodeManager() {
		const ns = this._options.get("nodeSpace"),
			  ins = this._options.get("innerNodeSpace");
		const nm = new NodeManager(this, ns, ins);
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
}
