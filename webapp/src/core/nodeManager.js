
import { AddToEventLoop } from "../util/util";
import ConstantDictionary from "../util/constantDictionary";
import Lock from "../util/lock";
import Vector2 from "../vector/vector2";
import AutoComplete from "../input/autoComplete";

import MouseAction from "../event/mouseAction";
import KeyAction from "../event/keyAction";
import { UserActionPiper } from "../event/userActionUtil";

import ZoomAction from "../event/zoomAction";
import ZoomWidget from "../widgets/zoomWidget";

import { DragWidget } from "../transform/boxWidgets";
import { NodeLinkWidget, DragNodeWidget } from "../widgets/nodeWidgets";
import { SelectWidget, DeleteWidget,
		 ToggleItemCommand } from "../widgets/collectionWidgets";

import { TestNode, AsyncTestNode } from "../nodes/testNodes";
import ImageNode from "../nodes/imageNode";
import MergeNode from "../nodes/mergeNode";
import TransformNode from "../transform/transformNode";
import PaintNode from "../paint/paintNode";
import FilterNode from "../filter/filterNode";

import { Collection, BASE, SELECT } from "./collection";
import { Node, MultiNodeInput } from "./node";
import NodeCooker from "./nodeCooker";

const NodeCollection = Collection([BASE, SELECT,
{ type: Collection.SINGLE,
  var: "visible",
  onChange: "onVisibleChange" },
{ type: Collection.SINGLE,
  var: "active",
  onChange: "onActiveChange" }]);

const LinkCollection = Collection([BASE, SELECT]);

const NODE_SPAWN = new Vector2(10, 15);

export default class {
	constructor (editor, tabs) {
		this._editor = editor;
		this._nodesTab = tabs[0];
		this._settingsTab = tabs[1];

		this.lock = new Lock();
		this.lock.pipe(this._editor.stack.lock);
		this._cooker = new NodeCooker(this.lock);

		this.nodes = new NodeCollection();
		this._addNodeListeners();
		this.links = new LinkCollection();
		this._addLinkListeners();

		this._initNodeDictionary();
		this._createAutoComplete();

		this._initNetworkUpdater();
		this._initActiveNodeUpdater();

		this._keyAction = new KeyAction(this._nodesTab.nodeSpace.element);
		this._initZoomWidget();
		this._initDeleteWidgets();
		this._initNodeSpaceWidget();
		this._initNodeWidgets();
		this._initPointWidgets();
		this._initLinkWidgets();
	}

	get editor() {
		return this._editor;
	}

	get stack() {
		return this._editor.stack;
	}

	_initNode(node) {
		node.manager = this;
		node.parent = this._nodesTab.innerNodeSpace;

		const bounds = this._nodesTab.nodeSpace.element;

		const m1 = new MouseAction(
			node.element, bounds, { data: node });
		this._nodeMouseAction.pipe(m1);

		node.inputs.concat(node.outputs).forEach((p) => {
			const m2 = new MouseAction(
				p.element, bounds, { data: p });
			this._pointMouseAction.pipe(m2);
		});

		node.position =
			this._nodesTab.nodeSpace
				.position.add(NODE_SPAWN);

		node.ui.messageBox = this._settingsTab.messageBox;

		const type = node.toolType;
		if (type !== null && this._editor.tools.has(type)) {
			node.tool = this._editor.tools.get(type);
		}
	}

	_addNodeListeners() {
		this.nodes.onAdd.addListener((node) => {
			this._nodesTab.innerNodeSpace.element.appendChild(node.element);
			if (node.p_links) {
				node.p_links.forEach((l) => {
					this.links.add(l);
				});
				node.p_links = null;
			}

			if (!node.p_initialized) {
				this._initNode(node);
				node.p_initialized = true;
			}
		});

		this.nodes.onRemove.addListener((node) => {
			if (this.nodes.visible === node) {
				this.nodes.visible = null;
			}
			if (node.selected) {
				this.nodes.deselect(node);
			}

			node.element.remove();

			node.p_links = node.links;
			node.p_links.forEach((l) => {
				this.links.remove(l);
			});
		});

		this.nodes.onSelect.addListener((node) => {
			node.selected = true;
			this._nodesTab.innerNodeSpace.element.appendChild(node.element);
		});

		this.nodes.onDeselect.addListener((node) => {
			node.selected = false;
		});

		this.nodes.onSelectedChange.addListener((fname) => {
			if (fname === "selectOnly") {
				this.links.deselectAll();
			}
			this._activeNodeUpdater.update();
		});

		this.nodes.onVisibleChange.addListener((oldNode, node) => {
			if (oldNode) {
				oldNode.visible = false;
			}
			if (node) {
				node.visible = true;
			}
			this.updateNetwork();
		});

		this.nodes.onActiveChange.addListener((oldNode, node) => {
			this._settingsTab.messageBox.clear();

			if (oldNode) {
				oldNode.ui.remove();
			}
			if (node) {
				node.ui.addTo(this._settingsTab.wrapper);
			}
		});
	}

	_initLink(link) {
		const bounds = this._nodesTab.nodeSpace.element;
		const m = new MouseAction(link.element, bounds, 
			{ data: link });
		this._linkMouseAction.pipe(m);
	}

