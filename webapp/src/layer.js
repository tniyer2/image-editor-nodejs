
import { Box } from "./geometry";

export { LayerBox };

class LayerBox extends Box {
	constructor(bitmap) {
		const d = document.createElement("div");
		super(d);

		this.source = bitmap;

		this.canvas = document.createElement("canvas");
		this._element.appendChild(this.canvas);

		const w = this.source.width, 
			  h = this.source.height;
		this.canvas.width = w;
		this.canvas.height = h;
		this._element.style.width = w + "px";
		this._element.style.height = h + "px";

		setTimeout(() => {
			const context = this.canvas.getContext("2d");
			context.drawImage(this.source, 0, 0);
		});
	}

	get aspectRatio() {
		return this.source.height / this.source.width;
	}
}
