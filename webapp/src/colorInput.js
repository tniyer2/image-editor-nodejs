
import { isUdf, isNumber, isType } from "./type";
import { show, hide, isDescendant, stopBubbling } from "./utility";
import { addEvent, MyEvent } from "./event";
import { Listener } from "./listener";
import { MouseAction } from "./action";
import { DragWidget } from "./boxWidgets";
import { Box } from "./geometry";
import { Slider } from "./input";
import Options from "./options";

export { ColorPicker, ColorBox };

function validColorNumber(a) {
	return isNumber(a) && a >= 0 && a <= 255;
}

function validColor(arr, noAlpha=false) {
	return isType(arr, Array) && arr.length === (noAlpha ? 3 : 4) &&
		   arr.every(validColorNumber);
}

const ColorPicker = (function(){
	const cl_root = "color-picker",
		  cl_hexInput = "hex-input",
		  cl_alphaSlider = "alpha-slider",
		  cl_closeBtn = "close";
	const DEFAULTS = { defaultColor: [0, 0, 0, 255] };

	return class {
		constructor(options) {
			this.options = new Options();
			this.options.set(DEFAULTS, options);

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

			const alphaSlider = new Slider(0, 0, 255, { text: "alpha" });
			const asr = alphaSlider.root;
			asr.classList.add(cl_alphaSlider); 
			stopBubbling(asr, "mousedown");
			d.appendChild(asr);
			this._alphaSlider = alphaSlider;
		}

		_attachEventListeners() {
			this._hexInput.addEventListener("change", (evt) => {
				let color;
				try {
					color = chroma(evt.target.value);
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
				if (t !== this.root && !isDescendant(this.root, t)) {
					this.hide();
				}
			});
			this._alphaSlider.onChange.addListener((alpha) => {
				this._setAlpha(alpha);
			});
		}

		_createDragWidget() {
			this._box = new Box(this.root);
			this._action = new MouseAction(this.root, document);
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
			this.color = this.options.get("defaultColor");
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
	const cl_root = "color-box",
		  cl_hex = "color-box__hex";
	const DEFAULTS = { color: [0, 0, 0, 255], displayHex: true };

	return class {
		constructor(cp, options) {
			this._colorPicker = cp;
			this.options = new Options();
			this.options.set(DEFAULTS, options);

			this._color = this.options.get("color");

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
			const d = document.createElement("div");
			d.classList.add(cl_root);
			this.root = d;

			const hex = document.createElement("span");
			hex.classList.add(cl_hex);
			d.appendChild(hex);
			this._hex = hex;
		}

		_updateDOM() {
			const cma = this.chroma;
			const hexCode = cma.hex("rgb");
			this.root.style.backgroundColor = hexCode;

			let name = cma.name();
			/*name.charAt(0) === "#" ? "lowercase" : "capitalize"*/
			this._hex.style.textTransform = "lowercase";
			this._hex.innerText = name;
			this._hex.style.color = cma.hsv()[2] > 0.5 ? "black" : "white";
		}

		_attachEventListeners() {
			this.root.addEventListener("click", () => {
				this._colorPicker.show(this.root);
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
			const color = this._color.slice();
			color[3] /= 255;
			return chroma(color);
		}
	};
})();
