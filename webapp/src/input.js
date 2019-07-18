
import { extend, addGetter, make, show, hide, setChecked } from "./utility";
import { addEvent } from "./event";
import { addOptions } from "./options";

export { Toggle, Slider, AutoComplete };

const Toggle = (function(){
	const cl_toggle = { root: "toggle", 
						text: "toggle__text", 
						slider: "toggle__slider" };
	const DEFAULTS = { text: "" };

	return class {
		constructor(iv, options) {
			this._initialValue = iv;
			addOptions(this, DEFAULTS, options);

			this._createDOM();
			this._initEvents();
			this._attachListeners();
		}

		_createDOM() {
			const d = make("div");
			d.classList.add(cl_toggle.root);
			addGetter(this, "root", d);

			const text = make("span");
			text.classList.add(cl_toggle.text);
			text.innerText = this._options.get("text");
			d.appendChild(text);

			const label = make("label");

			const input = make("input");
			input.type = "checkbox";
			setChecked(input, this._initialValue);
			label.appendChild(input);
			this._input = input;

			const slider = make("span");
			slider.classList.add(cl_toggle.slider);
			label.appendChild(slider);

			d.appendChild(label);
		}

		_initEvents() {
			addEvent(this, "onToggle");
		}

		_attachListeners() {
			this._input.addEventListener("change", (evt) => {
				this._onToggle.trigger(evt.target.checked);
			});
		}

		get toggled() {
			return this._input.checked;
		}
	};
})();

const Slider = (function(){
	const cl_slider = { root: "slider",
						text: "slider__text" };
	const DEFAULTS = { text: "", reverse: false };

	return class {
		constructor(iv, min, max, options) {
			this._initialValue = iv;
			this._min = min;
			this._max = max;
			addOptions(this, DEFAULTS, options);

			this._createDOM();
			this._initEvents();
			this._attachListeners();
		}

		_createDOM() {
			const d = make("div");
			d.classList.add(cl_slider.root);
			addGetter(this, "root", d);

			const span = make("span");
			span.innerText = this._options.get("text");
			span.classList.add(cl_slider.text);
			d.appendChild(span);

			const input = make("input");
			input.style.direction = this._options.get("reverse") ? "rtl" : "ltr";
			input.type = "range";
			input.min = this._min;
			input.max = this._max;
			input.value = this._initialValue;
			d.appendChild(input);
			this._input = input;
		}

		_initEvents() {
			addEvent(this, "onChange");
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

			const values = this._options.get("values");
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
			}

			this._onConfirm.trigger(this._input);
			this._close();
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
			onKeyDown(this._input, "Enter", (evt) => {
				const val = this._isOpen() && this.selected ? 
					  this.selected.innerText : null;
				this._confirm(val);
			});
		}

		_formatInput(text) {
			if (!text) {
				return text;
			}

			if (!this._options.get("caseSensitive")) {
				text = text.toLowerCase();
			}

			return text;
		}

		_getSimilarValues(text, comp) {
			const cache = {};
			const values = this._options.get("values");
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

		_isOpen() {
			return !this._list.classList.contains(cl_hide);
		}

		_close() {
			hide(this._list);
			this._clearList();
		}
	};

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
