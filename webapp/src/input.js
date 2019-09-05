
import { isNumber, isObject, isFunction, isArray } from "./type";
import { show, hide, setBooleanAttribute, isDescendant, createSVG }
	from "./utility";
import { addEvent } from "./event";
import { Listener } from "./listener";
import Options from "./options";

export { Toggle, Slider, FileInput,
		 FloatingList, DynamicList, TextInput, Dropdown };

const Toggle = (function(){
	const CLASSES = {
		root: "toggle", 
		text: "toggle__text", 
		slider: "toggle__slider"
	};
	const DEFAULTS = { text: "" };

	return class {
		constructor(iv, options) {
			this._initialValue = iv;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			addEvent(this, "onToggle");

			this._createDOM();
			this._addListeners();
		}

		get toggled() {
			return this._input.checked;
		}

		set toggled(b) {
			setBooleanAttribute(this._input, "checked", b);
		}

		_createDOM() {
			const d = document.createElement("div");
			d.classList.add(CLASSES.root);
			this.root = d;

			const text = document.createElement("span");
			text.classList.add(CLASSES.text);
			text.textContent = this.options.get("text");
			d.appendChild(text);

			const label = document.createElement("label");

			const input = document.createElement("input");
			input.type = "checkbox";
			setBooleanAttribute(input, "checked", this._initialValue);
			label.appendChild(input);
			this._input = input;

			const slider = document.createElement("span");
			slider.classList.add(CLASSES.slider);
			label.appendChild(slider);

			d.appendChild(label);
		}

		_addListeners() {
			this._input.addEventListener("change", (evt) => {
				this._onToggle.trigger(evt.target.checked);
			});
		}
	};
})();

const Slider = (function(){
	const CLASSES = {
		root: "slider",
		text: "slider__text"
	};

	const DEFAULTS = {
		text: "",
		reverse: false,
		step: null
	};

	return class {
		constructor(val, min, max, options) {
			this._initialValue = val;
			this._min = min;
			this._max = max;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			addEvent(this, "onChange");

			this._createDOM();
			this._addListeners();
		}

		get value() {
			return this._input.value;
		}

		set value(v) {
			this._input.value = v;
		}

		_createDOM() {
			const d = document.createElement("div");
			d.classList.add(CLASSES.root);
			this.root = d;

			const span = document.createElement("span");
			const text = this.options.get("text");
			if (text) {
				span.textContent = text;
			}
			span.classList.add(CLASSES.text);
			d.appendChild(span);

			const input = document.createElement("input");
			input.style.direction = this.options.get("reverse") ? "rtl" : "ltr";
			input.type = "range";
			input.min = this._min;
			input.max = this._max;
			const step = this.options.get("step");
			if (step) {
				input.step = step;
			}
			input.value = this._initialValue;
			d.appendChild(input);
			this._input = input;
		}

		_addListeners() {
			this._input.addEventListener("change", (evt) => {
				const v = Number(evt.target.value);
				this._onChange.trigger(v);
			});
		}
	};
})();

const FileInput = (function(){
	const CLASSES = {
		root: "file-input",
		text: "text"
	};

	const DEFAULTS = {
		text: "",
		accept: "",
		multiple: false,
		clear: true
	};

	return class {
		constructor(options) {
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this.value  = null;

			addEvent(this, "onChange");

			this._createDOM();
			this._addListeners();
		}

		_createDOM() {
			const d = document.createElement("label");
			d.classList.add(CLASSES.root);
			this.root = d;

			const input = document.createElement("input");
			input.type = "file";
			input.accept = this.options.get("accept");
			if (this.options.get("multiple")) {
				input.setAttribute("multiple", "multiple");
			}
			d.appendChild(input);
			this._input = input;

			const span = document.createElement("span");
			const text = this.options.get("text");
			if (text) {
				span.textContent = text;
			}
			span.classList.add(CLASSES.text);
			d.appendChild(span);
		}

		_addListeners() {
			this._input.addEventListener("change", (evt) => {
				if (this.options.get("multiple")) {
					this.value = evt.target.files;
				} else {
					this.value = evt.target.files[0];
				}
				this._onChange.trigger(this.value);

				if (this.options.get("clear")) {
					evt.target.value = null;
				}
			});
		}
	};
})();

