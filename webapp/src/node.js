
import { isUdf, isObject, isFunction, isType, isArray } from "./type";
import { extend, createSVG, stopBubbling, AddToEventLoop } from "./utility";
import { MyEvent, addEvent } from "./event";
import { Dictionary } from "./dictionary";
import { Box, Vector2 } from "./geometry";
import { Command } from "./command";
import Container from "./container";

export { Node, NodeInput, MultiNodeInput, NodeOutput,
		 Link, NodeSettingsContainer, NodeSettings };

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

			this._input = null;
			this._output = null;
			this._selected = false;
			this._completed = false;

			this._createDOM();
			this._initPathUpdater();
		}

		_createDOM() {
			this._element.classList.add(CLASSES.root);
			stopBubbling(this._element, "mousedown");

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

		_initPathUpdater() {
			this._pathUpdater = new AddToEventLoop(() => {
				let i = this._inputPosition;
				let o = this._outputPosition;

				if (!i) {
					if (this._input instanceof MultiNodeInput) {
						i = this._input.getPosition(this);
					} else {
						i = this._input.center;
					}
				}
				if (!o) {
					o = this._output.center;
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
			});
		}

		get selected() {
			return this._selected;
		}

		set selected(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}

			this._element.classList.toggle(CLASSES.selected, val);
			this._selected = val;
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
				throw new Error("Invalid argument.");
			} else if (this._input) {
				throw new Error("Invalid state. this._input has a value.");
			}

			this._input = val;
			this._checkComplete();
		}

		get output () {
			return this._output;
		}

		set output (val) {
			if (!(val instanceof NodeOutput)) {
				throw new Error("Invalid argument.");
			} else if (this._output) {
				throw new Error("Invalid state. this._output has a value.");
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
			this._inputPosition = i;
			this._outputPosition = o;
			this._pathUpdater.invoke();
		}
	};
})();

