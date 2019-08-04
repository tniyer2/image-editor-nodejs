
import { Command } from "./command";
import { CanvasWidget } from "./widget";
import { ImageRect } from "./basicTypes";

export { PaintTool };

class PaintCommand extends Command {
	constructor(layer) {
		super(Command.CONTINUOUS);

		this._layer = layer;
		this._context = this._layer.canvas.getContext("2d");

		const x = this._layer.innerLeft,
			  y = this._layer.innerTop,
			  w = this._layer.innerWidth,
			  h = this._layer.innerHeight;
		const imageData = this._context.getImageData(x, y, w, h);
		this._initialRect = new ImageRect(imageData, x, y);
	}

	_execute(pattern, prevPos, pos) {
		pattern.draw(this._context, prevPos, pos);
	}

	_close() {
		const rect = this._initialRect;
		if (rect) {
			this._finalRect = rect.getOverlappingRect(this._context);
		}
	}

	_undo() {
		const rect = this._initialRect;
		if (rect) {
			rect.drawOn(this._context);
		}
	}

	_redo() {
		const rect = this._finalRect;
		if (rect) {
			rect.drawOn(this._context);
		}
	}
}

class PaintWidget extends CanvasWidget {
	constructor(stack, pattern) {
		super();

		this._stack = stack;
		this._pattern = pattern;
	}

	_onStart(evt, layer) {
		this._command = new PaintCommand(layer);
		if (this._stack) {
			this._stack.add(this._command);
		}

		this._prevPosition = this._getMousePosition(evt, layer);
	}

	_onMove(evt, layer) {
		const pos = this._getMousePosition(evt, layer);

		this._command.execute(this._pattern, this._prevPosition, pos);
		this._prevPosition = pos;
	}

	_onEnd(evt, layer) {
		this._command.close();
	}

	_onClick(mdEvt, muEvt, layer) {
		this._onStart(mdEvt, layer);
		this._onMove(mdEvt, layer);
		this._onEnd(muEvt, layer);
	}
}

class PaintTool {
	constructor(editor, pattern) {
		this._editor = editor;
		this._pattern = pattern;

		this._widget = new PaintWidget(this._editor.stack, this._pattern);
	}

	enable() {
		this._widget.handle(this._editor.layerManager.layerUserAction);
	}

	disable() {
		this._widget.stopHandling(this._editor.layerManager.layerUserAction);
	}
}
