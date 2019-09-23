
import { MouseAction, UserActionPiper, ZoomAction } from "./action";
import ZoomWidget from "./zoomWidget";
import { Vector2 } from "./geometry";
import { Collection, BASE, SELECT } from "./collection";

const BASE2 = Object.assign({}, BASE);
BASE2.clear = "removeAll";
const LayerCollection = Collection([BASE2, SELECT]);

export default class {
	constructor(editor, tab) {
		this._editor = editor;
		this.tab = tab;

		this.layers = new LayerCollection();
		this._addLayerListeners();

		this.layers.action = new UserActionPiper();

		this._initZoomWidget();
	}

	_addLayerListeners() {
		this.layers.onAdd.addListener((layer) => {
			this.tab.layerParent.appendChild(layer.box.element);
			layer.box.parent = this.tab.innerViewport;
			if (layer.canvas.parentElement !== layer.box.element) {
				layer.box.element.appendChild(layer.canvas);
			}

			layer.p_action = new MouseAction(
				layer.box.element,
				this.tab.viewport.element,
				{ data: layer,
				  exitOnMouseLeave: false });
			this.layers.action.pipe(layer.p_action);
		});

		this.layers.onRemove.addListener((layer) => {
			this.tab.layerParent.removeChild(layer.box.element);
			layer.box.parent = null;

			if (layer.selected) {
				this.layers.deselect(layer);
			} 
		});

		this.layers.onSelect.addListener((layer) => {
			layer.selected = true;

			const len = this.layers.selected.length;
			if (len > 1) {
				const b = this.layers.selected[len-2].box.element;
				this.tab.layerParent.insertBefore(layer.box.element, b);
			} else {
				this.tab.layerParent.appendChild(layer.box.element);
			}
		});

		this.layers.onDeselect.addListener((layer) => {
			layer.selected = false;
		});
	}

	_initZoomWidget() {
		const options = {
			factor: 0.2,
			condition: () => {
				const c = this._editor.stack.current;
				return !c || !c.open;
			}
		};

		this._zoomWidget = 
			new ZoomWidget(this.tab.innerViewport, options);

		const action = new ZoomAction(this.tab.viewport.element);
		this._zoomWidget.handle(action);
	}

	render(layerGroup) {
		this.layers.removeAll();
		this.layers.action.clear();

		if (layerGroup) {
			layerGroup.layers.forEach((l) => {
				this.layers.add(l);
			});

			const cinfo = layerGroup.canvasInfo;
			const dim = new Vector2(cinfo.width, cinfo.height);

			this.tab.innerViewport.localScale = Vector2.one;
			this.tab.innerViewport.localDimensions = dim;
			this.tab.updateDOM();
		} else {
			this.tab.innerViewport.localDimensions = Vector2.zero;
		}
	}

	getFinalImage() {
		const box = this.tab.innerViewport,
			  w = box.rawWidth,
			  h = box.rawHeight;
		if (!w || !h) {
			return null;
		}

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;

		const context = canvas.getContext("2d");

		this.layers.items.forEach((l) => {
			const b = l.box;

			context.setTransform(1,0,0,1, b.localLeft, b.localTop);
			context.rotate(b.localAngle);

			context.drawImage(
				l.canvas, 0, 0, b.localWidth, b.localHeight);

			context.setTransform(1,0,0,1,0,0);
		});

		return canvas;
	}
}
