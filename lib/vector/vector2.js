
import { isNumber, isType } from "../util/type";
import { toPrecision } from "../util/util";

const PRECISION = 12,
	  DEG_TO_RAD = Math.PI / 180,
	  ANGLE_OFFSET = Math.PI / 2;

export default class Vector2 {
    constructor(x, y) {
    	if (!isNumber(x) || !isNumber(y)) {
    		throw new Error("Invalid arguments.");
    	}
    	this.x = x;
    	this.y = y;
    	this._buffer = { x: 0, y: 0 };
    }

    static get zero() {
    	return new Vector2(0, 0);
    }

    static get one() {
    	return new Vector2(1, 1);
    }

    static get right() {
    	return new Vector2(1, 0);
    }

    static get left() {
    	return new Vector2(-1, 0);
    }

    static get down() {
    	return new Vector2(0, 1);
    }

    static get up() {
    	return new Vector2(0, -1);
    }

    static get degToRad() {
    	return DEG_TO_RAD;
    }

    static get angleOffset() {
    	return ANGLE_OFFSET;
    }

    equals(v) {
    	if (!isType(v, Vector2)) {
    		throw new Error("Invalid argument.");
    	}
    	return this.x === v.x && this.y === v.y;
    }

    _parseInput(v) {
    	if (isType(v, Vector2)) {
    		return v;
    	} else if (isNumber(v)) {
    		this._buffer.x = v;
    		this._buffer.y = v;
    		return this._buffer;
    	} else {
    		throw new Error("Invalid argument.");
    	}
    }

    add(v) {
    	v = this._parseInput(v);
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
    	v = this._parseInput(v);
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(v) {
    	v = this._parseInput(v);
    	return new Vector2(this.x * v.x, this.y * v.y);
    }

    divide(v) {
    	v = this._parseInput(v);

    	if (v.x === 0 || v.y === 0) {
    		throw new Error("Divide by Zero Exception");
    	}

    	// 0 / num evaluates to Infinity
    	const x = this.x === 0 ? 0 : this.x / v.x,
    		  y = this.y === 0 ? 0 : this.y / v.y;
    	return new Vector2(x, y);
    }

    negate() {
    	return new Vector2(-this.x, -this.y);
    }

    get sqrMagnitude() {
    	return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }

    get magnitude() {
    	return Math.sqrt(this.sqrMagnitude);	
    }

    normalize() {
    	if (this.x === 0 && this.y === 0) {
    		return this.copy();
    	} else {
    		return this.divide(this.magnitude);
    	}
    }

    get angle() {
    	return Math.atan2(this.y, this.x);
    }

    dot(v) {
    	if (!isType(v, Vector2)) {
    		throw new Error("Invalid argument.");
    	}
    	return (this.x * v.x) + (this.y * v.y);
    }

    project(u, v) {
    	return new Vector2(this.dot(u), this.dot(v));
    }

	// a should be in radians
    rotate(a) {
    	if (!isNumber(a)) {
    		throw new Error("Invalid argument.");
    	}

    	const cs = Math.cos(a),
    		  sn = Math.sin(a);
		let x = (this.x * cs) - (this.y * sn),
    		y = (this.x * sn) + (this.y * cs);

    	x = toPrecision(x, PRECISION);
    	y = toPrecision(y, PRECISION);

    	return new Vector2(x, y);
    }

    map(f) {
    	return new Vector2(f(this.x), f(this.y));
    }

    copy() {
    	return new Vector2(this.x, this.y);
    }

    toString() {
    	return "(" + this.x + ", " + this.y + ")";
    }
}
