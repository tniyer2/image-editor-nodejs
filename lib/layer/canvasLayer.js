
import { copyCanvas } from "../util/util";
import Layer from "./layer";

export default class CanvasLayer extends Layer {
	constructor(canvas, box, properties) {
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("Invalid argument.");
		}

		if (arguments.length === 1) {
			super();
		} else {
			super(box, properties);
		}

		this._canvas = canvas;
		this._box.rawWidth = this._canvas.width;
		this._box.rawHeight = this._canvas.height;
	}

	get canvas() {
		return this._canvas;
	}

	render(canvasBox) {
		super.render(canvasBox);

		const
			ctx = canvasBox.element.getContext("2d"),
			position = this._box.localPosition,
			scale = this._box.localScale,
			angle = this._box.angle,
			dimensions = this._box.rawDimensions,
			pivot = this._box.calcLocalPivot();

		if (this._properties.repeats === true) {
			for (let x=-1; x<=1; x+=1) {
				for (let y=-1; y<=1; y+=1) {
					const
						offset = dimensions.multiply(x, y),
						translate = position.add(offset);
					this._render(
						ctx, translate, scale,
							angle, dimensions, pivot);
				}
			}
		} else {
			this._render(
				ctx, position, scale,
					angle, dimensions, pivot);
		}
	}

	_render(ctx, position, scale, angle, dimensions, pivot) {
		const translate = position.add(pivot);

		ctx.setTransform(1,0,0,1, translate.x, translate.y);
		ctx.rotate(angle);
		ctx.scale(scale.x, scale.y);

		ctx.drawImage(
			this._canvas, -pivot.x, -pivot.y,
				dimensions.x, dimensions.y);
	}

	copy() {
		return new CanvasLayer(
			this._canvas, this._box, this._properties);
	}

	deepcopy() {
		const newCanvas = copyCanvas(this._canvas);
		return new CanvasLayer(
			newCanvas, this._box, this._properties);
	}
}
