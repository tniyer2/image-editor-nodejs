
import { addGetter, removeItem,
		 createSVG, preventBubble } from "./utility";
import { addOptions } from "./options";
import { Dictionary } from "./dictionary";
import ToolUI from "./toolUI";
import { addEvent } from "./event";
import { Box, Vector2 } from "./geometry";

export { Node, NodeInput, NodeOutput, Link, NodeUI, EmptyNodeUI };

const Link = (function(){
	const CLASSES =
	{ root: "node-link", 
	  selected: "selected",
	  completed: "completed",
	  path1: "line",
	  path2: "click-box" };
	const PADDING = 50,
		  CP_OFFSET = 0.35;

	return class extends Box {
		constructor() {
			const d = document.createElement("div");
			d.classList.add(CLASSES.root);
			preventBubble(d, "mousedown");
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

			const pd = new Vector2(PADDING, PADDING);
			const pd2 = pd.negate();
			const tl2 = tl.subtract(pd);
			const br2 = br.add(pd);
			const diff = br2.subtract(tl2);
			const rect = [pd2.x, pd2.y, diff.x, diff.y];

			this._svg.setAttributeNS(null, "viewBox", rect.join(" "));
			this._svg.setAttributeNS(null, "width", diff.x);
			this._svg.setAttributeNS(null, "height", diff.y);
			this.position = tl2;
			this.dimensions = diff;

			const o2 = o.subtract(tl);
			const i2 = i.subtract(tl);

			const dir = i2.subtract(o2);
			const mid = dir.divide(2).add(o2);

			const offset = CP_OFFSET * dir.magnitude;
			const offv = new Vector2(0, offset);

			const ocp = o2.add(offv);
			const icp = i2.subtract(offv);

			const d = ["M", o2, "C", ocp, mid, mid, "S", icp, i2]
			.reduce((acc, cur) => {
				if (typeof cur === "string") {
					acc.push(cur);
				} else {
					acc.push(cur.x, cur.y);
				}
				return acc;
			}, []).join(" ");

			this._paths.forEach((p) => {
				p.setAttributeNS(null, "d", d);
			});
		}
	};
})();

const NodePoint = (function(){
	const cl_point = "point";

	return class extends Box {
		constructor() {
			const d = document.createElement("div");
			d.classList.add(cl_point);
			preventBubble(d, "mousedown");
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

const Node = (function(){
	const CLASSES =
	{ root: "node-wrapper",
	  node: "node",
	  view: "toggle-view",
	  lock: "toggle-lock",
	  inputs: "inputs",
	  outputs: "outputs",
	  points: "points",
	  selected: "selected",
	  locked: "on",
	  visible: "on",
	  icon: "icon" };
	const svg_view = "#icon-view",
		  svg_lock = "#icon-lock";
	const DEFAULTS = { icon: null };

	return class extends Box {
		constructor(inputs, outputs, ui, options) {
			const d = document.createElement("div");
			preventBubble(d, "mousedown");
			super(d);

			addGetter(this, "inputs", inputs);
			addGetter(this, "outputs", outputs);
			ui.dictionary.onChange.addListener(() => {
				this._dirty = true;
				if (this.manager) {
					this.manager.updateNetwork();
				}
			});
			addGetter(this, "ui", ui);
			addOptions(this, DEFAULTS, options);

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

			const iconHref = this._options.get("icon");
			let icon;
			if (iconHref) {
				icon = createSVG(iconHref);
				icon.classList.add(CLASSES.icon);
			}

			node.appendChild(lockBtn);
			if (icon) {
				node.appendChild(icon);
			}
			node.appendChild(viewBtn);
		}

		_attachEvents() {
			const isLocked = () => this.manager.lock.locked;

			preventBubble(this._viewBtn, "mouseup", "mousedown");
			this._viewBtn.addEventListener("click", (evt) => {
				if (isLocked()) return;
				this.manager.nodes.visible = this._visible ? null : this;
			});

			preventBubble(this._lockBtn, "mouseup", "mousedown");
			this._lockBtn.addEventListener("click", (evt) => {
				if (isLocked()) return;
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
			const unlocking = this._locked && !val;
			this._locked = val;
			this._lockBtn.classList.toggle(CLASSES.locked, val);
			if (unlocking) {
				this.manager.updateNetwork();
			}
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

		get links() {
			const ilinks = this._inputs.map(p => p.link),
				  olinks = this._outputs.map(p => p.links);
			return ilinks.concat(...olinks).filter(Boolean);
		}

		cook() {
			console.log("cooking:", this._element);
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
			});
		}
	};
})();

class NodeUI extends ToolUI {
	constructor(options) {
		super();
		const dict = new NodeDictionary(options);
		addGetter(this, "dictionary", dict);
	}
}

class NodeDictionary extends Dictionary {
    constructor(proto) {
        super(proto);
        addEvent(this, "onChange");
    }

    edit(name, cb) {
    	if (!this.has(name)) {
    		console.warn("NodeDictionary does not contain key:", name);
    	}
        const value = super.get(name);
        cb(value);
        this._onChange.trigger(name);
    }

    put(name, value) {
    	if (!this.has(name)) {
    		console.warn("NodeDictionary does not support appending new values.");
    	}
        super.put(name, value);
        this._onChange.trigger(name);
    }

    remove() {
    	console.warn("NodeDictionary does not support the remove function.");
    }
}

class EmptyNodeUI extends NodeUI {
	constructor() {
		super({});
	}

	_createUI() {
		return document.createElement("div");
	}
}
