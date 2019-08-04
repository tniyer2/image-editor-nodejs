
import { isUdf } from "./type";
import { AddToEventLoop } from "./utility";
import { Box } from "./geometry";

export { Layer };

const Layer = (function(){
	function checkValidImage(image) {
		if (!(image instanceof HTMLImageElement)) {
			throw new Error("image is not an HTMLImageElement");
		}
		if (!image.complete) {
			throw new Error("image should be loaded before creating layer.");
		}
	}
	return class extends Box {
		constructor(image) {
			checkValidImage(image);
			const d = document.createElement("div");
			super(d);
			this.image = image.cloneNode();

			const canvas = document.createElement("canvas");
			this._element.appendChild(canvas);
			this.canvas = canvas;

			// not tested
			this._addDraw = new AddToEventLoop(() => {
				createImageBitmap(this.canvas).then((m) => {
					this._drawCanvas(m);
				});
			});

			const w = this.image.naturalWidth, 
				  h = this.image.naturalHeight;

			this._initialLocalWidth = w;
			this._initialLocalHeight = h;

			this.canvas.width = w;
			this.canvas.height = h;
			this._canvasScaleX = 1;
			this._canvasScaleY = 1;
			this._updateCanvasCss = new AddToEventLoop(() => {
				this.canvas.style.transform = `scale(${this._canvasScaleX}, ${this._canvasScaleY})`;
			});

			this._element.style.width = w + "px";
			this._element.style.height = h + "px";

			this._defineDrawProperty("innerTop", 0);
			this._defineDrawProperty("innerLeft", 0);
			this._defineDrawProperty("sourceTop", 0);
			this._defineDrawProperty("sourceLeft", 0);
			this._defineDrawProperty("sourceWidth", w);
			this._defineDrawProperty("sourceHeight", h);

			setTimeout(() => {
				this._drawCanvas(this.image);
			});
		}

		get aspectRatio() {
			return this.image.naturalHeight / this.image.naturalWidth;
		}

		get localWidth() {
			return super.localWidth;
		}

		set localWidth(val) {
			super.localWidth = val;
			this._canvasScaleX = super.localWidth / this._initialLocalWidth;
			this._updateCanvasCss.invoke();
		}

		get localHeight() {
			return super.localHeight;
		}

		set localHeight(val) {
			super.localHeight = val;
			this._canvasScaleY = super.localHeight / this._initialLocalHeight;
			this._updateCanvasCss.invoke();
		}

		_defineDrawProperty(name, defaultValue) {
			const privateName = "_" + name;

			if (!isUdf(defaultValue)) {
				this[privateName] = defaultValue;
			}

			Object.defineProperty(this, name, { get: () => {
				return this[privateName];
			}, set: (value) => {
				this[privateName] = value;
				this._addDraw.invoke();
			}});
		}

		get innerWidth() {
			return this.canvas.width;
		}

		set innerWidth(value) {
			this.canvas.width = value;
		}

		get innerHeight() {
			return this.canvas.height;
		}

		set innerHeight(value) {
			this.canvas.height = value;
		}

		_drawCanvas(source) {
			const context = this.canvas.getContext("2d"),
				  w = this.canvas.width,
				  h = this.canvas.height;
			context.clearRect(0, 0, w, h);
			context.drawImage(source, 
							  this._sourceTop, this._sourceLeft, 
							  this._sourceWidth, this._sourceHeight, 
							  this._innerTop, this._innerLeft,
							  w, h);
		}
	};
})();
