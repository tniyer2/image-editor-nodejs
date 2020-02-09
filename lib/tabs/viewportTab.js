
import { AddToEventLoop } from "../util/util";
import Vector2 from "../vector/vector2";
import Anchor from "../vector/anchor";
import Box from "../vector/box";
import Tab from "../core/tab";

const CLASSES = {
  root: "viewport-tab",
  viewport: "viewport",
  innerViewport: "viewport__inner",
  background: "viewport__background",
  mainCanvas: "viewport__main-canvas"
};

const H_PADDING = 20,
	  V_PADDING = 20;

export default class extends Tab {
	constructor() {
		super();

		this._intervalID = null;

		this._createDOM();
		this._initDOMUpdater();
	}

	static get tabName() {
		return "Viewport";
	}

	get viewport() {
		return this._viewport;
	}

	get innerViewport() {
		return this._innerViewport;
	}

	get mainCanvas() {
		return this._mainCanvas;
	}

	_createDOM() {
		this._root.classList.add(CLASSES.root);
		this._anchor = new Anchor(this._root);

		const vp = document.createElement("div");
		vp.tabIndex = "0";
		vp.classList.add(CLASSES.viewport);
		this._viewport = new Box(vp, this._anchor);
		this._viewport.appendElement();

		const ivp = document.createElement("div");
		ivp.classList.add(CLASSES.innerViewport);
		this._innerViewport = new Box(ivp, this._viewport);
		this._innerViewport.setOriginCenter();
		this._innerViewport.appendElement();

		const background = document.createElement("div");
		background.classList.add(CLASSES.background);
		ivp.appendChild(background);

		const canvas = document.createElement("canvas");
		canvas.classList.add(CLASSES.mainCanvas);
		this._mainCanvas = new Box(canvas, this._innerViewport);
		this._mainCanvas.appendElement();
	}

	_initDOMUpdater() {
		this._DOMUpdater = new AddToEventLoop(() => {
			const
				dim = this._innerViewport.rawDimensions,
				p = this._viewport.dimensions;

			const
				w = p.x - H_PADDING,
				sx = dim.x === 0 ? 0 : w / dim.x,
				h = p.y - V_PADDING,
				sy = dim.y === 0 ? 0 : h / dim.y,
				scale = sx < sy ? sx : sy;

			this._innerViewport.localScale = new Vector2(scale, scale);
			this._innerViewport.center = this._viewport.center;
		});
	}

	_onAdd() {
		let width = this._anchor.width;

		this._intervalID = setInterval(() => {
			const cur = this._anchor.width;

			if (width !== cur) {
				this._innerViewport.center = this._viewport.center;
				width = cur;
			}
		});
	}

	_onRemove() {
		clearTimeout(this._intervalID);
	}

	updateDOM() {
		this._DOMUpdater.update();
	}
}
