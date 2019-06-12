
import { AddToEventLoop, addGetter, removeItem, extend, isUdf } from "./utility";
import { addEvent, MouseAction, MouseActionPiper } from "./event";
import { Box, Vector2 } from "./geometry";

export { Layer, LayerManager };

const Layer = (function(){
	const ID_LENGTH = 40;
	const DEFAULTS = {};

	function checkValidImage(image) {
		if (!(image instanceof HTMLImageElement)) {
			throw new Error("image is not an HTMLImageElement");
		}
		if (!image.complete) {
			throw new Error("image must have finished loading before creating layer.");
		}
	}

	return class extends Box {
		constructor(image, options) {
			checkValidImage(image);
			const d = document.createElement("div");
			super(d);
			addGetter(this, "image", image);

			this._options = extend(DEFAULTS, options);

			const canvas = document.createElement("canvas");
			this._element.appendChild(canvas);
			addGetter(this, "canvas", canvas);

			this._addDraw = new AddToEventLoop(() => {
				createImageBitmap(this._canvas).then((m) => {
					this._drawCanvas(this._canvas, m);
				});
			});
			this._addScale = new AddToEventLoop(() => {
				this._scaleCanvas();
			});

			const nw = this._image.naturalWidth, 
				  nh = this._image.naturalHeight;

			this._defineDrawProperty("innerTop", 0);
			this._defineDrawProperty("innerLeft", 0);
			this._defineDrawProperty("sourceTop", 0);
			this._defineDrawProperty("sourceLeft", 0);
			this._defineDrawProperty("sourceWidth", nw);
			this._defineDrawProperty("sourceHeight", nh);

			super.width  = nw;
			super.height = nh;
			canvas.width = nw;
			canvas.height = nh;
			this._canvasScaleY = 1;
			this._canvasScaleX = 1;

			setTimeout(() => {
				this._drawCanvas(this._canvas, this._image);
			});
		}

		get aspectRatio() {
			return this._image.naturalHeight / this._image.naturalWidth;
		}

		get width() {
			return super.width;
		}

		set width(value) {
			super.width = value;
			this._addScale.call();
		}

		get height() {
			return super.height;
		}

		set height(value) {
			super.height = value;
			this._addScale.call();	
		}

		get canvasScale() {
			const x = this.width / this._canvas.width,
				  y = this.height / this._canvas.height;
			return new Vector2(x, y);
		}

		_scaleCanvas() {
			const s = this.canvasScale;
			this._canvas.style.transform = `scale(${s.x}, ${s.y})`;
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
				this._addDraw.call();
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

		_drawCanvas(canvas, source) {
			const context = canvas.getContext("2d"),
				  w = canvas.width,
				  h = canvas.height;
			context.clearRect(0, 0, w, h);
			context.drawImage(source, 
							  this._sourceTop, this._sourceLeft, 
							  this._sourceWidth, this._sourceHeight, 
							  this._innerTop, this._innerLeft,
							  w, h);
		}
	};
})();

const LayerManager = (function(){
	const DEFAULT_CURSOR = "default";
	const cl_selected = "selected";

	return class {
		constructor(viewport) {
			this._layers = [];
			this._selected = [];

			let d = document.createElement("div");
			addGetter(this, "parent", d);
			viewport = viewport;
			addGetter(this, "viewport", viewport);
			this._scale = 1;
			this.resetCursor();

			addEvent(this, "onAdd");
			addEvent(this, "onRemove");
			addEvent(this, "onSelect");
			addEvent(this, "onDeselect");
			addEvent(this, "onSelectedChange");
			this.onAdd.addListener(this._defaultOnAddListener.bind(this));
			this.onRemove.addListener(this._defaultOnRemoveListener.bind(this));
			this.onSelect.addListener(this._defaultOnSelectListener.bind(this));
			this.onDeselect.addListener(this._defaultOnDeselectListener.bind(this));

			let a = new MouseActionPiper();
			addGetter(this, "layerMouseAction", a);
		}

		get layers() {
			return this._layers.slice();
		}

		get selected() {
			return this._selected.slice();
		}

		get scale() {
			return this._scale;
		}

		set scale(value) {
			this._scale = value;
			viewport.style.transform = "scale(" + value + ")";
		}

		add(layer) {
			this._layers.push(layer);
			this._onAdd.trigger(layer);
		}

		remove(layer) {
			removeItem(this._layers, layer);
			this._onRemove.trigger(layer);
		}

		_initLayer(layer) {
			layer.bounds = this._parent;
			let m = new MouseAction(layer.element, this._viewport, 
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
			this.deselect(layer);
		}

		select(layer) {
			this._selected.push(layer);
			this._onSelect.trigger(layer);
			this._onSelectedChange.trigger();
		}

		deselect(layer) {
			removeItem(this._selected, layer);
			this._onDeselect.trigger(layer);
			this._onSelectedChange.trigger();
		}
		
		deselectAll() {
			let s = this._selected;
			this._selected = [];
			s.forEach((layer) => {
				this._onDeselect.trigger(layer);
			});
			this._onSelectedChange.trigger();
		}

		_defaultOnSelectListener(layer) {
			layer.selected = true;
			layer.element.classList.add(cl_selected);

			let len = this._selected.length;
			if (len > 1) {
				this._parent.insertBefore(layer.element, this._selected[len-2].element);
			} else {
				this._parent.appendChild(layer.element);
			}
		}

		_defaultOnDeselectListener(layer) {
			layer.selected = false;
			layer.element.classList.remove(cl_selected);
		}

		set cursor(value) {
			this._viewport.style.cursor = value;	
		}

		resetCursor() {
			this.cursor = DEFAULT_CURSOR;
		}
	};
})();
