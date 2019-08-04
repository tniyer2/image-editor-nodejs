
import { isUdf, isFunction } from "./type";
import { createSVG, stopBubbling } from "./utility";
import { addOptions } from "./options";
import { Dictionary } from "./dictionary";
import ToolUI from "./toolUI";
import { MyEvent, addEvent } from "./event";
import { Command } from "./command";
import { Box, Vector2 } from "./geometry";

export { Node, NodeInput, MultiNodeInput, NodeOutput, Link, NodeUI, EmptyNodeUI };

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
			super(d);
			this._createDOM();

			this._input = null;
			this._output = null;
			this._selected = false;
			this._completed = false;
		}

		_createDOM() {
			const d = this._element;
			d.classList.add(CLASSES.root);
			stopBubbling(d, "mousedown");

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
			if (!(val instanceof NodeInput || 
				  val instanceof MultiNodeInput)) {
				console.warn("Invalid value for input:", val);
				return;
			} else if (this._input) {
				console.warn("Cannot change value of input.");
				return;
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
				return;
			} else if (this._output) {
				console.warn("Cannot change value of output.");
				return;
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
				const input = this._input;
				if (input instanceof MultiNodeInput) {
					const links = input.links;
					const l = links.length;
					const j = links.findIndex(lk => lk === this);

					let place, total;
					if (j === -1) {
						place = l+1;
						total = l+2;
					} else {
						place = j+1;
						total = l+1;
					}
					const r = place / total;

					const x = input.left + (input.width * r);
					const y = input.centerY;
					i = new Vector2(x, y);
				} else {
					i = input.center;
				}
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
		constructor(type) {
			const d = document.createElement("div");
			super(d);
			this._createDOM();

			this.type = type;
			this._setPointColor();

			this.node = null;
		}

		_createDOM() {
			const d = this._element;
			d.classList.add(cl_point);
			stopBubbling(d, "mousedown");
		}

		_setPointColor(color) {
			if (this.type && this.type.pointColor) {
				this._element.style.backgroundColor = this.type.pointColor;
			}
		}
	};
})();

class NodeInput extends NodePoint {
	constructor(type) {
		super(type);
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
		this._unlink = val ? this._onChange.linkTo(val.output.onChange) : null;

		this._link = val;
		this._onChange.trigger();
	}

	get value() {
		return this._link ? this._link.output.value : null;
	}
}

const MultiNodeInput = (function(){
	const cl_point = "multi-point";

	return class extends NodePoint {
		constructor(type) {
			super(type);
			this._links = [];
			this._unlinkFunctions = [];
			addEvent(this, "onChange");
		}

		_createDOM() {
			const d = this._element;
			d.classList.add(cl_point);
			stopBubbling(d, "mousedown");
		}

		get links() {
			return this._links.slice();
		}

		get value() {
			return this._links.map(l => l.output.value);
		}

		addLink(link) {
			const unlink = this._onChange.linkTo(link.output.onChange);
			if (isUdf(link.p_index)) {
				link.p_index = this._links.length;
				this._links.push(link);
			} else {
				this._links.splice(link.p_index, 0, link);
			}
			this._unlinkFunctions.push(unlink);
			this._onChange.trigger();
		}

		removeLink(link) {
			const i = this._links.findIndex(l => l === link);
			if (i !== -1) {
				const unlink = this._unlinkFunctions[i];
				unlink();
				this._links.splice(i, 1);
				this._onChange.trigger();
			} else {
				console.warn("Could not find link from this._links:", link);
			}
		}
	};
})();

class NodeOutput extends NodePoint {
	constructor(type) {
		super(type);
		this._value = null;
		this._links = [];
		addEvent(this, "onChange");
	}

	get value() {
		return this._value ? this._value.copy() : null;
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
		const i = this._links.findIndex(o => o === link);
		const found = i !== -1;
		if (found) {
			this._links.splice(i, 1);
		} else {
			console.warn("Could not remove link from this._links:", link);
		}
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
			super(d);

			this.inputs = inputs;
			this.outputs = outputs;

			this._setUIOption = ui.dictionary
			.onValue((name, oldValue, newValue) => {
				const c = new SetOptionCommand(
					this._setUIOption, name, oldValue, newValue, () => {
						this.dirty = true;
						this.manager.updateNetwork();
					});
				this.manager.stack.add(c);
				c.execute();
			});
			this.ui = ui;

			addOptions(this, DEFAULTS, options);

			this.dirty = true;
			this.inputs.forEach((input) => {
				input.onChange.addListener(() => {
					this.dirty = true;
				});
			});

			this._selected = false;
			this._locked = false;
			this._visible = false;

			this._createDOM();
			this._attachEvents();
		}

