
import { AddToEventLoop } from "./utility";
import { Vector2, Box } from "./geometry";
import { Tab } from "./area";

const CLASSES = {
  root: "viewport-tab",
  viewport: "viewport",
  innerViewport: "viewport__inner",
  background: "viewport__background",
  layerParent: "viewport__layersParent"
};

const H_PADDING = 20,
	  V_PADDING = 20;

export default class extends Tab {
	constructor() {
		super();

		this._createDOM();
		this._createUpdateDOM();
	}

	static get tabName() {
		return "Viewport";
	}

	_createDOM() {
		this._box.element.classList.add(CLASSES.root);

		const vp = document.createElement("div");
		vp.tabIndex = "0";
		vp.classList.add(CLASSES.viewport);
		this.viewport = new Box(vp, this._box);
		this.viewport.appendElement();

		const ivp = document.createElement("div");
		ivp.classList.add(CLASSES.innerViewport);
		this.innerViewport = new Box(ivp, this.viewport);
		this.innerViewport.appendElement();
		this.innerViewport.setOriginCenter();

		const background = document.createElement("div");
		background.classList.add(CLASSES.background);
		ivp.appendChild(background);

		const lp = document.createElement("div");
		lp.classList.add(CLASSES.layerParent);
		ivp.appendChild(lp);
		this.layerParent = lp;
	}

	_createUpdateDOM() {
		this._updateDOM = new AddToEventLoop(() => {
			const dim = this.innerViewport.rawDimensions;
			const p = this.viewport.localDimensions;

			const w = p.x - H_PADDING;
			const sx = dim.x === 0 ? 0 : w / dim.x;
			const h = p.y - V_PADDING;
			const sy = dim.y === 0 ? 0 : h / dim.y;

			const scale = sx < sy ? sx : sy;
			this.innerViewport.localScale = new Vector2(scale, scale);
			this.innerViewport.center = this.viewport.center;
		});
	}

	_add() {
		let width = this._box.width;

		this._intervalID = setInterval(() => {
			const cur = this._box.width;

			if (width !== cur) {
				this.innerViewport.center = this.viewport.center;
				width = cur;
			}
		});
	}

	_remove() {
		clearTimeout(this._intervalID);
	}

	updateDOM() {
		this._updateDOM.update();
	}
}
