
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
import NodeManager from "./nodeManager";
import ViewportTab from "./viewportTab";
import NodeEditorTab from "./nodeEditorTab";
import AreaManager from "./areaManager";
import { AutoComplete } from "./input";

const DEFAULTS = { primaryColor: [0, 0, 0, 255],
				   stackLimit: null };

export default class {
	constructor(root, options) {
		this._root = root;

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

		this._initAreaManager();
		this._initLayerManager();
		this._initNodes();
		this._initNodeManager();
		this._initNodeAutoComplete();
		this._initTools();
	}

	_initAreaManager() {
		this.areaManager = new AreaManager(this._root);
		this.areaManager.tabs.register("viewport", ViewportTab);
		this.areaManager.tabs.register("nodes", NodeEditorTab);
	}

	_initLayerManager() {
		const tab = this.areaManager.tabs.get("viewport", false);
		tab.toolbarOptions.appendChild(this.primaryColorBox.root);
		this.layerManager = new LayerManager(this, tab);
	}

	_initNodes() {
		this._nodes = new ConstantDictionary();
		this._nodes.put("test_node", TestNode);
		this._nodes.put("async_test_node", AsyncTestNode);
		this._nodes.put("image", ImageNode);
		this._nodes.put("merge", MergeNode);
	}

	_initNodeManager() {
		const tab = this.areaManager.tabs.get("nodes", false);
		this.nodeManager = new NodeManager(this, tab);
	}

	_initNodeAutoComplete() {
		const tab = this.areaManager.tabs.get("nodes", false);

		const ac = new AutoComplete(
			tab.searchInput, 
			{ form: tab.form, 
			  values: this._nodes.keys });
		tab.wrapper2.appendChild(ac.list);

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

		const tab = this.areaManager.tabs.get("viewport", false);

		this._tools.keys.forEach((toolName) => {
			const btn = tab.createToolButton(toolName);
			btn.addEventListener("click", () => {
				this.selectTool(toolName);
			});
		});
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
