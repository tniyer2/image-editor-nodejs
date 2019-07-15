
import { isUdf, bindFunctions, removeItem, 
		 addGetter, AddToEventLoop, make } from "./utility";
import { addEvent } from "./event";
import { MouseAction, MouseActionPiper } from "./action";
import { Anchor, Box } from "./geometry";

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

class LayerManager {
	constructor(viewport, innerViewport) {
		this._layers = [];
		this._selected = [];

		const d = make("div");
		addGetter(this, "parent", d);

		const vp = new Anchor(viewport);
		addGetter(this, "viewport", vp);

		const ivp = new Box(innerViewport, this._viewport);
		addGetter(this, "innerViewport", ivp);

		addEvent(this, "onAdd");
		addEvent(this, "onRemove");
		addEvent(this, "onSelect");
		addEvent(this, "onDeselect");
		addEvent(this, "onSelectedChange");

		bindFunctions(this, ["_defaultOnAddListener",
							 "_defaultOnRemoveListener",
							 "_defaultOnSelectListener",
							 "_defaultOnDeselectListener"]);
		this.onAdd.addListener(this._defaultOnAddListener);
		this.onRemove.addListener(this._defaultOnRemoveListener);
		this.onSelect.addListener(this._defaultOnSelectListener);
		this.onDeselect.addListener(this._defaultOnDeselectListener);

		const mp = new MouseActionPiper();
		addGetter(this, "layerMouseAction", mp);
	}

	get layers() {
		return this._layers.slice();
	}

	get selected() {
		return this._selected.slice();
	}

	add(layer) {
		this._layers.push(layer);
		this._onAdd.trigger(layer);
	}

	remove(layer) {
		const removed = removeItem(this._layers, layer);
		if (removed) {
			this._onRemove.trigger(layer);
		} else {
			console.warn("Could not remove layer from this._layers: ", layer);
		}
	}

	_initLayer(layer) {
		layer.parent = this._innerViewport;
		const m = new MouseAction(layer.element, this._viewport.element, 
					{ data: layer, 
					  loop: true, 
					  exitOnMouseLeave: false });
		this._layerMouseAction.pipe(m);
	}

	_defaultOnAddListener(layer) {
		this._parent.appendChild(layer.element);
		if (isUdf(layer.element.dataset.initialized)) {
			this._initLayer(layer);
			layer.element.dataset.initialized = true;
		}
	}

	_defaultOnRemoveListener(layer) {
		layer.element.remove();
		if (layer["data-selected"]) {
			this.deselect(layer);
		} 
	}

	select(layer) {
		this._selected.push(layer);
		this._onSelect.trigger(layer);
		this._onSelectedChange.trigger();
	}

	deselect(layer) {
		const removed = removeItem(this._selected, layer);
		if (removed) {
			this._onDeselect.trigger(layer);
			this._onSelectedChange.trigger();
		} else {
			console.warn("Could not remove layer from this._selected: ", layer);
		}
	}
	
	deselectAll() {
		const old = this._selected;
		this._selected = [];

		old.forEach((layer) => {
			this._onDeselect.trigger(layer);
		});
		this._onSelectedChange.trigger();
	}

	_defaultOnSelectListener(layer) {
		layer["data-selected"] = true;

		const len = this._selected.length;
		if (len > 1) {
			this._parent.insertBefore(layer.element, this._selected[len-2].element);
		} else {
			this._parent.appendChild(layer.element);
		}
	}

	_defaultOnDeselectListener(layer) {
		layer["data-selected"] = false;
	}
}
