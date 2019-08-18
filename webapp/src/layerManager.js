
import { AddToEventLoop } from "./utility";
import { MouseAction, UserActionPiper, ZoomAction } from "./action";
import { ZoomWidget } from "./widget";
import { Vector2 } from "./geometry";
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
{ layer: "layer", 
  selected: "selected" };
const H_PADDING = 20,
	  V_PADDING = 20;

export default class {
	constructor(editor, tab) {
		this._editor = editor;
		this.tab = tab;

		const opt = {};
		CALLBACK_PROPS.forEach((b, i) => {
		 	opt[b] = this[FNAMES[i]].bind(this);
		 });
		this.layers = new (Collection([BASE2, SELECT]))(opt);

		this.layerUserAction = new UserActionPiper();

		this._initZoomWidget();
		this._initUpdateDOM();
	}

	_initZoomWidget() {
		this._zoomAction = new ZoomAction(this.tab.viewport.element);

		this._zoomWidget = new ZoomWidget(this.tab.innerViewport, 
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

			this.tab.innerViewport.localScale = Vector2.one;
			this.tab.innerViewport.localDimensions = dim;

			const parent = this.tab.innerViewport.parent;
			const p = parent.localDimensions;

			const w = p.x - H_PADDING;
			const sx = w / dim.x;
			const h = p.y - V_PADDING;
			const sy = h / dim.y;

			const scale = sx < sy ? sx : sy;
			this.tab.innerViewport.localScale = new Vector2(scale, scale);
			this.tab.innerViewport.center = parent.localCenter;
		});
	}

	render(layerGroup) {
		this.layers.removeAll();
		this.tab.innerViewport.localDimensions = Vector2.zero;

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
		const box = this.tab.innerViewport;
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
		layer.parent = this.tab.innerViewport;
		const m = new MouseAction(layer.element, this.tab.viewport.element, 
					{ data: layer, 
					  exitOnMouseLeave: false });
		this.layerUserAction.pipe(m);
	}

	_onAdd(layer) {
		this.tab.layerParent.appendChild(layer.element);
		if (!layer.p_initialized) {
			this._initLayer(layer);
			layer.p_initialized = true;
		}
	}

	_onRemove(layer) {
		this.tab.layerParent.removeChild(layer.element);
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
			this.tab.layerParent.insertBefore(layer.element, b);
		} else {
			this.tab.layerParent.appendChild(layer.element);
		}
	}

	_onDeselect(layer) {
		layer.selected = false;
		layer.element.classList.remove(CLASSES.selected);
	}
}
