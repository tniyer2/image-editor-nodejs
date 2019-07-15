
import { addGetter, make, setChecked } from "./utility";
import { addEvent } from "./event";
import { addOptions } from "./options";

export { Toggle, Slider };

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
