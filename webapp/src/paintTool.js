
import { UserActionHandler } from "./action";

export default class {
	constructor(stack) {
		this._stack = stack;
		this._widget = new PaintWidget(this._stack);
	}

	enable(node) {
		this._widget.node = node;
		this._widget.handle(node.layerAction);
	}

	disable() {
		this._widget.stopHandling(this._widget.node.layerAction);
		this._widget.node = null;
	}
}

class PaintWidget extends UserActionHandler {
	constructor(stack) {
		super();

		this._stack = stack;
		this._node = null;
	}

	get node() {
		return this._node;
	}

	set node(val) {
		this._node = val;
	}

	_addPoint(evt) {
		let pos = this._getMousePosition(evt);
		pos = this._layer.box.toLocalPoint(pos);
		this._stroke.addPoint(pos);

		return pos;
	}

	_onStart(evt) {
		this._layer = this._node.layer;
		const canvas = this._layer.canvas;
		this._context = canvas.getContext("2d");
		this._imageData =
			this._context.getImageData(
				0, 0, canvas.width, canvas.height);

		this._stroke = this._node.settings.new("strokes");
		this._strokeSettings = this._stroke.settings.items();

		this._addPoint(evt);
	}

	_onMove(evt) {
		this._addPoint(evt);

		this._context.putImageData(this._imageData, 0, 0);
		this._node.brush.paint(
			this._context,
			this._stroke.points,
			this._strokeSettings);
	}

	_onEnd(evt) {
		const c = this._node.createArraySettingCommand(
			this._node.settings, "strokes", this._stroke, true);

		if (this._stack) {
			this._stack.add(c);
		}
		c.execute();
	}
}
