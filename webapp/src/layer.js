
import { isUdf, addGetter, AddToEventLoop, make } from "./utility";
import { MouseAction, UserActionPiper, ZoomAction } from "./action";
import { ToggleItemCommand } from "./collectionWidgets";
import { ZoomWidget } from "./widget";
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

const LayerManager = (function(){
	const FNAMES =
	["_onAdd", "_onRemove", 
	 "_onSelect", "_onDeselect"];
	const CALLBACK_PROPS =
	["onAdd", "onRemove", 
	 "onSelect", "onDeselect"];
	const CLASSES =
	{ layers: "layers",
	  layer: "layer", 
	  selected: "selected" };

	return class {
		constructor(editor, vp, ivp) {
			this._editor = editor;

			const anchor = new Anchor(vp);
			addGetter(this, "viewport", anchor);
			const box = new Box(ivp, anchor);
			addGetter(this, "innerViewport", box);

			const opt = {};
			CALLBACK_PROPS.forEach((b, i) => {
			 	opt[b] = this[FNAMES[i]].bind(this);
			 });
			const c = new (Collection([BASE, SELECT]))(opt);
			addGetter(this, "layers", c);

			const d = make("div");
			d.classList.add(CLASSES.layers);
			ivp.appendChild(d);
			addGetter(this, "parent", d);

			const mp = new UserActionPiper();
			addGetter(this, "layerUserAction", mp);

			this._initZoomWidget();
		}

		_initZoomWidget() {
			this._zoomWidget = new ZoomWidget(this._innerViewport, 
			{ factor: 0.2, condition: () => {
				const c = this._editor.stack.current;
				return !c || !c.open;
			} });
			const action = new ZoomAction(this._viewport.element);
			this._zoomWidget.handle(action);
		}

		addLayer(layer) {
			const c = new ToggleItemCommand(this._layers, layer, true);
			this._editor.stack.add(c);
			c.execute();
		}

		_initLayer(layer) {
			layer.element.classList.add(CLASSES.layer);
			layer.parent = this._innerViewport;
			if (this._layers.items.length === 1) {
				this._innerViewport.localDimensions = layer.localDimensions;
			}
			const m = new MouseAction(layer.element, this._viewport.element, 
						{ data: layer, 
						  loop: true, 
						  exitOnMouseLeave: false });
			this._layerUserAction.pipe(m);
		}

		_onAdd(layer) {
			this._parent.appendChild(layer.element);
			if (!layer.p_initialized) {
				this._initLayer(layer);
				layer.p_initialized = true;
			}
		}

		_onRemove(layer) {
			this._parent.removeChild(layer.element);
			if (layer.selected) {
				this._layers.deselect(layer);
			} 
		}

		_onSelect(layer) {
			layer.selected = true;
			layer.element.classList.add(CLASSES.selected);

			const len = this._layers.selected.length;
			if (len > 1) {
				const b = this._layers.selected[len-2].element;
				this._parent.insertBefore(layer.element, b);
			} else {
				this._parent.appendChild(layer.element);
			}
		}

		_onDeselect(layer) {
			layer.selected = false;
			layer.element.classList.remove(CLASSES.selected);
		}
	};
})();
