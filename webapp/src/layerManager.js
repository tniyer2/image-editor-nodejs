
import { MouseAction, UserActionPiper, ZoomAction } from "./action";
import { ToggleItemCommand } from "./collectionWidgets";
import { ZoomWidget } from "./widget";
import { Anchor, Box } from "./geometry";
import { Collection, BASE, SELECT } from "./collection";

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

export default class {
	constructor(editor, vp, ivp) {
		this._editor = editor;

		this.viewport = new Anchor(vp);
		this.innerViewport = new Box(ivp, this.viewport);

		const opt = {};
		CALLBACK_PROPS.forEach((b, i) => {
		 	opt[b] = this[FNAMES[i]].bind(this);
		 });
		this.layers = new (Collection([BASE, SELECT]))(opt);

		const d = document.createElement("div");
		d.classList.add(CLASSES.layers);
		ivp.appendChild(d);
		this.parent = d;

		this.layerUserAction = new UserActionPiper();

		this._initZoomWidget();
	}

	_initZoomWidget() {
		this._zoomWidget = new ZoomWidget(this.innerViewport, 
		{ factor: 0.2, condition: () => {
			const c = this._editor.stack.current;
			return !c || !c.open;
		} });
		const action = new ZoomAction(this.viewport.element);
		this._zoomWidget.handle(action);
	}

	addLayer(layer) {
		const c = new ToggleItemCommand(this.layers, layer, true);
		this._editor.stack.add(c);
		c.execute();
	}

	_initLayer(layer) {
		layer.element.classList.add(CLASSES.layer);
		layer.parent = this.innerViewport;
		if (this.layers.items.length === 1) {
			this.innerViewport.localDimensions = layer.localDimensions;
		}
		const m = new MouseAction(layer.element, this.viewport.element, 
					{ data: layer, 
					  loop: true, 
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