const NodePoint = (function(){
	const cl_point = "point";

	return class extends Box {
		constructor(type) {
			const d = document.createElement("div");
			super(d);

			this.type = type;
			this.node = null;

			this._createDOM();
			this._setPointColor();
		}

		_createDOM() {
			this._element.classList.add(cl_point);
			stopBubbling(this._element, "mousedown");
		}

		_setPointColor() {
			if (this.type) {
				const c = this.type.pointColor;
				if (c) {
					this._element.style.backgroundColor = c;
				}
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

		if (val) {
			this._unlink = this._onChange.linkTo(val.output.onChange);
		} else {
			this._unlink = null;
		}

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

		get links() {
			return this._links.slice();
		}

		get value() {
			return this._links.map(l => l.output.value);
		}

		_createDOM() {
			this._element.classList.add(cl_point);
			stopBubbling(this._element, "mousedown");
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
			if (i === -1) {
				throw new Error("Could not find argument 'link' in this._links");
			}

			const unlink = this._unlinkFunctions[i];
			unlink();
			this._links.splice(i, 1);
			this._onChange.trigger();
		}

		getPosition(link) {
			const len = this._links.length;
			const i = this._links.findIndex(l => l === link);

			let p, total;
			if (i === -1) {
				p = len+1;
				total = len+2;
			} else {
				p = i+1;
				total = len+1;
			}
			const r = p / total;

			const x = this.left + (this.width * r);
			const y = this.center.y;

			return new Vector2(x, y);
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
		if (!(link instanceof Link)) {
			throw new Error("Invalid argument.");
		}

		this._links.push(link);
	}

	removeLink(link) {
		const i = this._links.findIndex(o => o === link);
		if (i === -1) {
			throw new Error("Could not find argument 'link' in this._links");
		}

		this._links.splice(i, 1);
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
		constructor(inputs, outputs, ui, settings, options) {
			if (!isArray(inputs) ||
				!inputs.every(p => p instanceof NodeInput ||
								   p instanceof MultiNodeInput)) {
				throw new Error("Invalid argument.");
			} else if (!isArray(outputs) ||
					   !outputs.every(p => p instanceof NodeOutput)) {
				throw new Error("Invalid argument.");
			} else if (!(ui instanceof NodeSettingsContainer)) {
				throw new Error("Invalid argument.");
			} else if (!(settings instanceof NodeSettings)) {
				throw new Error("Invalid argument.");
			}

			const d = document.createElement("div");
			super(d);

			this.inputs = inputs;
			this.outputs = outputs;
			this.ui = ui;
			this.settings = settings;
			this._options = extend(DEFAULTS, options);

			this._dirtyInput = true;
			this._dirtySettings = false;
			this._dirtySettingsName = null;
			this._dirtySettingsObject = null;
			this._selected = false;
			this._locked = false;
			this._visible = false;

			this._initSettings();
			this._createDOM();
			this._addListeners();
		}

		_initSettings() {
			this.ui.options = this.settings;

			const onCommand = (nodeSettings, name, meta) => {
				if (this.manager.nodes.active !== this) {
					this.manager.nodes.select(this);
				}

				if (meta.noupdate !== true) {
					this._dirtySettings = true;
					this._dirtySettingsName = name;
					this._dirtySettingsObject = nodeSettings;
					this.manager.updateNetwork();
				}
			};

			const executeCommand = (command, meta) => {
				if (meta.nostack !== true) {
					this.manager.stack.add(command);
				}
				command.execute();
			};

			this.settings.onTryPut = (nodeSettings, name, oldValue, newValue, meta) => {
				const cb = onCommand.bind(null, nodeSettings, name, meta);
				const put = nodeSettings.put.bind(nodeSettings);
				const command =
					new OptionCommand(
						put, name, oldValue, newValue, cb);

				executeCommand(command, meta);
			};

			this.settings.onTryPush = (nodeSettings, name, item, adding, meta) => {
				const cb = onCommand.bind(null, nodeSettings, name, meta);
				const push = nodeSettings.push.bind(nodeSettings);
				const command =
					new ArrayOptionCommand(
						push, name, item, adding, cb);

				executeCommand(command, meta);
			};
		}

		_createDOM() {
			this._element.classList.add(CLASSES.root);
			stopBubbling(this._element, "mousedown");

			const appendPoints = (points, parent) => {
				points.forEach((p) => {
					p.parent = parent;
					p.appendElement();
					p.node = this;
				});
			};

			const inputs = document.createElement("div");
			inputs.classList.add(CLASSES.points, CLASSES.inputs);
			const inputsBox = new Box(inputs, this);
			inputsBox.appendElement();
			appendPoints(this.inputs, inputsBox);

			const outputs = document.createElement("div");
			outputs.classList.add(CLASSES.points, CLASSES.outputs);
			const outputsBox = new Box(outputs, this);
			outputsBox.appendElement();
			appendPoints(this.outputs, outputsBox);

			const node = document.createElement("div");
			node.classList.add(CLASSES.node);
			this._element.appendChild(node);

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

			const iconHref = this._options.icon;
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

		_addListeners() {
			this.inputs.forEach((input) => {
				input.onChange.addListener(() => {
					this._dirtyInput = true;
				});
			});

			const locked = () => this.manager.lock.locked;

			stopBubbling(this._viewBtn, "mouseup", "mousedown");
			this._viewBtn.addEventListener("click", (evt) => {
				if (locked()) return;
				this.manager.nodes.visible = this._visible ? null : this;
			});

			stopBubbling(this._lockBtn, "mouseup", "mousedown");
			this._lockBtn.addEventListener("click", (evt) => {
				if (locked()) return;
				this.locked = !this._locked;
			});
		}

		get dirty() {
			return this._dirtyInput || this._dirtySettings;
		}

		get selected() {
			return this._selected;
		}

		set selected(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}

			this._element.classList.toggle(CLASSES.selected, val);
			this._selected = val;
		}

		get locked() {
			return this._locked;
		}

		set locked(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}

			this._lockBtn.classList.toggle(CLASSES.locked, val);
			if (this._locked && !val) {
				this.manager.updateNetwork();
			}
			this._locked = val;
		}

		get visible() {
			return this._visible;
		}

		set visible(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}

			this._viewBtn.classList.toggle(CLASSES.visible, val);
			this._visible = val;
		}

		get inputLinks() {
			return this.inputs.map(p =>
				p instanceof MultiNodeInput ? p.links : p.link)
			.reduce((acc, l) => {
				if (isArray(l)) {
					acc.push.apply(acc, l);
				} else {
					acc.push(l);
				}
				return acc;
			}, []).filter(Boolean);
		}

		get outputLinks() {
			let links = this.outputs.map(p => p.links);
			links = [].concat(...links);
			return links;
		}

		get links() {
			return this.inputLinks.concat(this.outputLinks);
		}

		get dependencies() {
			return this.inputLinks.map(l => l.output.node);
		}

		cook() {
			return new Promise((resolve) => {
				const inputs = this.inputs.map(i => i.value);

				const p = this._cook(inputs);

				if (isType(p, Promise)) {
					p.then(resolve);
				} else {
					resolve(p);
				}
			}).then((results) => {
				this.outputs.forEach((o, i) => {
					o.value = results[i];
				});
				this._dirtyInput = false;
				this._dirtySettings = false;
				this._dirtySettingsName = null;
				this._dirtySettingsObject = null;
			});
		}
	};
})();

class NodeSettingsContainer extends Container {
	constructor() {
		super();
		this._box.element.classList.add("node-settings");
	}

	get box() {
		return this._box;
	}

	_add(box) {
		if (!this._initialized) {
			this._createDOM();
			this._initialized = true;
		}
	}

	_createDOM() {}
}

const NodeSettings = (function(){
	function deepcopy(p) {
		if (isObject(p)) {
			if (p.constructor === Object) {
				return Object.keys(p).reduce((acc, k) => {
					acc[k] = deepcopy(p[k]);
					return acc;
				}, {});
			} else if (isFunction(p.deepcopy)) {
				return p.deepcopy();
			} else if (isFunction(p.copy)) {
				return p.copy();
			}
		}

		return p;
	}

	return class {
	    constructor(proto) {
	    	if (!isUdf(proto) && typeof proto !== "object") {
	            throw new Error("Invalid argument.");
	        }

	        if (proto) {
	        	proto = deepcopy(proto);
		        Object.values(proto).forEach((val) => {
		        	if (val.array === true) {
		        		val.value = [];
		        	}
		        });
	        }
	    	this._inner = Object.create(proto || null);

	        this._events = new Dictionary();
	        this._onTryPut = null;
	        this._onTryPush = null;
	    }

	    get onTryPut() {
	    	return this._onTryPut;
	    }

	    set onTryPut(val) {
	    	if (val !== null && !isFunction(val)) {
	    		throw new Error("Invalid argument.");
	    	}
			this._onTryPut = val;
	    }

	    get onTryPush() {
	    	return this._onTryPush;
	    }

	    set onTryPush(val) {
	    	if (val !== null && !isFunction(val)) {
	    		throw new Error("Invalid argument.");
	    	}
			this._onTryPush = val;
	    }

	    _updateEvent(name, ...args) {
	        if (this._events.has(name)) {
	            this._events.get(name).trigger(...args);
	        }
	    }

	    linkTo(other) {
	    	if (!(other instanceof NodeSettings)) {
	    		throw new Error("Invalid argument.");
	    	}
	    	this._onTryPut = other.onTryPut;
	    	this._onTryPush = other.onTryPush;
	    }

	    has(name) {
	    	return name in this._inner;
	    }

	    get(name) {
	    	if (!this.has(name)) {
	    		throw new Error("Invalid key: '" + name + "'");
	    	}
	    	return this._inner[name].value;
	    }

	    tryPut(name, newValue) {
	    	if (!this.has(name)) {
	    		throw new Error("NodeSettings does not contain key: '" + name + "'");
	    	}

			const p = this._inner[name];
			if (p.array === true) {
	    		throw new Error("Cannot call function on key: '" + name + "'");
	    	}

	    	if (this._onTryPut) {
	    		this._onTryPut(this, name, p.value, newValue, p);
	    	} else {
	    		this.put(name, newValue);
	    	}
	    }

	    put(name, value, fromTryPut=false) {
			if (!this.has(name)) {
	    		throw new Error("NodeSettings does not contain key: '" + name + "'");
	    	} else if (typeof fromTryPut !== "boolean") {
	    		throw new Error("Invalid argument.");
	    	}

	    	const p = this._inner[name];
	    	if (p.array === true) {
	    		throw new Error("Cannot call function on key: '" + name + "'");
	    	}

	    	p.value = value;
			this._updateEvent(name, value, fromTryPut);
		}

		tryPush(name, item, adding=true) {
	    	if (!this.has(name)) {
	    		throw new Error("NodeSettings does not contain key: '" + name + "'");
	    	} else if (typeof adding !== "boolean") {
	    		throw new Error("Invalid argument.");
	    	}

			const p = this._inner[name];
			if (p.array !== true) {
	    		throw new Error("Cannot call function on key: '" + name + "'");
	    	}

	    	if (this._onTryPush) {
	    		this._onTryPush(this, name, item, adding, p);
	    	} else {
	    		this.push(name, item, adding);
	    	}
	    }

	    push(name, item, adding=true, fromTryPut=false) {
			if (!this.has(name)) {
	    		throw new Error("NodeSettings does not contain key: '" + name + "'");
	    	} else if (typeof adding !== "boolean") {
	    		throw new Error("Invalid argument.");
	    	} else if (typeof fromTryPut !== "boolean") {
	    		throw new Error("Invalid argument.");
	    	}

	    	const p = this._inner[name];
	    	if (p.array !== true) {
	    		throw new Error("Cannot call function on key: '" + name + "'");
	    	}

	    	const arr = p.value;
	    	if (adding) {
	    		arr.push(item);
	    	} else {
	    		const i = arr.indexOf(item);
	    		if (i === -1) {
	    			throw new Error("Could not find item in key: '" + name + "'");
	    		}
	    		arr.splice(i, 1);
	    	}

			this._updateEvent(name, item, adding, fromTryPut);
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
	};
})();

class OptionCommand extends Command {
	constructor(putFunction, name, oldValue, newValue, onChange) {
		super(Command.IMMEDIATE);

		this._put = putFunction;
		this._name = name;
		this._oldValue = oldValue;
		this._newValue = newValue;
		this._onChange = onChange;
	}

	_do(firstTime) {
		this._put(this._name, this._newValue, firstTime);
		this._onChange();
	}

	_execute() {
		this._do(true);
	}

	_undo() {
		this._put(this._name, this._oldValue);
		this._onChange();
	}

	_redo() {
		this._do(false);
	}
}

class ArrayOptionCommand extends Command {
	constructor(pushFunction, name, item, adding, onChange) {
		super(Command.IMMEDIATE);

		this._push = pushFunction;
		this._name = name;
		this._item = item;
		this._adding = adding;
		this._onChange = onChange;
	}

	_do(add, firstTime) {
		add = add === this._adding;
		this._push(this._name, this._item, add, firstTime);
		this._onChange();
	}

	_execute() {
		this._do(true, true);
	}

	_undo() {
		this._do(false, false);
	}

	_redo() {
		this._do(true, false);
	}
}
