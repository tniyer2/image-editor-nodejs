
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

		this.layerUserAction = new UserActionPiper();

		this._initZoomWidget();
	}

	_addLayerListeners() {
		this.layers.onAdd.addListener((layer) => {
			this.tab.layerParent.appendChild(layer.box.element);
			layer.box.parent = this.tab.innerViewport;

			layer.p_action = new MouseAction(
				layer.box.element,
				this.tab.viewport.element,
				{ data: layer,
				  exitOnMouseLeave: false });
			this.layerUserAction.pipe(layer.p_action);
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
		const action = new ZoomAction(this.tab.viewport.element);

		this._zoomWidget = new ZoomWidget(this.tab.innerViewport,
		{ factor: 0.2, 
		  condition: () => {
			const c = this._editor.stack.current;
			return !c || !c.open;
		  } });

		this._zoomWidget.handle(action);
	}

	render(layerGroup) {
		this.layers.removeAll();
		this.layerUserAction.clear();

		if (layerGroup) {
			layerGroup.layers.forEach((l) => {
				this.layers.add(l);
			});

			const cinfo = layerGroup.canvasInfo;
			let dim;
			if (cinfo) {
				dim = new Vector2(cinfo.width, cinfo.height);
			} else {
				dim = layerGroup.layers[0].box.localDimensions;
			}

			this.tab.innerViewport.localScale = Vector2.one;
			this.tab.innerViewport.localDimensions = dim;
			this.tab.updateDOM();
		} else {
			this.tab.innerViewport.localDimensions = Vector2.zero;
		}
	}

	getFinalImage() {
		const box = this.tab.innerViewport;
		if (!box.rawWidth || !box.rawHeight) {
			return null;
		}

		const canvas = document.createElement("canvas");
		canvas.width = box.rawWidth;
		canvas.height = box.rawHeight;

		const context = canvas.getContext("2d");
		this.layers.items.forEach((l) => {
			context.drawImage(l.canvas, l.box.localLeft, l.box.localTop);
		});

		return canvas;
	}
}
