
export default class {
	paint(source, points, settings) {
		const context = this._parseSource(source);
		this._setStyle(context, settings);
		this._paint(context, points);
	}

	_parseSource(source) {
		if (source instanceof CanvasRenderingContext2D) {
			return source;
		} else if (source instanceof HTMLCanvasElement) {
			return source.getContext("2d");
		} else {
			throw new Error("Invalid argument.");
		}
	}

	_setStyle(context, settings) {
		context.lineWidth = settings.strokeWidth;
		context.strokeStyle = "black";
	}

	_paint(context, points) {
		context.beginPath();
		points.forEach((p, i) => {
			if (i === 0) {
				context.moveTo(p.x, p.y);
			} else {
				context.lineTo(p.x, p.y);
			}
		});
		context.stroke();
	}
}
