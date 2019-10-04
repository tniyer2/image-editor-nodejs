
import { isUdf, isUdfOrNull, isNumber, isArray } from "./type";

export { Matrix, ColorFilter, ColorMatrixFilter, ConvolutionFilter };

function clampInt8(v) {
	return v < 0 ? 0 : v > 255 ? 255 : v;
}

class Matrix {
	// values should be in row-column order
	constructor(values, rows, columns) {
		if (!isArray(values)) {
			throw new Error("Invalid argument.");
		} else if (!Number.isInteger(rows)) {
			throw new Error("Invalid argument.");
		} else if (rows < 1) {
			throw new Error("Invalid argument.");
		} else if (isUdf(columns)) {
			columns = rows;
		} else if (!Number.isInteger(columns)) {
			throw new Error("Invalid argument.");
		} else if (columns < 1) {
			throw new Error("Invalid argument.");
		}

		if (values.length !== rows * columns) {
			throw new Error("Invalid argument.");
		} else if (!values.every(n => isNumber(n))) {
			throw new Error("Invalid argument.");
		}

		this._values = values.slice();
		this._rows = rows;
		this._columns = columns;
	}

	get values() {
		return this._values.slice();
	}

	get rows() {
		return this._rows;
	}

	get columns() {
		return this._columns;
	}

	get(x, y) {
		if (!Number.isInteger(x)) {
			throw new Error("Invalid argument.");
		} else if (x < 0) {
			throw new Error("Invalid argument.");
		} else if (x >= this._columns) {
			throw new Error("Invalid argument.");
		} else if (!Number.isInteger(y)) {
			throw new Error("Invalid argument.");		
		} else if (y < 0) {
			throw new Error("Invalid argument.");		
		} else if (y >= this._rows) {
			throw new Error("Invalid argument.");		
		}

		return this._values[(y * this._columns) + x];
	}
}

const Filter = (function(){
	const COLOR_MODES = ["hsl", "hsv", "hsi", "lab", "lch"];
	return class {
		constructor(colorMode) {
			if (colorMode !== null &&
				!COLOR_MODES.includes(colorMode)) {
				throw new Error("Invalid argument.");
			}

			this._colorMode = colorMode;
		}

		get colorMode() {
			return this._colorMode;
		}

		applyFilter(reference, output) {
			if (!(reference instanceof ImageData)) {
				throw new Error("Invalid argument.");
			}
			const
				w = reference.width,
				h = reference.height;
			if (isUdf(output)) {
				output = new ImageData(w, h);
			} else if (!(output instanceof ImageData)) {
				throw new Error("Invalid argument.");
			} else if (output.width !== w ||
					   output.height !== h) {
				throw new Error("Invalid argument.");
			}

			this._applyFilter(reference.data, output.data, w, h);

			return output;
		}
	};
})();

class ColorFilter extends Filter {
	constructor(matrix, colorMode=null) {
		super(colorMode);

		if (!(matrix instanceof Matrix)) {
			throw new Error("Invalid argument.");
		} else if (matrix.columns !== 4) {
			throw new Error("Invalid argument.");
		}
		if (matrix.rows === 1) {
			this._applyOffset = false;
		} else if (matrix.rows === 2) {
			this._applyOffset = true;
		} else {
			throw new Error("Invalid argument.");
		}

		this._matrix = matrix;
	}

	_applyFilter(refData, outData, width, height) {
		const
			width4 = width * 4,
			matrix = this._matrix;

		for (let y=0; y<height; y+=1) {
			const yOffset = y * width4;
			for (let x=0; x<width4; x+=4) {
				const
					p1 = x+yOffset,
					p2 = p1+1,
					p3 = p1+2,
					p4 = p1+3;
				let
					r = refData[p1] * matrix.get(0, 0),
					g = refData[p2] * matrix.get(1, 0),
					b = refData[p3] * matrix.get(2, 0),
					a = refData[p4] * matrix.get(3, 0);
				if (this._applyOffset) {
					r += matrix.get(0, 1);
					g += matrix.get(1, 1);
					b += matrix.get(2, 1);
					a += matrix.get(3, 1);
				}
				outData[p1] = clampInt8(r);
				outData[p2] = clampInt8(g);
				outData[p3] = clampInt8(b);
				outData[p4] = clampInt8(a);
			}
		}
	}
}

class ColorMatrixFilter extends Filter {
	constructor(matrix, colorMode=null) {
		super(colorMode);

		if (!(matrix instanceof Matrix)) {
			throw new Error("Invalid argument.");
		} else if (matrix.rows !== 4) {
			throw new Error("Invalid argument.");
		}

		if (matrix.columns === 4) {
			this._applyOffset = false;
		} else if (matrix.columns === 5) {
			this._applyOffset = true;
		} else {
			throw new Error("Invalid argument.");
		}

		this._matrix = matrix;
	}

