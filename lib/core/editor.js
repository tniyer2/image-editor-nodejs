
import { extend } from "../util/util";
import ConstantDictionary from "../util/constantDictionary";
import Vector2 from "../vector/vector2";
import LayerGroup from "../layer/layerGroup";

// import MoveTool from "../transform/moveTool";
import PaintTool from "../paint/paintTool";

import ViewportTab from "../tabs/viewportTab";
import NodeEditorTab from "../tabs/nodeEditorTab";
import NodeSettingsTab from "../tabs/nodeSettingsTab";

import { CommandStack } from "./command";
import LayerManager from "./layerManager";
import NodeManager from "./nodeManager";
import AreaManager from "./areaManager";

const DEFAULTS = {
	stackLimit: null
};

export default class {
	constructor(root, options) {
		if (!(root instanceof HTMLElement)) {
			throw new Error("Invalid argument.");
		}

		this._root = root;
		this._options = extend(DEFAULTS, options);

		this._stack = new CommandStack(this._options.stackLimit);

		this._initAreaManager();
		this._initLayerManager();
		this._initTools();
		this._initNodeManager();
	}

	get stack() {
		return this._stack;
	}

	get tools() {
		return this._tools;
	}

	get layerManager() {
		return this._layerManager;
	}

	_initAreaManager() {
		const m = this._areaManager = new AreaManager(this._root);

		m.tabs.register("viewport", ViewportTab);
		m.tabs.register("nodes", NodeEditorTab);
		m.tabs.register("nodeSettings", NodeSettingsTab);

		const a1 = m.createArea();
		const a2 = m.createArea();
		m.root.addContainer(a1);
		m.root.addContainer(a2);

		a1.addTab("viewport");
		const id = a2.addTab("nodes");
		a2.addTab("nodeSettings");

		a2.setActive(id);
	}

	_initLayerManager() {
		const tab = this._areaManager.tabs.get("viewport");
		this._layerManager = new LayerManager(this, tab);
	}

	_initTools() {
		this._tools = new ConstantDictionary();

		/*
		const vpTab = this._layerManager.tab;
		const t1 =
			new MoveTool(
				this._layerManager.layers,
				this._stack,
				vpTab.mainCanvas.element,
				vpTab.innerViewport,
				vpTab.viewport.element);
		this._tools.put("MoveTool", t1);
		*/

		const t2 = new PaintTool(this._stack);
		this._tools.put("PaintTool", t2);
	}

	_initNodeManager() {
		const
			tab1 = this._areaManager.tabs.get("nodes"),
			tab2 = this._areaManager.tabs.get("nodeSettings");
		this._nodeManager = new NodeManager(this, [tab1, tab2]);
	}

	render(node) {
		let clear = false;
		if (node === null) {
			clear = true;
		} else {
			const
				outputs = node.outputs.map(p => p.value),
				group = outputs.find(p => p instanceof LayerGroup);
			if (group) {
				const
					info = group.info,
					dim = new Vector2(info.width, info.height);
				this._layerManager.setDimensions(dim);
				this._layerManager.update(group.layers);
			} else {
				clear = true;
			}
		}

		if (clear) {
			this._layerManager.setDimensions(Vector2.zero);
			this._layerManager.update([]);
		}
	}
}
