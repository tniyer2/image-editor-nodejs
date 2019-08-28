
import { extend } from "./utility";
import { Anchor, Box } from "./geometry";
import { ColorPicker } from "./colorInput";

import { CommandStack } from "./command";
import { LayerGroup } from "./basicTypes";
import LayerManager from "./layerManager";
import NodeManager from "./nodeManager";

import ViewportTab from "./viewportTab";
import NodeEditorTab from "./nodeEditorTab";
import NodeSettingsTab from "./nodeSettingsTab";
import AreaManager from "./areaManager";

const DEFAULTS = { stackLimit: null };

export default class {
	constructor(root, options) {
		if (!(root instanceof HTMLElement)) {
			throw new Error("Invalid argument.");
		}

		this._anchor = new Anchor(document.body);
		this._root = new Box(root, this._anchor);
		this._options = extend(DEFAULTS, options);

		this.stack = new CommandStack(this._options.stackLimit);

		this.colorPicker = new ColorPicker(this._anchor);

		this._initAreaManager();
		this._initLayerManager();
		this._initNodeManager();
	}

	_initAreaManager() {
		const m = this._areaManager = new AreaManager(this._root);

		m.tabs.register("viewport", ViewportTab);
		m.tabs.register("nodes", NodeEditorTab);
		m.tabs.register("nodeSettings", NodeSettingsTab);

		const a1 = m.getArea();
		const a2 = m.getArea();
		m.root.appendChild(a1);
		m.root.appendChild(a2);

		a1.addTab("viewport");
		const nt = a2.addTab("nodes");
		a2.addTab("nodeSettings");

		a2.setActive(nt);
	}

	_initLayerManager() {
		const tab = this._areaManager.tabs.get("viewport");
		this._layerManager = new LayerManager(this, tab);
	}

	_initNodeManager() {
		const tab1 = this._areaManager.tabs.get("nodes"),
			  tab2 = this._areaManager.tabs.get("nodeSettings");
		this._nodeManager = new NodeManager(this, tab1, tab2);
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
