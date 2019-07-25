
import { addGetter, removeItem, show, hide, 
		 createSVG, preventBubble, myeval, flatten } from "./utility";
import { addEvent } from "./event";
import { Anchor, Box, Vector2 } from "./geometry";
import { MouseAction, MouseActionPiper, MouseActionHandler } from "./action";
import { DragWidget } from "./boxWidgets";
import { SelectWidget } from "./widget";
import { Collection, BASE, SELECT } from "./collection";

export { NodeManager, Node, TestNode };

const Link = (function(){
	const CLASSES =
	{ root: "node-link", 
	  selected: "selected",
	  completed: "completed",
	  path1: "line",
	  path2: "click-box" };
	const PADDING = 5;

	return class extends Box {
		constructor() {
			const d = document.createElement("div");
			d.classList.add(CLASSES.root);
			preventBubble(d, "mousedown", "mouseup");
			super(d);

			this._createDOM();

			this._input = null;
			this._output = null;
			this._selected = false;
			this._completed = false;
		}

		_createDOM() {
			const ns = createSVG.SVGNS;

			const svg = document.createElementNS(ns, "svg");
			this._element.appendChild(svg);
			this._svg = svg;

			this._paths = ["path1", "path2"].map((cl) => {
				const p = document.createElementNS(ns, "path");
				p.classList.add(CLASSES[cl]);
				svg.appendChild(p);
				return p;
			});
		}

		get selected() {
			return this._selected;
		}

		set selected(val) {
			this._selected = val;
			this._element.classList.toggle(CLASSES.selected, val);
		}

		get completed() {
			return this._completed;
		}

		get input () {
			return this._input;
		}

		set input (val) {
			if (!(val instanceof NodeInput)) {
				console.warn("Invalid value for input:", val);
			} else if (this._input) {
				console.warn("Cannot change value of input.");
			}
			this._input = val;
			this._checkComplete();
		}

		get output () {
			return this._output;
		}

		set output (val) {
			if (!(val instanceof NodeOutput)) {
				console.warn("Invalid value for output:", val);
			} else if (this._output) {
				console.warn("Cannot change value of output.");
			}
			this._output = val;
			this._checkComplete();
		}

		_checkComplete() {
			this._completed = this._input && this._output;
			if (this._completed) {
				this._element.classList.add(CLASSES.completed);
			}
		}

		updatePath (i, o) {
			if (!i) {
				i = this.input.center;
			}
			if (!o) {
				o = this.output.center;
			}

			const n = new Vector2(i.x, o.y), 
				  m = new Vector2(o.x, i.y);

			let tlbr = [[i, o], [o, i], [n, m], [m, n]].find((arr) => {
				const [a, b] = arr;
				return a.x < b.x && a.y < b.y;
			});
			if (!tlbr) {
				tlbr = i.x < o.x || i.y < o.y ? [i, o] : [o, i];
			}
			let [tl, br] = tlbr;

			const p = new Vector2(PADDING, PADDING);
			const negp = p.negate();
			const tl2 = tl.subtract(p);
			const br2 = br.add(p);
			const diff = br2.subtract(tl2);
			const rect = [negp.x, negp.y, diff.x, diff.y];

			this._svg.setAttributeNS(null, "viewBox", rect.join(" "));
			this._svg.setAttributeNS(null, "width", diff.x);
			this._svg.setAttributeNS(null, "height", diff.y);
			this.position = tl2;
			this.dimensions = diff;

			const i2 = i.subtract(tl);
			const o2 = o.subtract(tl);
			const d = "M " + i2.x + " " + i2.y + " L " + o2.x + " " + o2.y;

			this._paths.forEach((p) => {
				p.setAttributeNS(null, "d", d);
			});
		}
	};
})();

class NodeLinkWidget extends MouseActionHandler {
	constructor(cln, parent) {
		super();
		this._collection = cln;
		this._parent = parent;

		this._link = null;
		this._prevLink = null;
		this._setting = false;
	}

	_onInput(point) {
		if (this._setting) {
			if (!this._inputStart && point.node !== this._link.output.node) {
				this._setLink(point, true);
			} else {
				this._clear();
			}
		} else {
			this._createLink(point, true);
		}
	}

	_onOutput(point) {
		if (this._setting) {
			if (this._inputStart && point.node !== this._link.input.node) {
				this._setLink(point, false);
			} else {
				this._clear();
			}
		} else {
			this._createLink(point, false);
		}
	}

