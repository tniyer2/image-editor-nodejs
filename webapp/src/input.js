
import { show, hide, setBooleanAttribute } from "./utility";
import { addEvent } from "./event";
import { addOptions } from "./options";

export { Toggle, Slider, FileInput, AutoComplete };

const Toggle = (function(){
	const CLASSES =
	{ root: "toggle", 
	  text: "toggle__text", 
	  slider: "toggle__slider" };
	const DEFAULTS = { text: "" };

	return class {
		constructor(iv, options) {
			this._initialValue = iv;
			addOptions(this, DEFAULTS, options);

			this._createDOM();
			addEvent(this, "onToggle");
			this._attachListeners();
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

		_attachListeners() {
			this._input.addEventListener("change", (evt) => {
				this._onToggle.trigger(evt.target.checked);
			});
		}

		get toggled() {
			return this._input.checked;
		}

		set toggled(b) {
			setBooleanAttribute(this._input, "checked", b);
		}
	};
})();

const Slider = (function(){
	const CLASSES =
	{ root: "slider",
	  text: "slider__text" };
	const DEFAULTS = { text: "", reverse: false, step: null };

	return class {
		constructor(val, min, max, options) {
			this._initialValue = val;
			this._min = min;
			this._max = max;
			addOptions(this, DEFAULTS, options);

			this._createDOM();
			addEvent(this, "onChange");
			this._attachListeners();
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

		_attachListeners() {
			this._input.addEventListener("change", (evt) => {
				const v = Number(evt.target.value);
				this._onChange.trigger(v);
			});
		}

		get value() {
			return this._input.value;
		}

		set value(v) {
			this._input.value = v;
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
			addOptions(this, DEFAULTS, options);

			this.value  = null;

			this._createDOM();
			addEvent(this, "onChange");
			this._attachListeners();
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

		_attachListeners() {
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

const onKeyDown = function(elm, key, callback) {
	elm.addEventListener("keydown", (evt) => {
		if (evt.key === key)
		{
			callback(evt);
		}
	});
};

const AutoComplete = function(){

	const g_evaluate = (b, s) => shortestMatch(b, s, true);

	const cl_hide = "noshow";
	const cl_activeLi = "active";
	const DEFAULTS = { values: [],
					   caseSensitive: false };

	return class {
		constructor(input, options) {
			this._input = input;
			addOptions(this, DEFAULTS, options);

			const values = this.options.get("values");
			if (values.constructor !== Array) {
				throw new Error("option 'values' is not valid: " + values);
			}

			addEvent(this, "onConfirm");

			this._createDOM();
			this._attachEvents();
			this._close();
		}

		_createDOM() {
			this._list = document.createElement("ul");
		}

		_attachEvents() {
			this._input.addEventListener("input", (evt) => {
				this._update(this._input.value);
			});
			this._input.addEventListener("blur", (evt) => {
				this._close();
			});

			onKeyDown(this._input, "ArrowUp", (evt) => {
				evt.preventDefault();
				this._scroll(false);
			});
			onKeyDown(this._input, "ArrowDown", (evt) => {
				evt.preventDefault();
				this._scroll(true);
			});

			const form = this.options.get("form");
			const val = () => this.visible && this.selected ?
							  this.selected.innerText : null;
			if (form) {
				form.addEventListener("submit", (evt) => {
					evt.preventDefault();
					this._confirm(val());
				});
			} else {
				onKeyDown(this._input, "Enter", (evt) => {
					this._confirm(val());
				});
			}
		}

		get list() {
			return this._list;
		}

		get prevSelected() {
			return this._prevSelected;
		}

		get selected() {
			return this._selected;
		}

		set selected(elm) {
			if (this._selected) {
				this._selected.classList.remove(cl_activeLi);
				this._prevSelected = this._selected.innerText;
			} else {
				this._prevSelected = null;
			}

			if (elm) {
				elm.classList.add(cl_activeLi);
				elm.scrollIntoView({block: "nearest"});
			}
			this._selected = elm;
		}

		get visible() {
			return !this._list.classList.contains(cl_hide);
		}

		_update(text) {
			const ftext = this._formatInput(text);

			if (!ftext) {
				this._close();
			} else {
				const values = this._getSimilarValues(ftext, g_evaluate);
				if (values.length > 0) {
					this._setList(values);
				} else {
					this._close();
				}
			}
		}

		_scroll(inward) {
			if (this.selected) {
				if (inward && this.selected.nextSibling) {
					this.selected = this.selected.nextSibling;
				} else if (!inward && this.selected.previousSibling) {
					this.selected = this.selected.previousSibling;
				}
				else {/*ignore*/}
			} else if (inward) {
				this.selected = this._list.firstChild;	
			} else {/*ignore*/}
		}

		_confirm(val) {
			if (val) {
				this._input.value = val;
			} else {
				val = this._input.value;
			}

			this._onConfirm.trigger(val, this._input);
			this._close();
		}

		_formatInput(text) {
			if (!text) {
				return text;
			}

			if (!this.options.get("caseSensitive")) {
				text = text.toLowerCase();
			}

			return text;
		}

		_getSimilarValues(text, comp) {
			const cache = {};
			const values = this.options.get("values");
			values.forEach((val) => {
				cache[val] = comp(val, text);
			});

			return values.slice()
				   .filter(s => cache[s] !== null)
				   .sort((s1, s2) => cache[s2] - cache[s1]);
		}

		_setList(values) {
			this._clearList();

			values.forEach((val) => {
				const li = this._createLi(val);
				this._list.appendChild(li);

				if (!this.selected) {
					if (li.innerText === this.prevSelected) {
						this.selected = li;
					}
				}
			});

			show(this._list);
		}

		_createLi(text) {
			const li = document.createElement("li");

			li.addEventListener("mousemove", () => {
				if (this.selected !== li) {
					this.selected = li;
				}
			});
			li.addEventListener("click", (evt) => {
				evt.preventDefault();
				this._confirm(text);
			});
			li.addEventListener("mousedown", (evt) => {
				evt.preventDefault();
			});

			const textNode = document.createTextNode(text);
			li.appendChild(textNode);

			return li;
		}

		_clearList() {
			this.selected = null;

			let c;
			while ((c = this._list.firstChild)) {
				this._list.removeChild(c);
			}
		}

		_close() {
			hide(this._list);
			this._clearList();
		}
	};

	// eslint-disable-next-line no-unused-vars
	function timesFound(bigString, smallString) {
		let count = 0,
			found = 0;
		while (true) {
			found = bigString.indexOf(smallString, found);
			if (found === -1) {
				break;
			}
			else {
				count += 1;
				found +=1;
			}
		}

		if (count === 0) return null;
		else return count;
	}

	// eslint-disable-next-line no-unused-vars
	function shortestMatch(bigString, smallString, includeSameString) {
		let found = bigString.indexOf(smallString);

		if (found !== 0) {
			return null;
		} else {
			const val = smallString.length - bigString.length;
			return !includeSameString && val === 0 ? null : val;
		}
	}
}();