	_applyFilter(refData, outData, width, height) {
		const
			width4 = width * 4,
			matrix = this._matrix;

		for (let y=0; y<height; y+=1) {
			const yOffset = y * width4;
			for (let x=0; x<width4; x+=4) {
				const
					p1 = x+yOffset,
					p2 = p1+1,
					p3 = p1+2,
					p4 = p1+3;
				const
					or = refData[p1],
					og = refData[p2],
					ob = refData[p3],
					oa = refData[p4];
				let
					r = (or * matrix.get(0, 0)) + (og * matrix.get(1, 0)) +
						(ob * matrix.get(2, 0)) + (oa * matrix.get(3, 0)),
					g = (or * matrix.get(0, 1)) + (og * matrix.get(1, 1)) +
						(ob * matrix.get(2, 1)) + (oa * matrix.get(3, 1)),
					b = (or * matrix.get(0, 2)) + (og * matrix.get(1, 2)) +
						(ob * matrix.get(2, 2)) + (oa * matrix.get(3, 2)),
					a = (or * matrix.get(0, 3)) + (og * matrix.get(1, 3)) +
						(ob * matrix.get(2, 3)) + (oa * matrix.get(3, 3));
				if (this._applyOffset) {
					r += matrix.get(4, 0);
					g += matrix.get(4, 1);
					b += matrix.get(4, 2);
					a += matrix.get(4, 3);
				}
				outData[p1] = clampInt8(r);
				outData[p2] = clampInt8(g);
				outData[p3] = clampInt8(b);
				outData[p4] = clampInt8(a);
			}
		}
	}
}

const ConvolutionFilter = (function(){
	const SUPPORTED_VALUES = [3, 5, 7];

	return class extends Filter {
		constructor(matrix, multiplier, offset, colorMode=null) {
			super(colorMode);

			if (!(matrix instanceof Matrix)) {
				throw new Error("Invalid argument.");
			} else if (!SUPPORTED_VALUES.includes(matrix.rows)) {
				throw new Error("Invalid argument.");
			} else if (matrix.rows !== matrix.columns) {
				throw new Error("Invalid argument.");
			}

			if (isUdfOrNull(multiplier)) {
				this._applyMultiplier = false;
			} else if (isNumber(multiplier)) {
				this._applyMultiplier = true;
				this._multiplier = multiplier;
			} else {
				throw new Error("Invalid argument.");
			}

			if (isUdfOrNull(offset)) {
				this._applyOffset = false;
			} else if (isNumber(offset)) {
				this._applyOffset = true;
				this._offset = offset;
			} else {
				throw new Error("Invalid argument.");
			}

			this._matrix = matrix;
		}

		_applyFilter(refData, outData, width, height) {
			const
				matrix = this._matrix,
				rows = matrix.rows,
				columns = matrix.columns,
				half = Math.floor(rows / 2),
				yOffsets = this._getOffsets(height, width * 4, half),
				xOffsets = this._getOffsets(width, 4, half);

			for (let y=0; y<height; y+=1) {
				for (let x=0; x<width; x+=1) {
					let
						fr = 0,
						fg = 0,
						fb = 0;

					for (let r=0; r<rows; r+=1) {
						for (let c=0; c<columns; c+=1) {
							const i = yOffsets[y+r] + xOffsets[x+c];
							const m = matrix.get(c, r);
							fr += refData[i] * m;
							fg += refData[i+1] * m;
							fb += refData[i+2] * m;
						}
					}

					if (this._applyMultiplier) {
						fr *= this._multiplier;
						fg *= this._multiplier;
						fb *= this._multiplier;
					}

					if (this._applyOffset) {
						fr += this._offset;
						fg += this._offset;
						fb += this._offset;
					}

					const i = yOffsets[y+half] + xOffsets[x+half];
					outData[i] = fr;
					outData[i+1] = fg;
					outData[i+2] = fb;
					outData[i+3] = refData[i+3];
				}
			}
		}

		_getOffsets(size, factor, padding) {
			const
				offsets = [],
				bottom = (size - 1) * factor;

			let val;
			for (let i=-padding, l=size+padding; i<l; i+=1) {
				if (i < 0) {
					val = 0;
				} else if (i < size) {
					val = i * factor;
				} else {
					val = bottom;
				}
				offsets.push(val);
			}

			return offsets;
		}
	};
})();
