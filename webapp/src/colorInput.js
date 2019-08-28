
import { isUdf, isArray } from "./type";
import { show, hide, isDescendant, stopBubbling } from "./utility";
import { addEvent, MyEvent } from "./event";
import { Listener } from "./listener";
import { MouseAction } from "./action";
import { DragWidget } from "./boxWidgets";
import { Box } from "./geometry";
import { Slider } from "./input";
import Options from "./options";

export { ColorPicker, ColorBox };

function isInt8(a) {
	return Number.isInteger(a) && a >= 0 && a <= 255;
}

function isColor(arr, noAlpha=false) {
	return isArray(arr) && arr.length === (noAlpha ? 3 : 4) &&
		   arr.every(isInt8);
}

const ColorPicker = (function(){
	const cl_root = "color-picker",
		  cl_hexInput = "hex-input",
		  cl_alphaSlider = "alpha-slider",
		  cl_closeBtn = "close";
	const DEFAULTS = { defaultColor: [0, 0, 0, 255] };

	return class {
		constructor(parent, options) {
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._updateInputs = this._updateInputs.bind(this);

			this._initEvents();

			this._createDOM();
			this._addListeners();
			this._initDragWidget(parent);

			this._resetColor();
			this._updateInputs(this.color);
		}

		get color() {
			return this._color.slice();
		}

		set color(value) {
			if (!isColor(value)) {
				throw new Error("Invalid argument.");
			}

			this._color = value.slice();
			this._triggerOnChangePrivate();
		}

		_initEvents() {
			this._onChangePrivate = new MyEvent();
			this._onChangePrivate.interface.addListener(this._updateInputs);

			addEvent(this, "onChange");
			this._onChange.linkTo(this._onChangePrivate);
		}

		_createDOM() {
			const d = document.createElement("div");
			d.classList.add(cl_root);
			hide(d);
			this.root = d;

			const hexInput = document.createElement("input");
			hexInput.type = "text";
			hexInput.classList.add(cl_hexInput);
			stopBubbling(hexInput, "mousedown");
			d.appendChild(hexInput);
			this._hexInput = hexInput;

			const closeBtn = document.createElement("button");
			closeBtn.type = "button";
			closeBtn.innerHTML = "&times;";
			closeBtn.classList.add(cl_closeBtn);
			stopBubbling(closeBtn, "mousedown");
			d.appendChild(closeBtn);
			this._closeBtn = closeBtn;

			const br = document.createElement("br");
			d.appendChild(br);

			this._alphaSlider = new Slider(0, 0, 255, { text: "alpha" });
			const r = this._alphaSlider.root;
			r.classList.add(cl_alphaSlider); 
			stopBubbling(r, "mousedown");
			d.appendChild(r);
		}

		_addListeners() {
			this._onClickOutListener = new Listener(document, "click", (evt) => {
				const t = evt.target;
				if (t !== this.root && !isDescendant(this.root, t)) {
					this.hide();
				}
			});

			this._closeBtn.addEventListener("click", () => {
				this.hide();
			});

			this._hexInput.addEventListener("change", (evt) => {
				let color;
				const val = evt.target.value;
				try {
					color = chroma(val);
				} catch (e) {
					return;
				}
				this.color = color.rgba();
			});

			this._alphaSlider.onChange.addListener((alpha) => {
				this._setAlpha(alpha);
			});
		}

		_initDragWidget(parent) {
			const box = new Box(this.root, parent);
			box.appendElement();
			const action = new MouseAction(this.root, parent.element);
			const w = new DragWidget({ boxes: [box] });
			w.handle(action);
		}

		_triggerOnChangePrivate() {
			this._onChangePrivate.triggerWithParams(() => [this.color]);
		}

		_setAlpha(a) {
			if (!isInt8(a)) {
				throw new Error("Invalid argument.");
			}

			this._color[3] = a;
			this._triggerOnChangePrivate();
		}

		_resetColor() {
			this.color = this.options.get("defaultColor");
		}

		_updateInputs(color) {
			const alpha = color.pop();
			color = chroma(color);

			this._hexInput.value = color.hex();
			this._alphaSlider.value = alpha;
		}

		show(elm) {
			if (!isUdf(elm)) {
				if (elm instanceof HTMLElement) {
					const b = elm.getBoundingClientRect();
					this.root.style.top  = b.top + (b.height / 2) + "px";
					this.root.style.left = b.left + (b.width / 2) + "px";
				} else {
					throw new Error("Invalid argument.");
				}
			}

			this._resetColor();
			show(this.root);
			setTimeout(() => {
				this._onClickOutListener.attach();
			});
		}

		hide() {
			this._onClickOutListener.remove();
			hide(this.root);

			this._onChange.clear();
		}
	};
})();

const ColorBox = (function(){
	const CLASSES =
	{ root: "color-box",
	  hex: "color-box__hex" };

	const DEFAULTS =
	{ color: [0, 0, 0, 255],
	  displayHex: true };

	return class {
		constructor(cp, options) {
			this._colorPicker = cp;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._color = this.options.get("color");

			addEvent(this, "onChange");

			this._createDOM();
			this._updateDOM();
			this._addListeners();
		}

		get color() {
			return this._color.slice();
		}

		set color(value) {
			if (!isColor(value)) {
				throw new Error("Invalid argument.");
			}
			this._color = value.slice();
		}

		get chroma() {
			const color = this.color;
			color[3] /= 255;
			return chroma(color);
		}

		_createDOM() {
			const d = document.createElement("div");
			d.classList.add(CLASSES.root);
			this.root = d;

			const hex = document.createElement("span");
			hex.classList.add(CLASSES.hex);
			d.appendChild(hex);
			this._hex = hex;
		}

		_updateDOM() {
			const c = this.chroma;
			this.root.style.backgroundColor = c.hex("rgb");

			let name = c.name();
			/*name.charAt(0) === "#" ? "lowercase" : "capitalize"*/
			this._hex.style.textTransform = "lowercase";
			this._hex.innerText = name;
			this._hex.style.color = c.hsv()[2] > 0.5 ? "black" : "white";
		}

		_addListeners() {
			this.root.addEventListener("click", () => {
				this._colorPicker.show(this.root);
				this._colorPicker.color = this.color;
				this._colorPicker.onChange.addListener((color) => {
					this.color = color;
					this._updateDOM();
					this._onChange.triggerWithParams(() => [this.color]);
				});
			});
		}
	};
})();
