
import Enforcer from "./enforcer";
import { extend } from "./utility";
import { Vector2 } from "./geometry";
import { ImageDataRect } from "./paint";

export { CirclePattern };

const Pattern = (function(){
	const DEFAULTS = { radius: 20, color: [0, 0, 0, 255] };

	return class {
		constructor(options) {
			const ef = new Enforcer(Pattern, this, "Pattern");
			ef.enforceFunctions(["getRect"]);

			this._options = extend(DEFAULTS, options);
		}

		_initOptions() {
			this._options.radius = Math.trunc(this._options.radius);
		}
	};
})();

class CirclePattern extends Pattern {
	getRect() {
		if (!this._rect) {
			this._rect = this._createRect();
		}

		return new ImageDataRect(this._rect.imageData, this._rect.position.x, this._rect.position.y);
	}

	_createRect() {
		const r = this._options.radius, 
			  color = this._options.color,
			  xCoords = this._getXCoordinates(r);

		console.log("xCoords:", xCoords);

		const arr = [];
		for (let y = 0; y < r; y+=1) {
			const xMax = xCoords[y];
			for (let x = 0; x < r; x+=1) {
				const c = x < xMax ? color : [0, 0, 0, 0];
				arr.push.apply(arr, c);
			}
		}

		const uint8 = new Uint8ClampedArray(arr),
			  imageData = new ImageData(uint8, r, r),
			  brRect = new ImageDataRect(imageData, 0, 0);

		const tlRect = brRect.flip(true, true), 
			  trRect = brRect.flip(false, true), 
			  blRect = brRect.flip(true, false);

		tlRect.position = tlRect.position.subtract(new Vector2(brRect.width, brRect.height));
		trRect.position = trRect.position.subtract(new Vector2(0, brRect.height));
		blRect.position = blRect.position.subtract(new Vector2(brRect.width, 0));

		const rect = ImageDataRect.combine(tlRect, trRect, blRect, brRect);
		rect.position = new Vector2(r, r);

		return rect;
	}

	_getXCoordinates(radius) {
		radius = radius/2;
		let x = radius, 
			y = 0, 
			d = 3 - 2 * radius; 
		const arr = [x];

	    while (x >= y) {    
	        y+=1; 

	        if (d > 0) {
	            x-=1;  
	            d = d + 4 * (y - x) + 10; 
	        } 
	        else {
	            d = d + 4 * y + 6; 
	        }

	        arr.push(x);
	    }

	    const rev = arr.slice().reverse().map(a => radius - a);
	    return arr.concat(rev);
	}
}
