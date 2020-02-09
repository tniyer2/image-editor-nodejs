
import { clamp } from "../util/util";
import Options from "../util/options";
import { mouseEventToPoint } from "../vector/util";
import Vector2 from "../vector/vector2";
import { ActionHandler } from "../event/actionUtil";
import ZoomAction from "../event/zoomAction";

const DEFAULTS = {
	condition: null,
	factor: 1,
	min: 0,
	max: Infinity,
	zoomOnCursor: false
};

const BASE_FACTOR = -0.001;

export default class extends ActionHandler {
	constructor(box, options) {
		super([ZoomAction]);

		this._box = box;
		this.options = new Options();
		this.options.set(DEFAULTS, options);
	}

	_onZoom(evt) {
		const condition = this.options.get("condition");

		if (!condition || condition(evt)) {
			let scale = this._box.localScaleX;
			const factor = this.options.get("factor"),
				  min = this.options.get("min"),
				  max = this.options.get("max");

			scale += evt.deltaY * BASE_FACTOR * factor;
			scale = clamp(scale, min, max);

			scale = new Vector2(scale, scale);
			if (this.options.get("zoomOnCursor")) {
				let pos = mouseEventToPoint(evt);

				this._box.localScale = Vector2.one;
				const pos1 = this._box.toLocalPoint(pos);
				this._box.localScale = scale;
				const pos2 = this._box.toLocalPoint(pos);

				const diff = pos2.subtract(pos1);
				this._box.localPosition = diff;
			} else {
				this._box.localScale = scale;
			}
		}
	}
}
