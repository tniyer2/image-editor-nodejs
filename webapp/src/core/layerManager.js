
import { isArray } from "../util/type";
import { copyCanvas } from "../util/util";
import { mouseEventToPoint } from "../vector/util";
import Vector2 from "../vector/vector2";

import MouseAction from "../event/mouseAction";
import KeyAction from "../event/keyAction";
import { UserActionBridge } from "../event/userActionUtil";

import ZoomAction from "../event/zoomAction";
import ZoomWidget from "../widgets/zoomWidget";

import Layer from "../layer/layer";

export default class LayerManager {
	constructor(editor, tab) {
		this._editor = editor;
		this._tab = tab;

		this._renderables = null;

		this._initActions();
		this._listenUserEvents();
		this._initZoomWidget();
	}

	get tab() {
		return this._tab;
	}

	get layerAction() {
		return this._layerAction;
	}

	_initActions() {
		const canvas = this._tab.mainCanvas.element;

		this._canvasMouseAction =
			new MouseAction(
				canvas,
				canvas,
				{ exitOnMouseLeave: false });

		this._canvasKeyAction =
			new KeyAction(canvas);

		this._layerAction = new UserActionBridge();
	}

	_findHasPoint(layer, point) {
		if (layer === null) {
			const arr = this._renderables;
			if (!arr) {
				return null;
			}
			return arr.slice().reverse()
				.find(renderable => 
					renderable instanceof Layer &&
						this._findHasPoint(renderable, point))
							|| null;
		} else {
			const found = layer.box.children.reverse()
				.find(c => this._findHasPoint(c.layer, point));
			if (found) {
				return found;
			} else if (layer.hasPoint(point)) {
				return layer;
			} else {
				return null;
			}
		}
	}

	_listenUserEvents() {
		this._canvasMouseAction.onClick.addListener((downEvt, upEvt) => {
			const
				point = mouseEventToPoint(downEvt),
				rend = this._findHasPoint(null, point);
			if (rend) {
				rend.action.triggerEvent("onClick", [downEvt, upEvt]);
				this._layerAction.triggerEvent("onClick", [downEvt, upEvt, rend]);
			}
		});

		let cur = null;
		["onStart", "onMove", "onEnd"].forEach((eventName, i) => {
			this._canvasMouseAction[eventName].addListener((evt) => {
				if (i === 0) {
					const point = mouseEventToPoint(evt);
					cur = this._findHasPoint(null, point);
				}
				if (cur) {
					cur.action.triggerEvent(eventName, [evt]);
					this._layerAction.triggerEvent(eventName, [evt, cur]);
				}
			});
		});

		this._canvasKeyAction.onKeyDown.addListener((evt, data) => {
			/*TO BE IMPLEMENTED*/
		});

		this._canvasKeyAction.onKeyUp.addListener((evt, data) => {
			/*TO BE IMPLEMENTED*/
		});
	}

	_initZoomWidget() {
		const options = {
			factor: 0.2,
			condition: () => {
				const c = this._editor.stack.current;
				return Boolean(!c || !c.open);
			}
		};

		this._zoomWidget = 
			new ZoomWidget(this._tab.innerViewport, options);

		const action = new ZoomAction(this._tab.viewport.element);
		this._zoomWidget.handle(action);
	}

	setDimensions(dimensions) {
		if (!(dimensions instanceof Vector2)) {
			throw new Error("Invalid argument.");
		}

		const canvas = this._tab.mainCanvas;
		canvas.rawDimensions = dimensions;
		canvas.element.width = dimensions.x;
		canvas.element.height = dimensions.y;

		this._tab.innerViewport.rawDimensions = dimensions;
		this._tab.updateDOM();
	}

	_clear() {
		const
			canvas = this._tab.mainCanvas.element,
			ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		this._renderables = null;
	}

	update(renderables) {
		if (!isArray(renderables)) {
			throw new Error("Invalid argument.");
		}
		renderables = renderables.slice();

		this._clear();

		renderables.forEach((renderable) => {
			renderable.render(this._tab.mainCanvas);
		});
		this._renderables = renderables;
	}

	getFinalImage() {
		return this._tab.mainCanvas.element;
	}
}
