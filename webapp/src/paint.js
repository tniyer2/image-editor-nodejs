
import { addGetter, extend, init, clamp, isUdf } from "./utility";
import { Box, Vector2 } from "./geometry";
import { Command } from "./command";
import { Widget } from "./widget";
import { Tool } from "./tool";

export { ImageDataRect, PaintTool };

class ImageDataRect {
	constructor() {
		let imageData, x, y, width, height;
		if (arguments[0] instanceof ImageData) {
			[imageData, x, y] = arguments;
		} else if (typeof arguments[0] === "number") {
			[width, height, x, y] = arguments;
			imageData = new ImageData(width, height);
			imageData.data.fill(0);
		} else {
			throw new Error("invalid arguments:", arguments);
		}

		addGetter(this, "imageData", imageData);

		this.position = new Vector2(x, y);

		addGetter(this, "width", imageData.width);
		addGetter(this, "height", imageData.height);
	}

	static combine(...rects) {
		const rLen = rects.length;
		if (rLen < 2) {
			throw new Error("invalid arguments:", arguments);
		}

		let left, top, right, bottom;
		for (let i = 0; i < rLen; i+=1) {
			const r = rects[i],
				  x = r.position.x,
				  y = r.position.y;

			if (!i || x < left) {
				left = x;
			}
			if (!i || y < top) {
				top = y;
			}
			const rr = x + r.width;
			if (!i || rr > right) {
				right = rr;
			}
			const b = y + r.height;
			if (!i || b > bottom) {
				bottom = b;
			}
		}

		const width  = right - left,
			  height = bottom - top;
		const bigRect = new ImageDataRect(width, height, left, top);

		rects.forEach((r) => {
			const relTop = (r.position.y - top),
				  relLeft = (r.position.x - left);

			for (let y = 0; y < r.height; y+=1) {
				for (let x = 0; x < r.width; x+=1) {
					const bx = x + relLeft,
						  by = y + relTop;

					const oldColor = bigRect.getPixel(bx, by),
						  newColor = r.getPixel(x, y);
					const b = ImageDataRect._blend(oldColor, newColor);

					bigRect.setPixel(b, bx, by);
				}
			}
		});

		return bigRect;
	}

	static _blend(oldColor, newColor) {
		return newColor[3] ? newColor : oldColor;
	}

	getPixel(x, y) {
		const offset = this._getOffset(x, y);
		return this._imageData.data.subarray(offset, offset+4);
	}

	setPixel(color, x, y) {
		const offset = this._getOffset(x, y);
		try {
			this._imageData.data.set(color, offset);
		} catch (e) {/*ignore*/}
	}

	_getOffset(x, y) {
		return ((y * this._width) + x) * 4;
	}

	flip(flipX, flipY) {
		const rect = new ImageDataRect(this._width, this._height, this.position.x, this.position.y);

		for (let y = 0; y < this._height; y+=1) {
			const baseX = this._width - 1;
			const baseY = this._height - 1;
			for (let x = 0; x < this._width; x+=1) {
				const fromX = flipX ? baseX - x : x, 
					  fromY = flipY ? baseY - y : y;
				const p = this.getPixel(fromX, fromY);
				rect.setPixel(p, x, y);
			}
		}

		return rect;
	}

	drawOn(context) {
		context.putImageData(this._imageData, this.position.x, this.position.y);
	}

	getOverlappingData(context) {
		return context.getImageData(this.position.x, this.position.y, this._width, this._height);
	}

	getOverlappingRect(context) {
		return new ImageDataRect(this.getOverlappingData(context), this.position.x, this.position.y);
	}
}

class PaintCommand extends Command {
	constructor(layer) {
		super(Command.continuous);

		this._layer = layer;
		this._context = this._layer.canvas.getContext("2d");

		const x = this._layer.innerLeft,
			  y = this._layer.innerTop,
			  imageData = this._context.getImageData(x, y, this._layer.width, this._layer.height);
		this._initialRect = new ImageDataRect(imageData, x, y);
	}

	_execute(rect) {
		rect.drawOn(this._context);
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

class PaintWidget extends Widget {
	constructor(stack, pattern, options) {
		super(options);
		this._stack = stack;
		this._pattern = pattern;
	}

	_onClick(mdEvt, muEvt, layer) {
		this._onStartWrapper(mdEvt, layer);
		this._onMoveWrapper(mdEvt, layer);
		this._onEndWrapper(muEvt, layer);
	}

	_onStart(evt, layer) {
		this._onStartWrapper(evt, layer);
	}
	_onMove(evt, layer) {
		this._onMoveWrapper(evt, layer);
	}
	_onEnd(evt, layer) {
		this._onEndWrapper(evt, layer);
	}

	_onStartWrapper(evt, layer) {
		this._command = new PaintCommand(layer);
		this._stack.add(this._command);
	}

	_onMoveWrapper(evt, layer) {
		const pos = this._getMousePosition(evt)
			  		.subtract(layer.origin)
			  		.multiply(this._getScale())
			  		.subtract(layer.position);

		const rect = this._pattern.getRect();
		rect.position = pos.subtract(rect.position);

		const context = layer.canvas.getContext("2d");
		const oldRect = rect.getOverlappingRect(context);
		const blend = ImageDataRect.combine(oldRect, rect);

		this._command.execute(blend);
	}

	_onEndWrapper(evt, layer) {
		this._command.close();
	}
}

class PaintTool extends Tool {
	constructor(lm, stack, pattern, options) {
		super(lm, stack, options);

		this._widget = new PaintWidget(this._stack, pattern, 
					   { scale: () => this._layerManager.inverseScale });
	}

	_enable() {
		this._widget.handle(this._layerManager.layerMouseAction);
	}

	_disable() {
		this._widget.stopHandling(this._layerManager.layerMouseAction);
	}
}
