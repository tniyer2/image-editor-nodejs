
import { isArray } from "./type";
import { show, hide, setBooleanAttribute, isDescendant } from "./utility";
import { addEvent } from "./event";
import { Listener } from "./listener";
import Options from "./options";

export { Toggle, Slider, FileInput, FloatingList };

const Toggle = (function(){
	const CLASSES =
	{ root: "toggle", 
	  text: "toggle__text", 
	  slider: "toggle__slider" };
	const DEFAULTS = { text: "" };

	return class {
		constructor(iv, options) {
			this._initialValue = iv;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._createDOM();
			addEvent(this, "onToggle");
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
			text.innerText = this.options.get("text");
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
	const CLASSES =
	{ root: "slider",
	  text: "slider__text" };

	const DEFAULTS =
	{ text: "",
	  reverse: false,
	  step: null };

	return class {
		constructor(val, min, max, options) {
			this._initialValue = val;
			this._min = min;
			this._max = max;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._createDOM();
			addEvent(this, "onChange");
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
			span.innerText = this.options.get("text");
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
	const CLASSES =
	{ root: "file-input",
	  text: "text" };

	const DEFAULTS =
	{ text: "",
	  accept: "",
	  multiple: false,
	  clear: true };

	return class {
		constructor(options) {
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this.value  = null;

			this._createDOM();
			addEvent(this, "onChange");
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
			span.innerText = this.options.get("text");
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
				li.innerText = val;
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