	_addLinkListeners() {
		this.links.onAdd.addListener((link) => {
			if (link.input instanceof MultiNodeInput) {
				link.input.addLink(link);
				link.input.links.forEach((l) => {
					l.updatePath();
				});
			} else {
				link.input.link = link;
			}
			link.output.addLink(link);
			this._nodesTab.linksParent.element.appendChild(link.element);

			if (!link.p_initialized) {
				this._initLink(link);
				link.p_initialized = true;
			}

			this.updateNetwork();
		});

		this.links.onRemove.addListener((link) => {
			if (link.selected) {
				this.links.deselect(link);
			}

			if (link.input instanceof MultiNodeInput) {
				link.input.removeLink(link);
				link.input.links.forEach((l) => {
					l.updatePath();
				});
			} else {
				link.input.link = null;
			}
			link.output.removeLink(link);
			link.element.remove();

			this.updateNetwork();
		});

		this.links.onSelect.addListener((link) => {
			this._nodesTab.linksParent.element.appendChild(link.element);
			link.selected = true;
		});

		this.links.onDeselect.addListener((link) => {
			link.selected = false;
		});

		this.links.onSelectedChange.addListener((fname) => {
			if (fname === "selectOnly") {
				this.nodes.deselectAll();
			}
		});
	}

	_initNodeDictionary() {
		const n = this._nodeTypes = new ConstantDictionary();

		n.put("test_node", TestNode);
		n.put("async_test_node", AsyncTestNode);
		n.put("image", ImageNode);
		n.put("merge", MergeNode);
		n.put("transform", TransformNode);
		n.put("paint", PaintNode);
		n.put("filter", FilterNode);
	}

	_createAutoComplete() {
		const ac = new AutoComplete(
			this._nodesTab.searchInput, 
			{ form: this._nodesTab.form, 
			  values: this._nodeTypes.keys() });

		this._nodesTab.wrapper2.appendChild(ac.list);

		ac.onConfirm.addListener((value, input) => {
			if (this._nodeTypes.has(value)) {
				const nodeType = this._nodeTypes.get(value);
				const node = new nodeType();
				this._addNode(node);
			}
		});
	}

	_initNetworkUpdater() {
		this._networkUpdater = new AddToEventLoop(() => {
			const n = this.nodes.visible;
			if (n) {
				const p = this._cooker.cook(n);
				if (p) {
					p.then((info) => {
						/*
						let total = info.time.reduce((a, b) => a + b, 0);
						total /= 1000;
						const outputs = n.outputs.map(o => o.value);
						console.log("time:", total, "output:", ...outputs);
						*/

						const diffNode = n !== this._prevRendered;
						if (diffNode || !info.clean) {
							this._editor.render(n);
							this._prevRendered = n;
						}
					});
				}
			} else {
				this._prevRendered = null;
				this._editor.render(null);
			}
		});
	}

	_initActiveNodeUpdater() {
		this._activeNodeUpdater = new AddToEventLoop(() => {
			const s = this.nodes.selected,
				  l = s.length;
			this.nodes.active = l ? s[l-1] : null;
		});
	}

	_initZoomWidget() {
		this._zoomWidget = new ZoomWidget(this._nodesTab.innerNodeSpace, 
		{ factor: 0.3,
		  min: 0.5,
		  max: 2,
		  zoomOnCursor: false,
		  condition: () => {
			const c = this._editor.stack.current;
			return !c || !c.open;
		} });
		const action = new ZoomAction(this._nodesTab.nodeSpace.element);
		this._zoomWidget.handle(action);
	}

	_initDeleteWidgets() {
		const dw = new DeleteWidget(
			[this.nodes, this.links], this._editor.stack);
		dw.handle(this._keyAction);
	}

	_initNodeSpaceWidget() {
		const w = new DragWidget({ boxes: [this._nodesTab.innerNodeSpace] });

		const elm = this._nodesTab.nodeSpace.element;
		const action = new MouseAction(elm, elm, {
			condition: (evt) => evt.button === 0 || evt.button === 1
		});

		w.handle(action);
	}

	_initNodeWidgets() {
		const piper = new UserActionPiper();

		const select = new SelectWidget(this.nodes);
		const drag = new DragNodeWidget(
			{ boxes: () => this.nodes.selected, 
			  stack: this._editor.stack });
		select.handle(piper);
		drag.handle(piper);

		this._nodeMouseAction = piper;
	}

	_initPointWidgets() {
		const piper = new UserActionPiper();

		const action = new MouseAction(
			this._nodesTab.innerNodeSpace.element,
			this._nodesTab.nodeSpace.element, 
			{ mouseMoveAlways: true,
			  mouseLeaveAlways: true });
		piper.pipe(action);

		const connect = new NodeLinkWidget(
			this.links, this._nodesTab.linksParent, this._editor.stack, this.lock);
		connect.handle(piper);
		connect.handle(this._keyAction);

		this._pointMouseAction = piper;
	}

	_initLinkWidgets() {
		const piper = new UserActionPiper();

		const select = new SelectWidget(this.links);
		select.handle(piper);

		this._linkMouseAction = piper;
	}

	_addNode(node) {
		if (!(node instanceof Node)) {
			throw new Error("Invalid argument.");
		}

		const c = new ToggleItemCommand(this.nodes, node, true);
		this._editor.stack.add(c);
		c.execute();
	}

	updateNetwork() {
		this._networkUpdater.update();
	}
}
