
import { isUdf, bindFunctions, removeItem, 
		 addGetter, AddToEventLoop, make } from "./utility";
import { addEvent } from "./event";
import { MouseAction, MouseActionPiper } from "./action";
import { Anchor, Box } from "./geometry";
import { Collection, BASE, SELECT } from "./collection";

export { Layer, LayerManager };

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
			const d = make("div");
			super(d);
			addGetter(this, "image", image.cloneNode());

			const canvas = make("canvas");
			this._element.appendChild(canvas);
			addGetter(this, "canvas", canvas);

			// not tested
			this._addDraw = new AddToEventLoop(() => {
				createImageBitmap(this._canvas).then((m) => {
					this._drawCanvas(m);
				});
			});

			const w = this._image.naturalWidth, 
				  h = this._image.naturalHeight;

			this._initialLocalWidth = w;
			this._initialLocalHeight = h;

			this._canvas.width = w;
			this._canvas.height = h;
			this._canvasScaleX = 1;
			this._canvasScaleY = 1;
			this._updateCanvasCss = new AddToEventLoop(() => {
				this._canvas.style.transform = `scale(${this._canvasScaleX}, ${this._canvasScaleY})`;
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
				this._drawCanvas(this._image);
			});
		}

		get aspectRatio() {
			return this._image.naturalHeight / this._image.naturalWidth;
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
			return this._canvas.width;
		}

		set innerWidth(value) {
			this._canvas.width = value;
		}

		get innerHeight() {
			return this._canvas.height;
		}

		set innerHeight(value) {
			this._canvas.height = value;
		}

		_drawCanvas(source) {
			const context = this._canvas.getContext("2d"),
				  w = this._canvas.width,
				  h = this._canvas.height;
			context.clearRect(0, 0, w, h);
			context.drawImage(source, 
							  this._sourceTop, this._sourceLeft, 
							  this._sourceWidth, this._sourceHeight, 
							  this._innerTop, this._innerLeft,
							  w, h);
		}
	};
})();

class LayerManager extends Collection {
	constructor(viewport, innerViewport) {
		const base = Object.assign({}, BASE);
		base.varName = "layers";
		const select = Object.assign({}, SELECT);
		select.onChange = "onSelectedChange";
		super(base, select);

		const d = make("div");
		addGetter(this, "parent", d);

		const vp = new Anchor(viewport);
		addGetter(this, "viewport", vp);

		const ivp = new Box(innerViewport, this._viewport);
		addGetter(this, "innerViewport", ivp);

		const mp = new MouseActionPiper();
		addGetter(this, "layerMouseAction", mp);
	}

	_initLayer(layer) {
		layer.parent = this._innerViewport;
		if (this._layers.length === 1) {
			this._innerViewport.localDimensions = layer.localDimensions;
		}
		const m = new MouseAction(layer.element, this._viewport.element, 
					{ data: layer, 
					  loop: true, 
					  exitOnMouseLeave: false });
		this._layerMouseAction.pipe(m);
	}

	_defaultOnAdd(layer) {
		this._parent.appendChild(layer.element);
		if (isUdf(layer.element.dataset.initialized)) {
			this._initLayer(layer);
			layer.element.dataset.initialized = true;
		}
	}

	_defaultOnRemove(layer) {
		layer.element.remove();
		if (layer.selected) {
			this.deselect(layer);
		} 
	}

	_defaultOnSelect(layer) {
		layer.selected = true;

		const len = this._selected.length;
		if (len > 1) {
			this._parent.insertBefore(layer.element, this._selected[len-2].element);
		} else {
			this._parent.appendChild(layer.element);
		}
	}

	_defaultOnDeselect(layer) {
		layer.selected = false;
	}
}
