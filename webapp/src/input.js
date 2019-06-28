
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
		constructor(initialValue, options) {
			addOptions(this, DEFAULTS, options);

			const d = make("div");
			d.classList.add(cl_toggle.root);

			const text = make("span");
			text.classList.add(cl_toggle.text);
			text.innerText = this._options.get("text");
			d.appendChild(text);

			const label = make("label");

			const input = make("input");
			input.type = "checkbox";
			setChecked(input, initialValue);
			addEvent(this, "onToggle");
			input.addEventListener("change", (evt) => {
				this._onToggle.trigger(evt.target.checked);
			});
			this._input = input;
			label.appendChild(input);

			const slider = make("span");
			slider.classList.add(cl_toggle.slider);
			label.appendChild(slider);

			d.appendChild(label);

			addGetter(this, "root", d);
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
		constructor(initialValue, min, max, options) {
			addOptions(this, DEFAULTS, options);

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
			input.min = min;
			input.max = max;
			input.value = initialValue;
			addEvent(this, "onChange");
			input.addEventListener("change", (evt) => {
				const v = Number(evt.target.value);
				this._onChange.trigger(v);
			});
			this._input = input;
			d.appendChild(input);
		}

		get value() {
			return this._input.value;
		}

		set value(v) {
			this._input.value = v;
		}
	};
})();
