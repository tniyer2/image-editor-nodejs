
import { extend } from "./utility";
import ToolUI from "./toolUI";
import { Slider } from "./input";
import { addOptions } from "./options";

export { SmoothCirclePattern, SmoothCirclePatternToolUI };

const Pattern = (function(){
	const DEFAULTS = { width: 10, color: [0, 0, 0, 255] };

	return class {
		constructor(options) {
			addOptions(this);
			this._options.addListener("color", (c) => {
				this._color = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
			});
			this._options.set(DEFAULTS, options);
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
		}

		get _MAX_ANGLE() {
			return MAX_ANGLE;
		}

		draw(context, prevPos, pos) {
			let dir = pos.subtract(prevPos);
			const mag = dir.magnitude;

			let distance = this._options.get("width") * this._options.get("distance") / 100;
			distance = Math.max(distance, 1);

			const t = Math.floor(mag / distance),
				  diff = dir.divide(t);
			
			this._draw(context, prevPos);
			for (let i = 1; i < t; i+=1) {
				let v = prevPos.add(diff.multiply(i));
				this._draw(context, v);
			}
			this._draw(context, pos);
		}
	};
})();

class SmoothCirclePattern extends SmoothPattern {
	_draw(context, pos) {
		context.beginPath();
		context.arc(pos.x, pos.y, this._options.get("width") / 2, 0, this._MAX_ANGLE);
		context.fillStyle = this._color;
		context.fill();
		context.closePath();
	}
}

class PatternToolUI extends ToolUI {
	constructor(settings, patternSettings, globals) {
		super();
		this._settings = settings;
		this._patternSettings = patternSettings;
		this._globals = globals;
	}
}

const SmoothCirclePatternToolUI = (function(){
	const txt_widthSlider = "Width", 
		  txt_smoothSlider = "Smoothness";

	return class extends PatternToolUI {
		_createUI() {
			const d = document.createElement("div");

			const widthSlider = new Slider(this._patternSettings.get("width"), 1, 25, 
										   { text: txt_widthSlider });
			widthSlider.onChange.addListener((val) => {
				this._patternSettings.put("width", val);
			});
			d.appendChild(widthSlider.root);

			const smoothSlider = new Slider(this._patternSettings.get("distance"), 1, 40, 
											{ text: txt_smoothSlider, 
											  reverse: true });
			smoothSlider.onChange.addListener((val) => {
				this._patternSettings.put("distance", val);
			});
			d.appendChild(smoothSlider.root);

			const updateColor = (val) => {
				this._patternSettings.put("color", val.slice());
			};
			updateColor(this._globals.get("primaryColor"));
			this._globals.addListener("primaryColor", updateColor);

			return d;
		}
	};
})();
