
import { Vector2, getRandomString, addGetter, removeItem, extend, isUdf } from "./utility";
import { addEvent, MouseAction, MouseActionManager } from "./event";

export { Layer, LayerManager };

const Layer = (function(){
	const ID_LENGTH = 40;
	const DEFAULTS = {};

	return class {
		constructor(image, options)
		{
			this._checkValidImage(image);
			addGetter(this, "image", image);

			this._options = extend(DEFAULTS, options);

			this._canvas = document.createElement("canvas");
			addGetter(this, "canvas");
			this._parent = document.createElement("div");
			this._parent.appendChild(this._canvas);
			addGetter(this, "parent");
			this._id = getRandomString(ID_LENGTH);
			addGetter(this, "id");

			this.innerTop = 0;
			this.innerLeft = 0;

			let width  = this._options.width  || this._image.naturalWidth;
			let height = this._options.height || this._image.naturalHeight;
			this.width = width;
			this.height = height;
			this.innerWidth = width;
			this.innerHeight = height;
			this.draw();
		}

		_checkValidImage(image)
		{
			if (!(image instanceof HTMLImageElement))
			{
				throw new Error("image is not an HTMLImageElement");
			}
			if (!image.complete)
			{
				throw new Error("image must have finished loading before creating layer.");
			}
		}

		get top()
		{
			return this._parent.offsetTop;
		}

		set top(value)
		{
			this._parent.style.top = value + "px";	
		}

		get left()
		{
			return this._parent.offsetLeft;
		}

		set left(value)
		{
			this._parent.style.left = value + "px";	
		}

		get pos()
		{
			return new Vector2(this.left, this.top);
		}

		set pos(value)
		{
			this.left = value.x;
			this.top = value.y;
		}

		get width()
		{
			return this._canvas.width;
		}

		set width(value)
		{
			this._parent.style.width = value + "px";
			this._canvas.width = value;
		}

		get height()
		{
			return this._canvas.height;
		}

		set height(value)
		{
			this._parent.style.height = value + "px";
			this._canvas.height = value;
		}

		draw()
		{
			this._canvas.getContext("2d").drawImage(this._image, this.innerTop, this.innerLeft, this.innerWidth, this.innerHeight);
		}
	};
})();

const LayerManager = (function(){
	const DEFAULT_CURSOR = "default";

	return class {
		constructor()
		{
			this._layers = [];
			this._selected = [];
			addEvent(this, "onAdd");
			addEvent(this, "onRemove");
			addEvent(this, "onSelectedChange");
			addGetter(this, "mouseActionManager", new MouseActionManager());

			this._parent = document.createElement("div");
			addGetter(this, "parent");
			this.resetCursor();

			this.onAdd.addListener((layer) => {
				this._parent.appendChild(layer.parent);
				if (isUdf(layer.parent.dataset.initialized))
				{
					this._initLayer(layer);
					layer.parent.dataset.initialized = true;
				}
			});
			this.onRemove.addListener((layer) => {
				this._parent.removeChild(layer.parent);
				this.deselect(layer);
			});
			this.onSelectedChange.addListener(() => {
				this._selected.reverse().forEach((layer) => {
					this._parent.appendChild(layer.parent);
				});
			});
		}

		_initLayer(layer)
		{
			let m = new MouseAction(layer.parent, this._parent, { loop: true, exitOnMouseLeave: true });
			this._mouseActionManager.add(m, layer);
		}

		get layers()
		{
			return this._layers.slice();
		}

		get selected()
		{
			return this._selected.slice();
		}

		add(layer)
		{
			this._layers.push(layer);
			this._onAdd.trigger(layer);
		}

		remove(layer)
		{
			removeItem(this._layers, layer);
			this._onRemove.trigger(layer);
		}

		select(layer)
		{
			this._selected.push(layer);
			this._onSelectedChange.trigger();
		}

		deselect(layer)
		{
			removeItem(this._selected, layer);
			this._onSelectedChange.trigger();
		}
		
		deselectAll()
		{
			this._selected = [];
			this._onSelectedChange.trigger();
		}

		set cursor(value)
		{
			this._parent.style.cursor = value;	
		}

		resetCursor()
		{
			this.cursor = DEFAULT_CURSOR;
		}
	};
})();