const FloatingList = (function(){
	const cl_root = "floating-list";

	return class {
		constructor(values) {
			this._values = null;
			this._datas = null;
			this._listElements = null;
			this._listListeners = null;
			this._open = false;
			this._dirty = true;

			addEvent(this, "onSelect");

			this._createDOM();
			this._initListeners();
		}

		_createDOM() {
			const d = document.createElement("div");
			d.classList.add(cl_root);
			hide(d);
			this.root = d;

			const ul = document.createElement("ul");
			d.appendChild(ul);
			this._list = ul;
		}

		_initListeners() {
			this._clickOutListener = new Listener(
			document, "mousedown", (evt) => {
				const t = evt.target;
				if (t !== this.root && !isDescendant(this.root, t)) {
					this.hide();
				}
			}, { eventOptions: true });
		}

		_updateList() {
			this._clearList();
			this._fillList();
			this._dirty = false;
		}

		_clearList() {
			if (!this._listElements) return;

			this._listElements.forEach((li, i) => {
				const l = this._listListeners[i];
				li.removeEventListener("click", l);
				this._list.removeChild(li);
			});

			this._listElements = null;
			this._listListeners = null;
		}

		_fillList() {
			this._listElements = [];
			this._listListeners = [];

			this._values.forEach((val, i) => {
				const li = document.createElement("li");
				li.textContent = val;
				this._list.appendChild(li);
				this._listElements.push(li);

				const listener = () => {
					if (this._datas) {
						this._onSelect.trigger(val, this._datas[i]);
					} else {
						this._onSelect.trigger(val);
					}
					this.hide();
				};
				li.addEventListener("click", listener);
				this._listListeners.push(listener);
			});
		}

		update(values, datas=null) {
			if (!isArray(values) || !values.every(v => typeof v === "string")) {
				throw new Error("Invalid argument.");
			} else if (datas !== null && !isArray(datas)) {
				throw new Error("Invalid argument.");
			}

			this._values = values;
			this._datas = datas;
			if (this._open) {
				this._updateList();
			} else {
				this._dirty = true;
			}
		}

		show() {
			if (this._open) {
				return;
			} else {
				this._open = true;
			}

			if (this._dirty) {
				this._updateList();
			}

			show(this.root);
			setTimeout(() => {
				this._clickOutListener.attach();
			});
		}

		hide() {
			if (!this._open) {
				return;
			} else {
				this._open = false;
			}

			this._clickOutListener.remove();
			hide(this.root);
		}
	};
})();

const DynamicList = (function(){
	const CLASSES = {
		root: "dynamic-list",
		item: "item",
		itemSpace: "item-space",
		removeBtnParent: "remove-btn-parent",
		removeBtn: "remove-btn",
		addBtnParent: "add-btn-parent",
		addBtn: "add-btn"
	};

	const ADD_ICON = "#icon-plus",
		  REMOVE_ICON = "#icon-minus";

	return class {
		constructor() {
			this._items = [];
			this._onAdd = null;
			this._onRemove = null;

			this._createDOM();
			this._addListeners();
		}

		get length() {
			return this._items.length;
		}

		set onAdd(val) {
			if (val !== null && !isFunction(val)) {
				throw new Error("Invalid argument.");
			}
			this._onAdd = val;
		}

		set onRemove(val) {
			if (val !== null && !isFunction(val)) {
				throw new Error("Invalid argument.");
			}
			this._onRemove = val;
		}

		_createDOM() {
			this.root = document.createElement("ul");
			this.root.classList.add(CLASSES.root);

			const p = document.createElement("li");
			p.classList.add(CLASSES.addBtnParent);
			this.root.appendChild(p);
			this._addBtnParent = p;

			const btn = document.createElement("button");
			btn.type = "button";
			btn.classList.add(CLASSES.addBtn);
			p.appendChild(btn);
			this._addBtn = btn;

			const svg = createSVG(ADD_ICON);
			btn.appendChild(svg);
		}

		_addListeners() {
			this._addBtn.addEventListener("click", () => {
				if (this._onAdd) {
					this._onAdd();
				}
			});
		}

		_createItem(info) {
			const item = document.createElement("li");
			item.classList.add(CLASSES.item);
			this.root.insertBefore(item, this._addBtnParent);
			info.item = item;

			const itemSpace = document.createElement("div");
			itemSpace.classList.add(CLASSES.itemSpace);
			itemSpace.appendChild(info.element);
			item.appendChild(itemSpace);

			const p = document.createElement("div");
			p.classList.add(CLASSES.removeBtnParent);
			item.appendChild(p);

			const btn = document.createElement("button");
			btn.type = "button";
			btn.classList.add(CLASSES.removeBtn);
			p.appendChild(btn);

			const svg = createSVG(REMOVE_ICON);
			btn.appendChild(svg);

			const listener = () => {
				if (this._onRemove) {
					this._onRemove(info.element, info.data);
				}
			};
			btn.addEventListener("click", listener);
			info.removeListeners = () => {
				btn.removeEventListener("click", listener);
			};

			this._items.push(info);
		}

		add(info) {
			if (!isObject(info)) {
				throw new Error("Invalid argument.");
			} else if (!(info.element instanceof HTMLElement)) {
				throw new Error("Invalid argument.");
			}

			const copy = Object.assign({}, info);
			this._createItem(copy);
		}

		remove(element) {
			const i = this._items.findIndex(o => o.element === element);
			if (i === -1) {
				throw new Error("Could not find argument 'element'");
			}

			const info = this._items[i];
			info.removeListeners();
			info.element.remove();
			info.item.remove();

			this._items.splice(i, 1);
		}
	};
})();

