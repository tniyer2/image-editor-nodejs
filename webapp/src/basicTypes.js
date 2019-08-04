
import { isNumber, isType } from "./type";
import { Vector2 } from "./geometry";

export { LayerGroup, ImageLayer, ImageRect };

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
			const data = new ImageData(
				this.imageData.data, this.imageData.width);
			return new ImageRect(data, this.position.x, this.position.y);
		}
	};
})();

class Transform {
	constructor(x=0, y=0, sx=1, sy=1, a=0) {
		this.x = x;
		this.y = y;
		this.scaleX = sx;
		this.scaleY = sy;
		this.angle = a;
	}

	copy() {
		return new Transform(
			this.x, this.y, this.scaleX, this.scaleY, this.angle);
	}
}

class Layer {
	constructor(data, tfm) {
		this.imageRect = data;
		this.transform = tfm;
	}

	copy() {
		const data = this.imageRect ? this.imageRect.copy() : null;
		const tfm = this.transform.copy();
		return new Layer(data, tfm);
	}
}

const ImageLayer = (function(){
	function checkValidImage(image) {
		if (!(image instanceof HTMLImageElement)) {
			throw new Error("image is not an HTMLImageElement");
		} else if (!image.complete) {
			throw new Error("image is not loaded.");
		}
	}

	function getImageData(image) {
		const canvas = document.createElement("canvas");
		const {naturalWidth: w, naturalHeight: h} = image;

		canvas.width = w;
		canvas.height = h;

		const context = canvas.getContext("2d");
		context.drawImage(image, 0, 0);
		const data = context.getImageData(0, 0, w, h);

		return data;
	}

	return class extends Layer {
		constructor(image) {
			checkValidImage(image);
			const data = getImageData(image);
			const rect = new ImageRect(data, 0, 0);

			const tfm = new Transform();

			super(rect, tfm);
		}
	};
})();

class DrawingLayer extends Layer {
	constructor() {
		super(null, new Transform());
	}
}

class LayerGroup {
	constructor(layers, cinfo=null) {
		if (!isType(layers, Array) || !layers.every(l => l instanceof Layer)) {
			throw new Error("Invalid argument.");
		} else if (typeof cinfo !== "object") {
			throw new Error("Invalid argument.");
		}

		this.layers = layers;
		this.canvasInfo = cinfo;
	}

	static get pointColor() {
		return "#f00";
	}

	copy() {
		const layers = this.layers.map(l => l.copy());
		const cinfo = this.canvasInfo === null ? null : 
					  Object.assign({}, this.canvasInfo);
		return new LayerGroup(layers, cinfo);
	}
}