	_createLink(point, isInput) {
		this._setting = true;
		this._inputStart = isInput;

		this._link = new Link();
		this._parent.element.appendChild(this._link.element);
		this._link.parent = this._parent;

		if (isInput) {
			const prev = point.link;
			if (prev) {
				hide(prev.element);
				this._prevLink = prev;
			}
			this._link.input = point;
		} else {
			this._link.output = point;
		}
	}

	_setLink(point, isInput) {
		if (isInput) {
			this._link.input = point;
			this._prevLink = point.link;
		} else {
			this._link.output = point;
		}

		if (this._prevLink) {
			this._collection.remove(this._prevLink);
			this._prevLink = null;
		}

		this._link.updatePath();
		this._collection.add(this._link);
		this._link = null;

		this._setting = false;
	}

	_clear(removePrev=true) {
		this._link.element.remove();
		this._link = null;
		if (this._prevLink) {
			if (removePrev) {
				this._collection.remove(this._prevLink);
			}
			show(this._prevLink.element);
			this._prevLink = null;
		}

		this._setting = false;
	}

	_onClick(mdEvt, muEvt, point) {
		if (point instanceof NodeInput) {
			this._onInput(point);
		} else if (point instanceof NodeOutput) {
			this._onOutput(point);
		} else if (this._setting) {
			this._clear();
		}
	}

	_onMove(evt, point) {
		if (this._setting) {
			let p = this._getMousePosition(evt);
			if (this._inputStart) {
				this._link.updatePath(null, p);
			} else {
				this._link.updatePath(p, null);
			}
		}
	}

	_onEnd(evt, point) {
		if (this._setting) {
			this._clear();
		}
	}
}

const NodePoint = (function(){
	const cl_point = "point";

	return class extends Box {
		constructor() {
			const d = document.createElement("div");
			d.classList.add(cl_point);
			preventBubble(d, "mousedown", "mouseup");
			super(d);

			this.node = null;
		}
	};
})();

class NodeOutput extends NodePoint {
	constructor() {
		super();
		this._value = null;
		this._links = [];
		addEvent(this, "onChange");
	}

	get value() {
		return this._value;
	}

	set value(val) {
		this._value = val;
		this._onChange.trigger();
	}

	get links() {
		return this._links.slice();
	}

	addLink(link) {
		this._links.push(link);
	}

	removeLink(link) {
		const removed = removeItem(this._links, link);
		if (!removed) {
			console.warn("Could not remove link from this._links:", removed);
		}
	}
}

class NodeInput extends NodePoint {
	constructor() {
		super();
		this._link = null;
		addEvent(this, "onChange");
	}

	get link() {
		return this._link;
	}

	set link(val) {
		if (this._link === val) return;

		if (this._unlink) {
			this._unlink();
		}
		this._onChange.trigger();
		this._unlink = val ? this._onChange.linkTo(val.output.onChange) : null;

		this._link = val;
	}

	get value() {
		return this._link ? this._link.output.value : null;
	}
}

class NodeDragWidget extends DragWidget {
	_onMove(evt) {
		if (!this._commands) return;
		super._onMove(evt);

		let boxes = this._boxGroups.map(g => myeval(g.boxes));
		boxes = flatten(boxes);

		let inputs = boxes.map(b => b.inputs);
		inputs = flatten(flatten(inputs));
		let outputs = boxes.map(b => b.outputs);
		outputs = flatten(flatten(outputs));

		let iLinks = inputs.map(p => p.link); 
		let oLinks = flatten(outputs.map(o => o.links));
		let links = iLinks.concat(oLinks).filter(Boolean);
		links = Array.from(new Set(links));

		links.forEach((l) => {
			l.updatePath();
		});
	}
}

