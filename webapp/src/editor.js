
import { isUdf, isFunction } from "./type";
import Options from "./options";
import { ConstantDictionary, EventDictionary } from "./dictionary";
import { ColorPicker, ColorBox } from "./colorInput";
import { CommandStack } from "./command";
import { SmoothCirclePattern, SmoothCirclePatternToolUI } from "./pattern";
import { PaintTool } from "./paint";
import { MoveTool, MoveToolUI } from "./moveTool";
import LayerManager from "./layerManager";
import { TestNode, AsyncTestNode } from "./testNodes";
import { ImageNode, MergeNode } from "./basicNodes";
import { LayerGroup } from "./basicTypes";
import { Anchor } from "./geometry";
import NodeManager from "./nodeManager";

const DEFAULTS = { primaryColor: [0, 0, 0, 255],
				   stackLimit: null };

export default class {
	constructor(options) {
		this.options = new Options();
		this.options.set(DEFAULTS, options);

		this.stack = new CommandStack(this.options.get("stackLimit"));

		this.globals = new EventDictionary();
		this.globals.put("primaryColor", this.options.get("primaryColor"));

		this.colorPicker = new ColorPicker();

		this.primaryColorBox = new ColorBox(this.colorPicker);
		this.primaryColorBox.onChange.addListener((color) => {
			this.globals.put("primaryColor", color);
		});

		this.anchor = new Anchor(document.body);

		this._initLayerManager();
		this._initNodes();
		this._initNodeManager();
		this._initNodeAutoComplete();
		this._initTools();
	}

	_initLayerManager() {
		const v  = this.options.get("viewport"),
			  iv = this.options.get("innerViewport");
		this.layerManager = new LayerManager(this, v, iv);
	}

	_initNodes() {
		this._nodes = new ConstantDictionary();
		this._nodes.put("test_node", TestNode);
		this._nodes.put("async_test_node", AsyncTestNode);
		this._nodes.put("image", ImageNode);
		this._nodes.put("merge", MergeNode);
	}

	_initNodeManager() {
		const root = this.options.get("nodeEditor"),
			  ns = this.options.get("nodeSpace"),
			  ins = this.options.get("innerNodeSpace");
		this.nodeManager = new NodeManager(this, root, ns, ins);
	}

	_initNodeAutoComplete() {
		const ac = this.options.get("nodeAutoComplete");
		this.nodeAutoComplete = ac;

		ac.options.put("values", this._nodes.keys);
		ac.onConfirm.addListener((value, input) => {
			if (this._nodes.has(value)) {
				const createNode = this._nodes.get(value);
				if (isFunction(createNode)) {
					const node = new createNode();
					this.nodeManager.addNode(node);
				} else {
					console.warn("createNode is not of type Node:", createNode);
				}
			}
		});
	}

	get tools() {
		return this._tools.keys;
	}

	_initTools() {
		const d = document.createElement("div");
		this.toolOptionsParent = d;

		this._tools = new ConstantDictionary();

		const t1 = {};
		t1.tool = new MoveTool(this);
		t1.ui 	= new MoveToolUI(t1.tool.options, this.globals);
		this._tools.put("Move", t1);

		const t2 = {};
		const pattern1 = new SmoothCirclePattern();
		t2.tool = new PaintTool(this, pattern1);
		t2.ui 	= new SmoothCirclePatternToolUI(t2.tool.options, 
												pattern1.options, 
												this.globals);
		this._tools.put("Paint", t2);

		this.selectTool("Move");
	}

	render(node) {
		const outputs = node.outputs.map(p => p.value);

		const layerGroup = outputs.find(p => p instanceof LayerGroup) || null;
		this.layerManager.render(layerGroup);
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
		toolInfo.ui.enable(this.toolOptionsParent);
		this._selectedTool = toolInfo;
	}
}
