
import { AddToEventLoop } from "./utility";
import Lock from "./lock";
import { MouseAction, KeyAction,
		 ZoomAction, UserActionPiper } from "./action";
import { Anchor, Box, Vector2 } from "./geometry";
import { ZoomWidget } from "./widget";
import { DragWidget } from "./boxWidgets";
import { NodeLinkWidget, DragNodeWidget } from "./nodeWidgets";
import { SelectWidget, DeleteWidget,
		 ToggleItemCommand } from "./collectionWidgets";
import { MultiNodeInput } from "./node";
import { Collection, BASE, SELECT } from "./collection";

const CALLBACK_PROPS =
["onAdd", "onRemove",
 "onSelect", "onDeselect",
 "onSelectedChange"];
const COLLECTION_INFO = [
{ name: "nodes",
  collection: Collection([BASE, SELECT,
	  { type: Collection.SINGLE,
	  	var: "visible",
	  	onSet: "onVisibleChange" },
	  { type: Collection.SINGLE,
	  	var: "active",
	  	onSet: "onActiveChange" }]),
  callbackProps: CALLBACK_PROPS.concat([
  	"onVisibleChange", "onActiveChange" ]),
  functions:
  ["_onNodeAdd", "_onNodeRemove",
   "_onNodeSelect", "_onNodeDeselect",
   "_onSelectedNodeChange",
   "_onVisibleNodeChange",
   "_onActiveNodeChange"]},
{ name: "links",
  collection: Collection([BASE, SELECT]),
  callbackProps: CALLBACK_PROPS,
  functions:
  ["_onLinkAdd", "_onLinkRemove",
   "_onLinkSelect", "_onLinkDeselect",
   "_onSelectedLinkChange"]}];
const CLASSES =
{ links: "links-parent" };
const NODE_SPAWN = new Vector2(10, 15);

class NodeCooker {
	constructor(lock) {
		this._lock = lock;
	}

	cook(node) {
		if (this._lock && this._lock.locked) return;

		const {graph, acyclic} = this._getSubGraph(node);
		if (acyclic) {
			let key;
			if (this._lock) {
				key = this._lock.lock();
			}
			this._getChain(graph).then((time) => {
				let total = time.reduce((a, b) => a + b, 0);
				total /= 1000;
				const outputs = node.outputs.map(o => o.value);
				console.log("time:", total, "output:", ...outputs);
			}).finally(() => {
				if (this._lock) {
					this._lock.free(key);
				}
			});
		} else {
			console.warn("graph is cyclic:", graph);
		}
	}

	_getChain(graph) {
		return graph.reduce((chain, node) => chain.then((arr) => {
			if (node.locked || !node.dirty) {
				return arr;
			} else {
				const d = Date.now();
				return node.cook().then(() => {
					const elapsed = Date.now() - d;
					arr.push(elapsed);
					return arr;
				});
			}
		}), Promise.resolve([]));
	}

	_getSubGraph(start) {
		let graph = [];

		const unmark = (node) => {
			node.p_perm = node.p_temp = false;
		};

		const visit = (node, first=false) => {
			if (node.p_perm) {
				return true;
			}
			if (node.p_temp) {
				graph.forEach(unmark);
				graph = [];
				return false;
			}
			node.p_temp = true;
			if (!node.locked) {
				for (const ref of node.dependencies) {
					const acyclic = visit(ref);
					if (!acyclic) {
						unmark(ref);
						graph.push(ref);
						return false;
					}
				}
			}
			graph.push(node);
			if (first) {
				graph.forEach(unmark);
			} else {
				node.p_temp = false;
				node.p_perm = true;
			}
			return true;
		};

		const acyclic = visit(start, true);
		if (!acyclic) {
			unmark(start);
		}
		return { graph: graph, acyclic: acyclic };
	}
}

export default class {
	constructor (editor, ns, ins) {
		this._editor = editor;

		this.nodeSpace = new Anchor(ns);
		this.innerNodeSpace = new Box(ins, this.nodeSpace);

		this.lock = new Lock();
		this.lock.pipe(this._editor.stack.lock);
		this._cooker = new NodeCooker(this.lock);

		this._initDOM();

		this._initCollections();

		this._initNetworkUpdater();
		this._initUIUpdater();

		this._keyAction = new KeyAction(this.nodeSpace.element);
		this._initZoomWidget();
		this._initDeleteWidgets();
		this._initNodeSpaceWidget();
		this._initNodeWidgets();
		this._initPointWidgets();
		this._initLinkWidgets();
	}

