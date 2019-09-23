
import { isUdf, isNumber, isType, isArray } from "./type";
import { Vector2, Box } from "./geometry";

export { LayerGroup, Layer, ImageRect };

const ImageRect = (function(){
	function blend(oldColor, newColor) {
		return newColor[3] ? newColor : oldColor;
	}

	return class {
		constructor(imageData, x, y) {
			if (!isNumber(x)) {
				throw new Error("Invalid argument.");
			} else if (!isNumber(y)) {
				throw new Error("Invalid argument.");
			}

			this.imageData = imageData;
			this.position = new Vector2(x, y);
		}

		static combine(rects) {
			const l = rects.length;
			if (l < 2) {
				throw new Error("Invalid argument 'rects'");
			} else if (!rects.every(r => isType(r, ImageRect))) {
				throw new Error("Invalid argument 'rects'");
			}

			let left, top, right, bottom;
			rects.forEach((rect, i) => {
				const {x, y} = rect.position;

				if (!i || x < left) {
					left = x;
				}
				if (!i || y < top) {
					top = y;
				}
				const r = x + rect.imageData.width;
				if (!i || r > right) {
					right = r;
				}
				const b = y + rect.imageData.height;
				if (!i || b > bottom) {
					bottom = b;
				}
			});

			const boundingRect = new ImageRect(
				right - left, bottom - top, left, top);

			rects.forEach((rect) => {
				const originY = rect.position.y - top,
					  originX = rect.position.x - left;
				const { height, width } = rect.imageData;

				for (let y = 0; y < height; y+=1) {
					for (let x = 0; x < width; x+=1) {
						const bx = x + originY,
							  by = y + originX;
						const color1 = boundingRect.getPixel(bx, by),
							  color2 = rect.getPixel(x, y);
						const newColor = blend(color1, color2);

						boundingRect.setPixel(newColor, bx, by);
					}
				}
			});

			return boundingRect;
		}

		_getIndex(x, y) {
			return ((y * this.imageData.width) + x) * 4;
		}

		_verifyCoordinate(x, y) {
			if (!(Number.isInteger(x) && x >= 0 && x < this.imageData.width)) {
				throw new Error("Invalid argument.");
			} else if (!(Number.isInteger(y) && y >= 0 && y < this.imageData.height)) {
				throw new Error("Invalid argument.");
			}
		}

		getPixel(x, y) {
			this._verifyCoordinate(x, y);

			const i = this._getIndex(x, y);
			const color = this.imageData.data.subarray(i, i+4);
			return color;
		}

		setPixel(color, x, y) {
			this._verifyCoordinate(x, y);

			const i = this._getIndex(x, y);
			this.imageData.data.set(color, i);
		}

		flip(flipx, flipy) {
			if (typeof flipx !== "boolean") {
				throw new Error("Invalid argument.");
			} else if (typeof flipy !== "boolean") {
				throw new Error("Invalid argument.");
			}

			const {width, height} = this.imageData;
			const newData = new ImageData(width, height);
			const rect = new ImageRect(
				newData, this.position.y, this.position.x);

			const width2 = width - 1;
			const height2 = height - 1;

			for (let y = 0; y < height; y+=1) {
				for (let x = 0; x < width; x+=1) {
					const tx = flipx ? width2 - x : x, 
						  ty = flipy ? height2 - y : y;
					const p = this.getPixel(tx, ty);
					rect.setPixel(p, x, y);
				}
			}

			return rect;
		}

		drawOn(context) {
			context.putImageData(
				this.imageData, this.position.x, this.position.y);
		}

		getOverlappingData(context) {
			return context.getImageData(
				this.position.x, this.position.y,
				this.imageData.width, this.imageData.height);
		}

		getOverlappingRect(context) {
			const data = this.getOverlappingData(context);
			return new ImageRect(data, this.position.x, this.position.y);
		}

		copy() {
			return new ImageRect(
				this.imageData.data, this.position.x, this.position.y);
		}

		deepcopy() {
			const data = new ImageData(
				this.imageData.data, this.imageData.width);
			return new ImageRect(data, this.position.x, this.position.y);
		}
	};
})();

const Layer = (function(){
	const CLASSES = {
		layer: "layer",
		selected: "selected" };

	function createCanvas(source, width, height) {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext("2d");
		context.drawImage(source, 0, 0);

		return canvas;
	}

	return class {
		constructor(source, box) {
			if (source instanceof HTMLImageElement) {
				if (!source.complete) {
					throw new Error("Invalid argument.");
				}
				this.canvas =
					createCanvas(
						source,
						source.naturalWidth,
						source.naturalHeight);
			} else if (source instanceof HTMLCanvasElement) {
				this.canvas = source;
			} else {
				throw new Error("Invalid argument.");
			}

			const d = document.createElement("div");
			d.classList.add(CLASSES.layer);
			this.box = new Box(d);
			this.box.setOriginCenter();

			this.box.rawWidth = this.canvas.width;
			this.box.rawHeight = this.canvas.height;

			if (!isUdf(box)) {
				if (!(box instanceof Box)) {
					throw new Error("Invalid argument.");
				}
				this.box.localPosition = box.localPosition;
				this.box.localScale = box.localScale;
				this.box.localAngle = box.localAngle;
			}

			this.box.element.appendChild(this.canvas);

			this._selected = false;
		}

		get selected() {
			return this._selected;
		}

		set selected(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}
			this.box.element.classList
				.toggle(CLASSES.selected, val);
			this._selected = val;
		}

		copy() {
			return new Layer(this.canvas, this.box);
		}

		deepcopy() {
			const canvas =
				createCanvas(
					this.canvas,
					this.canvas.width,
					this.canvas.height);

			return new Layer(canvas, this.box);
		}
	};
})();

class LayerGroup {
	constructor(layers, cinfo={}) {
		if (!isArray(layers) || !layers.every(l => l instanceof Layer)) {
			throw new Error("Invalid argument.");
		} else if (typeof cinfo !== "object") {
			throw new Error("Invalid argument.");
		}

		this.layers = layers.slice();

		if (!isNumber(cinfo.width) || !isNumber(cinfo.height)) {
			const v = this.layers[0].box.localDimensions;
			cinfo.width = v.x;
			cinfo.height = v.y;
		}
		this.canvasInfo = cinfo;
	}

	static get pointColor() {
		return "#f00";
	}

	copy(arr) {
		const udf = isUdf(arr);
		if (!udf && !isArray(arr)) {
			throw new Error("Invalid argument.");
		}

		const layers = this.layers.map((l, i) => {
			if (udf || !arr.find(j => j === i)) {
				return l.copy();
			} else {
				return l.deepcopy();
			}
		});

		let cinfo;
		if (this.canvasInfo) {
			cinfo = Object.assign({}, this.canvasInfo);	
		} else {
			cinfo = null;
		}

		return new LayerGroup(layers, cinfo);
	}
}