const TextInput = (function(){
	const CLASSES = {
		root: "text-input",
		inverse: "inverse",
		text: "text"
	};

	const DEFAULTS = {
		text: null,
		textRight: false,
		placeholder: null,
		value: null,
		numerical: false
	};

	return class {
		constructor(options) {
			this.options = new Options();
			this.options.set(DEFAULTS, options);
			this._numerical = this.options.get("numerical") === true;

			addEvent(this, "onChange");

			this._createDOM();
			this._addListeners();
		}

		get value() {
			const val = this._input.value;

			if (this._numerical) {
				return Number(val);
			} else {
				return val;
			}
		}

		set value(val) {
			if (this._numerical) {
				if (!isNumber(val)) {
					throw new Error("Invalid argument.");
				}
			} else {
				if (typeof val !== "string") {
					throw new Error("Invalid argument.");
				}
			}

			this._input.value = val;
		}

		_createDOM() {
			this.root = document.createElement("div");
			this.root.classList.add(CLASSES.root);
			if (this.options.get("textRight")) {
				this.root.classList.add(CLASSES.inverse);
			}

			const span = document.createElement("span");
			const text = this.options.get("text");
			if (text) {
				span.textContent = text;
			}
			span.classList.add(CLASSES.text);
			this.root.appendChild(span);

			const input = document.createElement("input");
			input.type = "text";
			const placeholder = this.options.get("placeholder");
			if (placeholder) {
				input.placeholder = placeholder;
			}
			this.root.appendChild(input);
			this._input = input;
			const val = this.options.get("value");
			if (val !== null) {
				this.value = val;
			}
		}

		_addListeners() {
			if (this._numerical) {
				this._input.addEventListener("change", (evt) => {
					const val = Number(evt.target.value);
					if (isNumber(val)) {
						this._onChange.trigger(val);
					} else {
						evt.target.value = Number(this.options.get("value")) || 0;
					}
				});
			} else {
				this._input.addEventListener("change", (evt) => {
					this._onChange.trigger(evt.target.value);
				});
			}
		}
	};
})();

const Dropdown = (function(){
	const CLASSES = {
		root: "dropdown",
		inverse: "inverse",
		text: "text"
	};

	const DEFAULTS = {
		text: null,
		textRight: false,
		selectedIndex: null
	};

	return class {
		constructor(values, options) {
			if (!isArray(values) ||
					!values.every(v => 
						isObject(v) || typeof v === "string")) {
				throw new Error("Invalid argument.");
			}

			this._values = values;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			addEvent(this, "onSelect");

			this._createDOM();
			this._addListeners();
		}

		get value() {
			const i = this._selectElement.selectedIndex;
			if (i === -1) {
				return null;
			} else {
				return this._selectElement.options[i].value;
			}
		}

		set value(val) {
			if (Number.isInteger(val) && val >= -1) {
				this._selectElement.selectedIndex = val;
			} else if (typeof val === "string") {
				this._selectElement.selectedIndex =
					Array.from(this._selectElement.options)
						.findIndex(elm => elm.textContent === val);
			} else {
				throw new Error("Invalid argument.");
			}
		}

		_createDOM() {
			this.root = document.createElement("div");
			this.root.classList.add(CLASSES.root);
			if (this.options.get("textRight") === true) {
				this.root.classList.add(CLASSES.inverse);
			}

			const span = document.createElement("span");
			const text = this.options.get("text");
			if (text) {
				span.textContent = text;
			}
			span.classList.add(CLASSES.text);
			this.root.appendChild(span);

			const select = document.createElement("select");
			this.root.appendChild(select);
			this._selectElement = select;

			this._values.forEach((val) => {
				const option = document.createElement("option");
				if (isObject(val)) {
					option.textContent = val.text;
					option.value = val.value;
				} else {
					option.textContent = val;
					option.value = val;
				}
				select.appendChild(option);
			});

			const index = this.options.get("selectedIndex");
			if (Number.isInteger(index)) {
				select.selectedIndex = index;
			}
		}

		_addListeners() {
			this._selectElement.addEventListener("change", () => {
				this._onSelect.trigger(this.value);
			});
		}
	};
})();