		_appendPoints(points, parent) {
			points.forEach((p) => {
				parent.element.appendChild(p.element);
				p.parent = parent;
				p.node = this;
			});
		}

		_createDOM() {
			const d = this._element;
			d.classList.add(CLASSES.root);
			stopBubbling(d, "mousedown");

			const inputs = document.createElement("div");
			inputs.classList.add(CLASSES.points, CLASSES.inputs);
			this._inputsBox = new Box(inputs, this);
			this._appendPoints(this.inputs, this._inputsBox);
			d.appendChild(inputs);

			const outputs = document.createElement("div");
			outputs.classList.add(CLASSES.points, CLASSES.outputs);
			this._outputsBox = new Box(outputs, this);
			this._appendPoints(this.outputs, this._outputsBox);
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

			const iconHref = this.options.get("icon");
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

			stopBubbling(this._viewBtn, "mouseup", "mousedown");
			this._viewBtn.addEventListener("click", (evt) => {
				if (isLocked()) return;
				this.manager.nodes.visible = this._visible ? null : this;
			});

			stopBubbling(this._lockBtn, "mouseup", "mousedown");
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

		get inputLinks() {
			const links = this.inputs.map((p) => {
				if (p instanceof MultiNodeInput) {
					return p.links;
				} else {
					return p.link;
				}
			});
			let f = [];
			links.forEach((l) => {
				if (Array.isArray(l)) {
					f.push.apply(f, l);
				} else {
					f.push(l);
				}
			});
			f = f.filter(Boolean);
			return f;
		}

		get outputLinks() {
			let links = this.outputs.map(p => p.links);
			links = [].concat(...links);
			return links;
		}

		get dependencies() {
			return this.inputLinks.map(l => l.output.node);
		}

		get links() {
			return this.inputLinks.concat(this.outputLinks);
		}

		cook() {
			console.log("cooking:", this._element);
			return new Promise((resolve) => {
				const inputs = this.inputs.map(i => i.value);
				const p = this._cook(...inputs);
				if (p instanceof Promise) {
					p.then(resolve);
				} else {
					resolve(p);
				}
			}).then((results) => {
				this.outputs.forEach((o, i) => {
					o.value = results[i];
				});
				this.dirty = false;
			});
		}
	};
})();

class NodeUI extends ToolUI {
	constructor(options) {
		super();
		this.dictionary = new NodeUIOptions(options);
	}
}

class NodeUIOptions extends Dictionary {
    constructor(proto) {
        super(proto);
        this._onValue = null;
        this._events = new Dictionary();
    }

    _updateEvent(name, value) {
        if (this._events.has(name)) {
            this._events.get(name).trigger(value);
        }
    }

    onValue(cb) {
    	if (isFunction(cb)) {
    		this._onValue = cb;
    		return (name, value) => {
    			if (!this.has(name)) {
		    		console.warn("NodeUIOptions does not contain key:", name);
		    		return;
		    	}
    			super.put(name, value);
    			this._updateEvent(name, value);
    		};
    	} else {
    		console.warn("Invalid value for argument 'cb':", cb);
    	}
    }

    put(name, newValue) {
    	if (!this.has(name)) {
    		console.warn("NodeUIOptions does not contain key:", name);
    		return;
    	} else if (!this._onValue) {
    		return;
    	}

    	const oldValue = this.get(name);
        this._onValue(name, oldValue, newValue);
    }

    remove() {
    	console.warn("NodeUIOptions does not support the remove function.");
    }

    addListener(name, listener) {
        let event;
        if (this._events.has(name)) {
            event = this._events.get(name);
        } else {
            event = new MyEvent();
            this._events.put(name, event);
        }
        event.interface.addListener(listener);
    }

    removeListener(name, listener) {
        if (this._events.has(name)) {
            this._events.get(name).interface.removeListener(listener);
        }
    }
}

class SetOptionCommand extends Command {
	constructor(sf, name, o, n, cb) {
		super(Command.IMMEDIATE);

		this._setFunction = sf;
		this._name = name;
		this._oldValue = o;
		this._newValue = n;
		this._onChange = cb;
	}

	_execute() {
		this._setFunction(this._name, this._newValue);
		this._onChange();
	}

	_undo() {
		this._setFunction(this._name, this._oldValue);
		this._onChange();
	}

	_redo() {
		this._execute();
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
