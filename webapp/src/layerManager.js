
import { AddToEventLoop } from "./utility";
import { MouseAction, UserActionPiper, ZoomAction } from "./action";
import { ZoomWidget } from "./widget";
import { Box, Vector2 } from "./geometry";
import { LayerBox } from "./layer";
import { Collection, BASE, SELECT } from "./collection";

const BASE2 = Object.assign({}, BASE);
BASE2.clear = "removeAll";
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
const H_PADDING = 20,
	  V_PADDING = 20;

export default class {
	constructor(editor, vp, ivp) {
		this._editor = editor;

		this.viewport = new Box(vp, this._editor.anchor);
		this.innerViewport = new Box(ivp, this.viewport);

		const opt = {};
		CALLBACK_PROPS.forEach((b, i) => {
		 	opt[b] = this[FNAMES[i]].bind(this);
		 });
		this.layers = new (Collection([BASE2, SELECT]))(opt);

		this.parent = document.createElement("div");
		this.parent.classList.add(CLASSES.layers);
		ivp.appendChild(this.parent);

		this.layerUserAction = new UserActionPiper();

		this._initZoomWidget();
		this._initUpdateDOM();
	}

	_initZoomWidget() {
		this._zoomAction = new ZoomAction(this.viewport.element);

		this._zoomWidget = new ZoomWidget(this.innerViewport, 
		{ factor: 0.2, 
		  condition: () => {
			const c = this._editor.stack.current;
			return !c || !c.open;
		  } });
		this._zoomWidget.handle(this._zoomAction);
	}

	_initUpdateDOM() {
		this._updateDOM = new AddToEventLoop(() => {
			const dim = this.canvasDimensions;
			if (!dim) return;

			this.innerViewport.localScale = Vector2.one;
			this.innerViewport.localDimensions = dim;

			const parent = this.innerViewport.parent;
			const p = parent.localDimensions;

			const w = p.x - H_PADDING;
			const sx = w / dim.x;
			const h = p.y - V_PADDING;
			const sy = h / dim.y;

			const scale = sx < sy ? sx : sy;
			this.innerViewport.localScale = new Vector2(scale, scale);
			this.innerViewport.center = parent.localCenter;
		});
	}

	render(layerGroup) {
		this.layers.removeAll();
		this.innerViewport.localDimensions = Vector2.zero;

		if (layerGroup) {
			const promises = layerGroup.layers.map((l) => {
				const data = l.imageRect.imageData;
				return createImageBitmap(data);
			});
			Promise.all(promises).then((bitmaps) => {
				const layers = bitmaps.map(bm => new LayerBox(bm));
				layers.forEach((l) => {
					this.layers.add(l);
				});

				const cinfo = layerGroup.canvasInfo;
				let dim;
				if (cinfo) {
					dim = new Vector2(cinfo.width, cinfo.height);
				} else {
					dim = layers[0].localDimensions;
				}
				this.canvasDimensions = dim;
				this.updateDOM();
			});
		}
	}

	updateDOM() {
		this._updateDOM.invoke();
	}

	getImage() {
		const box = this.innerViewport;
		const w = box.localWidth,
			  h = box.localHeight;
		if (!w || !h) {
			return null;
		}

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;

		const context = canvas.getContext("2d");
		this.layers.items.forEach((l) => {
			context.drawImage(l.source, l.localLeft, l.localTop);
		});

		return canvas.toDataURL();
	}

	_initLayer(layer) {
		layer.element.classList.add(CLASSES.layer);
		layer.parent = this.innerViewport;
		const m = new MouseAction(layer.element, this.viewport.element, 
					{ data: layer, 
					  exitOnMouseLeave: false });
		this.layerUserAction.pipe(m);
	}

	_onAdd(layer) {
		this.parent.appendChild(layer.element);
		if (!layer.p_initialized) {
			this._initLayer(layer);
			layer.p_initialized = true;
		}
	}

	_onRemove(layer) {
		this.parent.removeChild(layer.element);
		if (layer.selected) {
			this.layers.deselect(layer);
		} 
	}

	_onSelect(layer) {
		layer.selected = true;
		layer.element.classList.add(CLASSES.selected);

		const len = this.layers.selected.length;
		if (len > 1) {
			const b = this.layers.selected[len-2].element;
			this.parent.insertBefore(layer.element, b);
		} else {
			this.parent.appendChild(layer.element);
		}
	}

	_onDeselect(layer) {
		layer.selected = false;
		layer.element.classList.remove(CLASSES.selected);
	}
}
