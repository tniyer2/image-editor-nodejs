
import { Box } from "./geometry";
import { Tab } from "./area";

const CLASSES =
{ root: "viewport-tab",
  toolbar: "toolbar",
  tools: "toolbar__tools",
  toolBtn: "toolbar__tool",
  toolName: "text",
  options: "toolbar__options",
  viewport: "viewport-wrapper",
  innerViewport: "viewport",
  background: "viewport__background",
  layerParent: "layers" };

export default class extends Tab {
	constructor() {
		super();
		this._createDOM();
	}

	static get tabName() {
		return "Viewport";
	}

	_createDOM() {
		this._box.element.classList.add(CLASSES.root);

		const toolbar = document.createElement("div");
		toolbar.classList.add(CLASSES.toolbar);
		this._box.element.appendChild(toolbar);

		const tools = document.createElement("div");
		tools.classList.add(CLASSES.tools);
		toolbar.appendChild(tools);
		this.toolsParent = tools;

		const options = document.createElement("div");
		options.classList.add(CLASSES.options);
		toolbar.appendChild(options);
		this.toolbarOptions = options;

		const vp = document.createElement("div");
		vp.tabIndex = "0";
		vp.classList.add(CLASSES.viewport);
		this.viewport = new Box(vp, this._box);
		this.viewport.appendElement();

		const ivp = document.createElement("div");
		ivp.classList.add(CLASSES.innerViewport);
		this.innerViewport = new Box(ivp, this.viewport);
		this.innerViewport.appendElement();

		const background = document.createElement("div");
		background.classList.add(CLASSES.background);
		ivp.appendChild(background);

		const lp = document.createElement("div");
		lp.classList.add(CLASSES.layerParent);
		ivp.appendChild(lp);
		this.layerParent = lp;
	}

	createToolButton(name) {
		const btn = document.createElement("button");
		btn.classList.add(CLASSES.toolBtn);
		this.toolsParent.appendChild(btn);

		const text = document.createElement("span");
		text.innerText = name;
		text.classList.add(CLASSES.toolName);
		btn.appendChild(text);

		return btn;
	}
}
