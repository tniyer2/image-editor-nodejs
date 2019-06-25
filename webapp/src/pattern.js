
import Enforcer from "./enforcer";
import { extend } from "./utility";
import { Vector2 } from "./geometry";
import { ToolUI } from "./toolUI";
import { Slider } from "./input";

export { SmoothArcPattern, SmoothArcPatternToolUI };

const Pattern = (function(){
	const DEFAULTS = { width: 10, color: [0, 0, 0, 255] };

	return class {
		constructor(options) {
			const ef = new Enforcer(Pattern, this, "Pattern");
			ef.enforceAbstract();
			ef.enforceFunctions(["draw"]);

			this._options = extend(DEFAULTS, options);
		}

		setOptions(options) {
			this._options = extend(this._options, options);
			this._initOptions(options);
		}

		_initOptions(options) {
			if (options.color) {
				const c = options.color;
				this._color = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
			}
		}

		getOptions() {
			return extend(this._options);
		}
	};
})();

const SmoothPattern = (function(){
	const MAX_ANGLE = Math.PI * 2;
	const DEFAULTS = { distance: 25 };

	return class extends Pattern {
		constructor(options) {
			options = extend(DEFAULTS, options);
			super(options);

			const ef = new Enforcer(SmoothPattern, this, "SmoothPattern");
			ef.enforceAbstract();
			ef.enforceFunctions(["_draw"]);
		}

		draw(context, prevPos, pos) {
			let dir = pos.subtract(prevPos);
			const mag = dir.magnitude,
				  distance = Math.max(this._options.width * this._options.distance / 100, 1);
			const t = Math.floor(mag / distance),
				  diff = dir.divide(t);
			
			this._draw(context, prevPos);
			for (let i = 1; i < t; i+=1) {
				let v = prevPos.add(diff.multiply(i));
				this._draw(context, v);
			}
			this._draw(context, pos);
		}

		get _MAX_ANGLE() {
			return MAX_ANGLE;
		}
	};
})();

const SmoothArcPattern = (function(){
	return class extends SmoothPattern {
		_draw(context, pos) {
			context.beginPath();
			context.arc(pos.x, pos.y, this._options.width / 2, 0, this._MAX_ANGLE);
			context.fillStyle = this._color;
			context.fill();
			context.closePath();
		}
	};
})();

class PatternToolUI extends ToolUI {
	constructor(globals) {
		super({ patternOptions: {} });
		this._globals = globals;
	}

	_getPatternOptions() {
		return this.settings.get("patternOptions");
	}

	_setPatternOptions(options) {
		const oldOptions = this._getPatternOptions();
		const newOptions = extend(oldOptions, options);
		this.settings.put("patternOptions", newOptions);
	}
}

const SmoothArcPatternToolUI = (function(){
	const txt_widthSlider = "Width", 
		  txt_smoothSlider = "Smoothness";

	return class extends PatternToolUI {
		_createUI() {
			const d = document.createElement("div");
			const current = this._getPatternOptions();

			const widthSlider = new Slider(current.width, 1, 25, 
										   { text: txt_widthSlider });
			widthSlider.onChange.addListener((v) => {
				this._setPatternOptions({ width: v });
			});
			d.appendChild(widthSlider.root);

			const smoothSlider = new Slider(current.distance, 1, 40, 
											{ text: txt_smoothSlider, 
											  reverse: true });
			smoothSlider.onChange.addListener((v) => {
				this._setPatternOptions({ distance: v });
			});
			d.appendChild(smoothSlider.root);

			const updateColor = (c) => {
				this._setPatternOptions({ color: c.slice() });
			};
			updateColor(this._globals.get("primaryColor"));
			this._globals.addListener("primaryColor", updateColor);

			return d;
		}
	};
})();
