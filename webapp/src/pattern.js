
import Enforcer from "./enforcer";
import { extend } from "./utility";
import { Vector2 } from "./geometry";

export { CirclePattern };

const Pattern = (function(){
	const DEFAULTS = { width: 10, minDistance: 5, color: "#ccc" };

	return class {
		constructor(options) {
			const ef = new Enforcer(Pattern, this, "Pattern");
			ef.enforceAbstract();
			ef.enforceFunctions(["draw"]);

			this._options = extend(DEFAULTS, options);
		}
	};
})();

class SmoothPattern extends Pattern {
	constructor(options) {
		super(options);

		const ef = new Enforcer(SmoothPattern, this, "SmoothPattern");
		ef.enforceAbstract();
		ef.enforceFunctions(["_draw"]);
	}

	draw(context, prevPos, pos) {
		let dir = pos.subtract(prevPos);
		const mag = dir.magnitude, 
			  t = Math.floor(mag / this._options.minDistance),
			  diff = dir.divide(t);
		
		this._draw(context, prevPos);
		for (let i = 0; i <= t; i+=1) {
			let v = prevPos.add(diff.multiply(i));
			this._draw(context, v);
		}
		this._draw(context, pos);
	}
}

const CirclePattern = (function(){
	const MAX_ANGLE = Math.PI * 2;
	const DEFAULTS = {};

	return class extends SmoothPattern {
		constructor(options) {
			options = extend(DEFAULTS, options);
			super(options);
			this._initOptions();
		}

		_initOptions() {
			this._radius = this._options.width / 2;
		}

		_draw(context, pos) {
			context.beginPath();
			context.arc(pos.x, pos.y, this._radius, 0, MAX_ANGLE);
			context.fillStyle = this._options.color;
			context.fill();
			context.closePath();
		}
	};
})();
