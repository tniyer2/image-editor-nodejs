
import { isNumber, isObject,
		 isFunction, isArray } from "./type";
import { extend, show, hide, isDescendant,
		 setBooleanAttribute, stopBubbling,
		 createSVG, toPrecision } from "./utility";
import { addEvent } from "./event";
import { Listener } from "./listener";
import { MouseAction, UserActionHandler } from "./action";
import Options from "./options";

export { Toggle, Slider, FileInput,
		 FloatingList, UnorderedList, StringInput,
		 NumericalInput, Dropdown, MessageBox };

const Toggle = (function(){
	const CLASSES = {
		root: "toggle", 
		text: "toggle__text", 
		slider: "toggle__slider",
		checked: "checked"
	};
	const DEFAULTS = { text: "" };

	return class {
		constructor(iv, options) {
			this._initialValue = iv;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			addEvent(this, "onChange");

			this._createDOM();
			this._addListeners();
		}

		get value() {
			return this._input.checked;
		}

		set value(val) {
			setBooleanAttribute(this._input, "checked", val);
			this._slider.classList.toggle(CLASSES.checked, val);
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
			this._slider = slider;

			d.appendChild(label);
		}

		_addListeners() {
			this._input.addEventListener("change", (evt) => {
				const val = this.value;
				this._slider.classList.toggle(CLASSES.checked, val);
				this._onChange.trigger(val);
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

const UnorderedList = (function(){
	const CLASSES = {
		root: "list-input",
		item: "item",
		itemSpace: "item-space",
		removeBtnParent: "remove-btn-parent",
		removeBtn: "remove-btn",
		addBtnParent: "add-btn-parent",
		addBtn: "add-btn"
	};

	const ADD_ICON = "#icon-plus",
		  REMOVE_ICON = "#icon-minus";

	const DEFAULTS = {
		userAdd: false
	};

	return class {
		constructor(options) {
			this._options = extend(DEFAULTS, options);

			this._items = [];
			this._onRequestAdd = null;
			this._onRequestRemove = null;

			this._createDOM();
			this._addListeners();
		}

		get items() {
			return this._items.slice();
		}

		onRequestAdd(val) {
			if (val !== null && !isFunction(val)) {
				throw new Error("Invalid argument.");
			}
			this._onRequestAdd = val;
		}

		onRequestRemove(val) {
			if (val !== null && !isFunction(val)) {
				throw new Error("Invalid argument.");
			}
			this._onRequestRemove = val;
		}

		add(element, data) {
			if (!(element instanceof HTMLElement)) {
				throw new Error("Invalid argument.");
			}
			this._createItem({ element: element, data: data });
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

		_createDOM() {
			this.root = document.createElement("ul");
			this.root.classList.add(CLASSES.root);

			if (this._options.userAdd === true) {			
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
		}

		_addListeners() {
			if (this._addBtn) {				
				this._addBtn.addEventListener("click", () => {
					if (this._onRequestAdd) {
						this._onRequestAdd();
					}
				});
			}
		}

		_createItem(info) {
			const item = document.createElement("li");
			item.classList.add(CLASSES.item);
			if (this._addBtnParent) {
				this.root.insertBefore(item, this._addBtnParent);
			} else {
				this.root.appendChild(item);
			}
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
				if (this._onRequestRemove) {
					this._onRequestRemove(info.element, info.data);
				}
			};
			btn.addEventListener("click", listener);
			info.removeListeners = () => {
				btn.removeEventListener("click", listener);
			};

			this._items.push(info);
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
		placeholder: null
	};

	return class {
		constructor(options) {
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			addEvent(this, "onChange");

			this._initValue(); // override this
			this._createDOM();
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
			input.value = this._value;
			const placeholder = this.options.get("placeholder");
			if (placeholder) {
				input.placeholder = placeholder;
			}
			this.root.appendChild(input);
			this._input = input;
		}
	};
})();

const StringInput = (function(){
	const DEFAULTS = {
		value: ""
	};

	const cl_root = "string";

	return class extends TextInput {
		constructor(options) {
			options = extend(DEFAULTS, options);
			super(options);

			this.root.classList.add(cl_root);
			this._addListeners();
		}

		get value() {
			return this._value;
		}

		set value(val) {
			if (typeof val !== "string") {
				throw new Error("Invalid argument.");
			}

			this._value = val;
			this._input.value = val;
		}

		_initValue() {
			this._value = String(this.options.get("value"));
		}

		_addListeners() {
			this._input.addEventListener("change", (evt) => {
				this._value = evt.target.value;
				this._onChange.trigger(this._value);
			});
		}
	};
})();

const NumericalInput = (function(){
	const DEFAULTS = {
		value: 0,
		draggable: true,
		bounds: null,
		speed: 2,
		snap: 20,
		precision: 5
	};

	const cl_root = "numerical";

	class NumberInputDragWidget extends UserActionHandler {
		constructor(textInput, options) {
			super();

			if (!(textInput instanceof TextInput)) {
				throw new Error("Invalid argument.");
			}

			this._textInput = textInput;
			this._options = options;
		}

		_onStart(evt) {
			this._initialPosition = this._getMousePosition(evt);
			this._initialValue = this._textInput.value;
		}

		_onMove(evt) {
			const newPosition = this._getMousePosition(evt);
			const diff = newPosition.subtract(this._initialPosition);

			let d = diff.x;
			if (evt.ctrlKey) {
				d -= (d % this._options.get("snap"));
			}
			d *= this._options.get("speed");

			const val = this._initialValue + d;
			if (this._textInput.value !== val) {
				this._textInput.value = val;
			}
		}

		_onEnd(evt) {
			this._textInput.valueTriggerEvent = this._textInput.value;
		}
	}

	return class extends TextInput {
		constructor(options) {
			options = extend(DEFAULTS, options);
			super(options);

			this.root.classList.add(cl_root);
			this._addListeners();

			if (this.options.get("draggable") === true) {
				this._initWidget(this.options.get("bounds"));
			}
		}

		get value() {
			return this._value;
		}

		set value(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}

			const p = this.options.get("precision");
			val = p === 0 ? Math.trunc(val) : toPrecision(val, p);

			this._value = val;
			this._input.value = val;
		}

		set valueTriggerEvent(val) {
			this.value = val;
			this._onChange.trigger(val);
		}

		_initValue() {
			this._value = Number(this.options.get("value")) || 0;
		}

		_addListeners() {
			this._input.addEventListener("change", (evt) => {
				const val = Number(evt.target.value);

				if (isNumber(val)) {
					this._value = val;
					this._onChange.trigger(val);
				} else {
					this._value = 0;
					evt.target.value = "0";
				}
			});
		}

		_initWidget(bounds) {
			stopBubbling(this._input, "mousedown");

			const action1 =
				new MouseAction(this._input, bounds,
					{ condition: (evt) => evt.button === 1 });

			const action2 =
				new MouseAction(this.root, bounds,
					{ condition: (evt) => evt.button === 0 ||
										  evt.button === 1 });

			const widget =
				new NumberInputDragWidget(this, this.options);
			widget.handle(action1);
			widget.handle(action2);
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

const MessageBox = (function(){
	const CLASSES = {
		root: "message-box",
		error: "error",
		text: "text"
	};

	const ERROR_ICON = "#icon-error";

	return class {
		constructor() {
			this._createDOM();
		}

		get value() {
			return this._text.textContent;
		}

		setMessage(val) {
			this._text.textContent = val;
			hide(this._errorSVG);
			this.root.classList.remove(CLASSES.error);
		}

		setError(val) {
			this._text.textContent = val;
			show(this._errorSVG);
			this.root.classList.add(CLASSES.error);
		}

		clear() {
			this._text.textContent = null;
			hide(this._errorSVG);
			this.root.classList.remove(CLASSES.error);
		}

		_createDOM() {
			this.root = document.createElement("div");
			this.root.classList.add(CLASSES.root);

			const svg = createSVG(ERROR_ICON);
			hide(svg);
			this.root.appendChild(svg);
			this._errorSVG = svg;

			const text = document.createElement("span");
			text.classList.add(CLASSES.text);
			this.root.appendChild(text);
			this._text = text;
		}
	};
})();
