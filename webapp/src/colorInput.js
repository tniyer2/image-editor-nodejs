
import { isUdf, addGetter, make, show, hide, 
		 isDescendant, preventBubble, clampAlpha } from "./utility";
import { addEvent, MyEvent } from "./event";
import { Listener } from "./listener";
import { MouseAction } from "./action";
import { DragWidget } from "./transform";
import { Box } from "./geometry";
import { Slider } from "./input";
import { addOptions } from "./options";

export { ColorPicker, ColorBox };

function validArray(arr, len) {
	return arr.constructor === Array && arr.length === len;
}

function validColorNumber(a) {
	return typeof a === "number" && !isNaN(a) && a >= 0 && a <= 255;
}

function validColor(arr, noAlpha=false) {
	return validArray(arr, noAlpha ? 3 : 4) && arr.every(validColorNumber);
}

const ColorPicker = (function(){
	const cl_root = "color-picker",
		  cl_hexInput = "hex-input",
		  cl_alphaSlider = "alpha-slider",
		  cl_closeBtn = "close";
	const DEFAULTS = { defaultColor: [0, 0, 0, 255] };

	return class {
		constructor(options) {
			addOptions(this, DEFAULTS, options);

			this._updateInputs = this._updateInputs.bind(this);

			this._createEvents();

			this._createDOM();
			this._attachEventListeners();
			this._createDragWidget();

			this._resetColor();
			this._updateInputs(this.color);
		}

		_createEvents() {
			this._onChangeMain = new MyEvent();
			this._onChangeMain.interface.addListener(this._updateInputs);
			addEvent(this, "onChange");
			this._onChange.linkTo(this._onChangeMain);
		}

		_createDOM() {
			const d = make("div");
			d.classList.add(cl_root);
			hide(d);
			addGetter(this, "root", d);

			const hexInput = make("input");
			hexInput.type = "text";
			hexInput.classList.add(cl_hexInput);
			preventBubble(hexInput, "mousedown");
			d.appendChild(hexInput);
			this._hexInput = hexInput;

			const closeBtn = make("button");
			closeBtn.type = "button";
			closeBtn.innerHTML = "&times;";
			closeBtn.classList.add(cl_closeBtn);
			preventBubble(closeBtn, "mousedown");
			d.appendChild(closeBtn);
			this._closeBtn = closeBtn;

			const br = make("br");
			d.appendChild(br);

			const alphaSlider = new Slider(0, 0, 255, { text: "alpha" });
			const asr = alphaSlider.root;
			asr.classList.add(cl_alphaSlider); 
			preventBubble(asr, "mousedown");
			d.appendChild(asr);
			this._alphaSlider = alphaSlider;
		}

		_attachEventListeners() {
			this._hexInput.addEventListener("change", (evt) => {
				const hexCode = evt.target.value;
				let color;
				try {
					color = chroma(hexCode);
				} catch (e) {
					return;
				}
				this._setRGB(color.rgb());
			});
			this._closeBtn.addEventListener("click", () => {
				this.hide();
			});
			this._onClickOutListener = new Listener(document, "click", (evt) => {
				const t = evt.target;
				if (t !== this._root && !isDescendant(this._root, t)) {
					this.hide();
				}
			});
			this._alphaSlider.onChange.addListener((alpha) => {
				this._setAlpha(alpha);
			});
		}

		_createDragWidget() {
			this._box = new Box(this._root);
			this._action = new MouseAction(this._root, document);
			this._dragWidget = new DragWidget({ offStackBoxes: [this._box] });
			this._dragWidget.handle(this._action);
		}

		get color() {
			return this._color.slice();
		}

		set color(value) {
			if (!validColor(value)) {
				throw new Error("Invalid argument:", value);
			}
			this._color = value.slice();
			this._triggerOnChangeMain();
		}

		_setRGB(rgbColor) {
			if (!validColor(rgbColor, true)) {
				throw new Error("Invalid argument:", rgbColor);
			}
			rgbColor = rgbColor.slice();
			rgbColor.push(this._color[3]);

			this._color = rgbColor;
			this._triggerOnChangeMain();
		}

		_setAlpha(a) {
			if (!validColorNumber(a)) {
				throw new Error("Invalid argument:", a);
			}
			this._color[3] = a;
			this._triggerOnChangeMain();
		}

		_resetColor() {
			this.color = this._options.get("defaultColor");
		}

		_triggerOnChangeMain() {
			this._onChangeMain.triggerWithParams(() => [this.color]);
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
					this._root.style.top  = b.top + (b.height / 2) + "px";
					this._root.style.left = b.left + (b.width / 2) + "px";
				} else {
					throw new Error("elm is not an HTMLElement:", elm);
				}
			}

			this._resetColor();
			show(this._root);
			setTimeout(() => {
				this._onClickOutListener.attach();
			});
		}

		hide() {
			this._onClickOutListener.remove();
			hide(this._root);

			this._onChange.clear();
		}
	};
})();

const ColorBox = (function(){
	const cl_root = "color-box",
		  cl_hex = "color-box__hex";
	const DEFAULTS = { color: [0, 0, 0, 255], displayHex: true };

	return class {
		constructor(cp, options) {
			this._colorPicker = cp;
			addOptions(this, DEFAULTS, options);

			this._color = this._options.get("color");

			this._updateColor = this._updateColor.bind(this);

			this._createEvents();
			this._createDOM();
			this._updateDOM();
			this._attachEventListeners();
		}

		_createEvents() {
			addEvent(this, "onChange");
		}

		_createDOM() {
			const d = make("div");
			d.classList.add(cl_root);
			addGetter(this, "root", d);

			const hex = make("span");
			hex.classList.add(cl_hex);
			d.appendChild(hex);
			this._hex = hex;
		}

		_updateDOM() {
			const cma = this.chroma;
			const hexCode = cma.hex("rgb");
			this._root.style.backgroundColor = hexCode;

			let name = cma.name();
			/*name.charAt(0) === "#" ? "lowercase" : "capitalize"*/
			this._hex.style.textTransform = "lowercase";
			this._hex.innerText = name;
			this._hex.style.color = cma.hsv()[2] > 0.5 ? "black" : "white";
		}

		_attachEventListeners() {
			this._root.addEventListener("click", () => {
				this._colorPicker.show(this._root);
				this._colorPicker.color = this.color;
				this._colorPicker.onChange.addListener(this._updateColor);
			});
		}

		_updateColor(color) {
			this.color = color;
			this._updateDOM();
			this._onChange.triggerWithParams(() => [this.color]);
		}

		get color() {
			return this._color.slice();
		}

		set color(value) {
			if (!validColor(value)) {
				throw new Error("Invalid color:", value);
			}
			this._color = value.slice();
		}

		get chroma() {
			return chroma(clampAlpha(this.color));
		}
	};
})();