const Node = (function(){
	const CLASSES = { root: "node-wrapper",
					  node: "node",
					  view: "toggle-view",
					  lock: "toggle-lock",
					  inputs: "inputs",
					  outputs: "outputs",
					  points: "points",
					  selected: "selected",
					  locked: "on",
					  visible: "on" };
	const svg_view = "#icon-view",
		  svg_lock = "#icon-lock";

	return class extends Box {
		constructor(inputs, outputs) {
			const d = document.createElement("div");
			preventBubble(d, "mousedown", "mouseup");
			super(d);

			addGetter(this, "inputs", inputs);
			addGetter(this, "outputs", outputs);

			addGetter(this, "dirty", true);
			this._inputs.forEach((input) => {
				input.onChange.addListener(() => {
					this._dirty = true;
				});
			});

			this._selected = false;
			this._locked = false;
			this._visible = false;

			this._createDOM();
			this._attachEvents();
		}

		_createDOM() {
			const d = this._element;
			d.classList.add(CLASSES.root);

			const appendPoints = (points, parent) => {
				points.forEach((p) => {
					parent.element.appendChild(p.element);
					p.parent = parent;
					p.node = this;
				});
			};

			const inputs = document.createElement("div");
			inputs.classList.add(CLASSES.points, CLASSES.inputs);
			this._inputsBox = new Box(inputs, this);
			appendPoints(this._inputs, this._inputsBox);
			d.appendChild(inputs);

			const outputs = document.createElement("div");
			outputs.classList.add(CLASSES.points, CLASSES.outputs);
			this._outputsBox = new Box(outputs, this);
			appendPoints(this._outputs, this._outputsBox);
			d.appendChild(outputs);

			const node = document.createElement("div");
			node.classList.add(CLASSES.node);
			d.appendChild(node);
			this._nodeElm = node;

			const viewBtn = document.createElement("button");
			viewBtn.type = "button";
			viewBtn.classList.add(CLASSES.view);
			const svg1 = createSVG(svg_view);
			viewBtn.appendChild(svg1);
			this._viewBtn = viewBtn;

			const lockBtn = document.createElement("button");
			lockBtn.type = "button";
			lockBtn.classList.add(CLASSES.lock);
			const svg2 = createSVG(svg_lock);
			lockBtn.appendChild(svg2);
			this._lockBtn = lockBtn;

			node.appendChild(lockBtn);
			node.appendChild(viewBtn);
		}

		_attachEvents() {
			preventBubble(this._viewBtn, "mouseup", "mousedown");
			this._viewBtn.addEventListener("click", (evt) => {
				const val = !this._visible;
				this.manager.nodes.visible = val ? this : null;
				this.visible = val;
			});

			preventBubble(this._lockBtn, "mouseup", "mousedown");
			this._lockBtn.addEventListener("click", (evt) => {
				this.locked = !this._locked;
			});
		}

		get selected() {
			return this._selected;
		}

		set selected(val) {
			this._selected = val;
			this._element.classList.toggle(CLASSES.selected, val);
		}

		get locked() {
			return this._locked;
		}

		set locked(val) {
			this._locked = val;
			this._lockBtn.classList.toggle(CLASSES.locked, val);
		}

		get visible() {
			return this._visible;
		}

		set visible(val) {
			this._visible = val;
			this._viewBtn.classList.toggle(CLASSES.visible, val);
		}

		get dependencies() {
			return this._inputs.filter(i => i.link)
				   .map(i => i.link.output.node);
		}

		// returns a promise that resolves true if cooked
		cook() {
			if (this._locked || !this._dirty) {
				return Promise.resolve(false);
			} else {
				return new Promise((resolve) => {
					const inputs = this._inputs.map(i => i.value);
					const p = this._cook(...inputs);
					if (p instanceof Promise) {
						p.then(resolve);
					} else {
						resolve(p);
					}
				}).then((results) => {
					this._outputs.forEach((o, i) => {
						o.value = results[i];
					});
					this._dirty = false;
					return true;
				});
			}
		}
	};
})();

class TestNode extends Node {
	constructor() {
		const input = new NodeInput(),
			  output = new NodeOutput();
		super([input], [output]);
	}

	_cook(a) {
		return [a];
	}
}

