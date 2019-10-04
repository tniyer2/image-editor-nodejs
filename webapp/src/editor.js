
import { extend } from "./utility";
import { Anchor, Box } from "./geometry";
import { ColorPicker } from "./colorInput";
import { ConstantDictionary } from "./dictionary";

import { CommandStack } from "./command";
import { LayerGroup } from "./layer";
import LayerManager from "./layerManager";
import NodeManager from "./nodeManager";

import ViewportTab from "./viewportTab";
import NodeEditorTab from "./nodeEditorTab";
import NodeSettingsTab from "./nodeSettingsTab";
import AreaManager from "./areaManager";

import MoveTool from "./moveTool";
import PaintTool from "./paintTool";

import { Matrix, ColorFilter,
		 ColorMatrixFilter,
		 ConvolutionFilter } from "./filters";

const DEFAULTS = { stackLimit: null };

export default class {
	constructor(root, options) {
		if (!(root instanceof HTMLElement)) {
			throw new Error("Invalid argument.");
		}

		this._anchor = new Anchor(document.body);
		this._root = new Box(root, this._anchor);
		this._options = extend(DEFAULTS, options);

		this._stack = new CommandStack(this._options.stackLimit);

		this._colorPicker = new ColorPicker(this._anchor);

		this._initAreaManager();
		this._initLayerManager();
		this._initTools();
		this._initFilters();
		this._initNodeManager();
	}

	get stack() {
		return this._stack;
	}

	get colorPicker() {
		return this._colorPicker;
	}

	get tools() {
		return this._tools;
	}

	get filters() {
		return this._filters;
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
		const nt = a2.addTab("nodes");
		a2.addTab("nodeSettings");

		a2.setActive(nt);
	}

	_initLayerManager() {
		const tab = this._areaManager.tabs.get("viewport");
		this._layerManager = new LayerManager(this, tab);
	}

	_initTools() {
		this._tools = new ConstantDictionary();

		const tab1 = this._layerManager.tab;
		const t1 =
			new MoveTool(
				this._layerManager.layers,
				this._stack,
				tab1.layerParent,
				tab1.innerViewport,
				tab1.viewport.element);
		this._tools.put("MoveTool", t1);

		const t2 = new PaintTool(this._stack);
		this._tools.put("PaintTool", t2);
	}

	_initFilters() {
		this._filters = new ConstantDictionary();

		const f1 = new ColorFilter(new Matrix([1.3, 1, 1, 1], 1, 4));
		this._filters.put("test1", f1);

		const f2 = new ColorMatrixFilter(new Matrix(
			[1.2, -0.1, -0.1, 0,
			 -0.1, 1.2, -0.1, 0,
			 -0.1, -0.1, 1.2, 0,
			 0, 0, 0, 1]
				, 4, 4));
		this._filters.put("test2", f2);

		const f3 = new ConvolutionFilter(new Matrix(
			[1, 0, -10,
			 -2, 3, 1,
			 6, 1, -1]
				, 3, 3));
		this._filters.put("test3", f3);
	}

	_initNodeManager() {
		const tab1 = this._areaManager.tabs.get("nodes"),
			  tab2 = this._areaManager.tabs.get("nodeSettings");
		this._nodeManager = new NodeManager(this, [tab1, tab2]);
	}

	initLayer(layer) {
		this._layerManager.initLayer(layer);
	}

	getFinalImage() {
		return this._layerManager.getFinalImage();
	}

	render(node) {
		const outputs = node.outputs.map(p => p.value);

		const layerGroup = outputs.find(p => p instanceof LayerGroup) || null;
		this._layerManager.render(layerGroup);
	}
}
