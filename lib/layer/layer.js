
import { isObjectLiteral } from "../util/type";
import { extend } from "../util/util";
import { UserActionBridge } from "../event/userActionUtil";
import LayerBox from "./layerBox";

const DEFAULT_PROPERTIES = {
	focused: false,
	selected: false,
	repeats: false
};

export default class Layer {
	constructor(box, properties) {
		if (arguments.length !== 0) {
			if (!(box instanceof LayerBox)) {
				throw new Error("Invalid argument.");
			} else if (!isObjectLiteral(properties)) {
				throw new Error("Invalid argument.");
			}
		}

		this._box = new LayerBox(this);
		if (box) {
			this._box.copyPropertiesOf(box);
		}

		if (properties) {
			this._properties = extend(DEFAULT_PROPERTIES, properties);
		} else {
			this._properties = extend(DEFAULT_PROPERTIES);
		}

		this._action = new UserActionBridge();
	}

	get box() {
		return this._box;
	}

	get action() {
		return this._action;
	}

	get properties() {
		return this._properties;
	}

	render(canvasBox) {
		this._box.parent = canvasBox;
	}

	hasPoint(point) {
		point = this._box.toLocalPoint(point);
		const max = this._box.localDimensions;
		return Boolean(
			point.x > 0 && point.y > 0 &&
				point.x < max.x && point.y < max.y);
	}
}