	_initDOM() {
		const links = document.createElement("div");
		links.classList.add(CLASSES.links);
		const ins = this.innerNodeSpace;
		ins.element.appendChild(links);
		this.linksParent = new Box(links, ins);

		this.nodeOptionsParent = document.createElement("div");
	}

	_initCollections() {
		COLLECTION_INFO.forEach((d) => {
			const opt = {},
				  f = d.functions;
			d.callbackProps.forEach((b, i) => {
				opt[b] = this[f[i]].bind(this);
			});
			this[d.name] = new d.collection(opt);
		});
	}

	_initNetworkUpdater() {
		this._networkUpdater = new AddToEventLoop(() => {
			const n = this.nodes.visible;
			if (n) {
				this._cooker.cook(n);
			}
		});
	}

	_initUIUpdater() {
		this._uiUpdater = new AddToEventLoop(() => {
			const s = this.nodes.selected,
				  l = s.length;
			this.nodes.active = l ? s[l-1] : null;
		});
	}

	_initZoomWidget() {
		this._zoomWidget = new ZoomWidget(this.innerNodeSpace, 
		{ factor: 0.2,
		  condition: () => {
			const c = this._editor.stack.current;
			return !c || !c.open;
		} });
		const action = new ZoomAction(this.nodeSpace.element);
		this._zoomWidget.handle(action);
	}

	_initDeleteWidgets() {
		const dw = new DeleteWidget(
			[this.nodes, this.links], this._editor.stack);
		dw.handle(this._keyAction);
	}

	_initNodeSpaceWidget() {
		const w = new DragWidget({ boxes: [this.innerNodeSpace] });
		const elm = this.nodeSpace.element;
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
			this.innerNodeSpace.element,
			this.nodeSpace.element, 
			{ mouseMoveAlways: true,
			  mouseLeaveAlways: true });
		piper.pipe(action);

		const connect = new NodeLinkWidget(
			this.links, this.linksParent, this._editor.stack, this.lock);
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

	get stack() {
		return this._editor.stack;
	}

	addNode(node) {
		const c = new ToggleItemCommand(this.nodes, node, true);
		this._editor.stack.add(c);
		c.execute();
	}

	_initNode(node) {
		node.manager = this;
		node.parent = this.innerNodeSpace;

		const bounds = this.nodeSpace.element;

		const m1 = new MouseAction(
			node.element, bounds, { data: node });
		this._nodeMouseAction.pipe(m1);

		node.inputs.concat(node.outputs).forEach((p) => {
			const m2 = new MouseAction(
				p.element, bounds, { data: p });
			this._pointMouseAction.pipe(m2);
		});

		node.position = this.nodeSpace.position.add(NODE_SPAWN);
	}

	_onNodeAdd(node) {
		this.innerNodeSpace.element.appendChild(node.element);
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
	}

	_onNodeRemove(node) {
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
	}

	_onNodeSelect(node) {
		node.selected = true;
		this.innerNodeSpace.element.appendChild(node.element);
	}

	_onNodeDeselect(node) {
		node.selected = false;
	}

	_onSelectedNodeChange(fname) {
		if (fname === "selectOnly") {
			this.links.deselectAll();
		}
		this._uiUpdater.invoke();
	}

	_onVisibleNodeChange(oldNode, node) {
		if (oldNode) {
			oldNode.visible = false;
		}
		if (node) {
			node.visible = true;
		}
		this.updateNetwork();
	}

	_onActiveNodeChange(oldNode, node) {
		if (oldNode) {
			oldNode.ui.disable();
		}
		if (node) {
			node.ui.enable(this.nodeOptionsParent);
		}
	}

	_initLink(link) {
		const bounds = this.nodeSpace.element;
		const m = new MouseAction(link.element, bounds, 
			{ data: link });
		this._linkMouseAction.pipe(m);
	}

	_onLinkAdd(link) {
		if (link.input instanceof MultiNodeInput) {
			link.input.addLink(link);
			link.input.links.forEach((l) => {
				l.updatePath();
			});
		} else {
			link.input.link = link;
		}
		link.output.addLink(link);
		this.linksParent.element.appendChild(link.element);

		if (!link.p_initialized) {
			this._initLink(link);
			link.p_initialized = true;
		}

		this.updateNetwork();
	}

	_onLinkRemove(link) {
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
	}

	_onLinkSelect(link) {
		this.linksParent.element.appendChild(link.element);
		link.selected = true;
	}

	_onLinkDeselect(link) {
		link.selected = false;
	}

	_onSelectedLinkChange(fname) {
		if (fname === "selectOnly") {
			this.nodes.deselectAll();
		}
	}

	updateNetwork() {
		this._networkUpdater.invoke();
	}
}
