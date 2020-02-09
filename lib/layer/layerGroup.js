
import { isUdf, isNumber, isObjectLiteral, isArray } from "../util/type";
import Layer from "./layer";

export default class LayerGroup {
	constructor(layers, info) {
		if (!isArray(layers) ||
			!layers.every(l => l instanceof Layer)) {
			throw new Error("Invalid argument.");
		}

		if (isUdf(info)) {
			info = {};
		} else if (isObjectLiteral(info)) {
			info = Object.assign({}, info);
		} else {
			throw new Error("Invalid argument.");
		}

		this._layers = layers.slice();

		if (!isNumber(info.width) || !isNumber(info.height)) {
			const first = this._layers[0].box.localDimensions;
			info.width = first.x;
			info.height = first.y;
		}
		this._info = info;
	}

	static get pointColor() {
		return "#f00";
	}

	get layers() {
		return this._layers.slice();
	}

	get info() {
		return this._info;
	}

	copy(arr) {
		const udf = isUdf(arr);
		if (!udf && !isArray(arr)) {
			throw new Error("Invalid argument.");
		}

		const layers = this._layers.map((l, i) => {
			if (udf || !arr.includes(i)) {
				return l.copy();
			} else {
				return l.deepcopy();
			}
		});

		const info = Object.assign({}, this._info);	

		return new LayerGroup(layers, info);
	}
}