const NodeManager = (function(){
	const CALLBACK_PROPS =
	["onAdd", "onRemove", 
	 "onSelect", "onDeselect"];
	const COLLECTION_INFO = [
	{ name: "nodes",
	  collection: Collection([BASE, SELECT,
		  { type: Collection.SINGLE,
		  	var: "visible",
		  	onSet: "onVisibleChange" }]),
	  callbackProps: (()=>{
	  	const c = CALLBACK_PROPS.slice();
	  	c.push("onSet");
	  	return c;
	  })(),
	  functions:
	  ["_onNodeAdd", "_onNodeRemove",
	   "_onNodeSelect", "_onNodeDeselect", 
	   "_onVisibleNodeChange"]},
	{ name: "links",
	  collection: Collection([BASE, SELECT]),
	  callbackProps: CALLBACK_PROPS,
	  functions:
	  ["_onLinkAdd", "_onLinkRemove",
	   "_onLinkSelect", "_onLinkDeselect"]}];

	return class {
		constructor (editor, ns, ins, lc) {
			this._editor = editor;

			const anchor = new Anchor(ns);
			addGetter(this, "nodeSpace", anchor);
			const box = new Box(ins, anchor);
			addGetter(this, "innerNodeSpace", box);
			const box2 = new Box(lc, box);
			addGetter(this, "linksContainer", box2);

			this._initCollections();

			this._initNodeWidgets();
			this._initPointWidgets();
			this._initLinkWidgets();
		}

		_initCollections() {
			COLLECTION_INFO.forEach((d) => {
				const opt = {},
					  f = d.functions;
				d.callbackProps.forEach((b, i) => {
					opt[b] = this[f[i]].bind(this);
				});
				const c = new d.collection(opt);
				addGetter(this, d.name, c);
			});
		}

		_initNodeWidgets() {
			const piper = new MouseActionPiper();

			const action = new MouseAction(
				this._innerNodeSpace.element,
				this._nodeSpace.element,
				{ mouseMoveAlways: true });
			piper.pipe(action);

			const select = new SelectWidget(this._nodes);
			const drag = new NodeDragWidget(
				{ boxes: () => this._nodes.selected, 
				  stack: this._editor.stack });
			select.handle(piper);
			drag.handle(piper);

			this._nodeMouseAction = piper;
		}

		_initPointWidgets() {
			const piper = new MouseActionPiper();

			const action = new MouseAction(
				this._innerNodeSpace.element,
				this._nodeSpace.element, 
				{ mouseMoveAlways: true,
				  mouseLeaveAlways: true });
			piper.pipe(action);

			const connect = new NodeLinkWidget(
				this._links, this._linksContainer);
			connect.handle(piper);

			this._pointMouseAction = piper;
		}

		_initLinkWidgets() {
			const piper = new MouseActionPiper();

			const select = new SelectWidget(this._links);
			select.handle(piper);

			this._linkMouseAction = piper;
		}

		_initNode(node) {
			node.manager = this;
			node.parent = this._innerNodeSpace;

			const bounds = this._nodeSpace.element;

			const m1 = new MouseAction(
				node.element, bounds, { data: node });
			this._nodeMouseAction.pipe(m1);

			node.inputs.concat(node.outputs).forEach((p) => {
				const m2 = new MouseAction(
					p.element, bounds, { data: p });
				this._pointMouseAction.pipe(m2);
			});
		}

		_onNodeAdd(node) {
			if (!node.p_initialized) {
				this._initNode(node);
				node.p_initialized = true;
			}
			this._innerNodeSpace.element.appendChild(node.element);
		}

		_onNodeRemove(node) {
			node.element.remove();
			if (node.selected) {
				this._nodes.deselect(node);
			}
		}

		_onNodeSelect(node) {
			node.selected = true;
			this._innerNodeSpace.element.appendChild(node.element);
		}

		_onNodeDeselect(node) {
			node.selected = false;
		}

		_onVisibleNodeChange(oldNode, node) {
			if (oldNode) {
				oldNode.visible = false;
			}
		}

		_initLink(link) {
			const bounds = this._nodeSpace.element;
			const m = new MouseAction(link.element, bounds, 
				{ data: link });
			this._linkMouseAction.pipe(m);
		}

		_onLinkAdd(link) {
			link.input.link = link;
			link.output.addLink(link);
			this._linksContainer.element.appendChild(link.element);
			if (!link.p_initialized) {
				this._initLink(link);
				link.p_initialized = true;
			}
		}

		_onLinkRemove(link) {
			link.input.link = null;
			link.output.removeLink(link);
			link.element.remove();
			if (link.selected) {
				this._links.deselect(link);
			}
		}

		_onLinkSelect(link) {
			this._linksContainer.element.appendChild(link.element);
			link.selected = true;
		}

		_onLinkDeselect(link) {
			link.selected = false;
		}

		_cook(graph) {
			return graph.reduce((chain, node) => chain.then((arr) => {
				const d = Date.now();
				return node.cook().then((cooked) => {
					const time = cooked ? Date.now() - d : 0;
					arr.push(time);
					return arr;
				});
			}), Promise.resolve([]));
		}

		_getSubGraph(start) {
			let graph = [];

			function unmark(node) {
				node.p_perm = node.p_temp = false;
			}

			function visit(node, first=false) {
				if (node.p_perm) {
					return true;
				}
				if (node.p_temp) {
					graph.forEach(unmark);
					graph = [];
					return false;
				}
				node.p_temp = true;
				for (const ref of node.references) {
					const cyclic = visit(ref);
					if (!cyclic) {
						unmark(ref);
						graph.push(ref);
						return false;
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
			}

			const cyclic = visit(start, true);
			return { graph: graph, cyclic: cyclic };
		}
	};
})();
