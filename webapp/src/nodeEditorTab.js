
import { createSVG } from "./utility";
import { Box } from "./geometry";
import { Tab } from "./area";

const CLASSES =
{ root: "node-editor-tab",
  search: "node-search",
  searchWrapper: "node-search__wrapper",
  searchWrapper2: "node-search__wrapper2",
  searchWrapper3: "node-search__wrapper3",
  nodeSpace: "node-space",
  innerNodeSpace: "node-space__inner",
  linksParent: "node-space__links-parent" };

const SEARCH_ICON = "#icon-search";

export default class extends Tab {
	constructor() {
		super();
		this._createDOM();
	}

	static get tabName() {
		return "Node Editor";
	}

	_createDOM() {
		this._box.element.classList.add(CLASSES.root);

		const form = document.createElement("form");
		form.classList.add(CLASSES.search);
		this._box.element.appendChild(form);
		this.form = form;

		const w = document.createElement("div");
		w.classList.add(CLASSES.searchWrapper);
		form.appendChild(w);
		this.wrapper = w;

		const w2 = document.createElement("div");
		w2.classList.add(CLASSES.searchWrapper2);
		w.appendChild(w2);
		this.wrapper2 = w2;

		const w3 = document.createElement("div");
		w3.classList.add(CLASSES.searchWrapper3);
		w2.appendChild(w3);
		this.wrapper3 = w3;

		const input = document.createElement("input");
		input.type = "text";
		w3.appendChild(input);
		this.searchInput = input;

		const btn = document.createElement("button");
		btn.type = "submit";
		w3.appendChild(btn);
		this.submitBtn = btn;

		const svg = createSVG(SEARCH_ICON);
		btn.appendChild(svg);

		const ns = document.createElement("div");
		ns.tabIndex = "0";
		ns.classList.add(CLASSES.nodeSpace);
		this.nodeSpace = new Box(ns, this._box);
		this.nodeSpace.appendElement();

		const ins = document.createElement("div");
		ins.classList.add(CLASSES.innerNodeSpace);
		this.innerNodeSpace = new Box(ins, this.nodeSpace);
		this.innerNodeSpace.appendElement();

		const links = document.createElement("div");
		links.classList.add(CLASSES.linksParent);
		this.linksParent = new Box(links, this.innerNodeSpace);
		this.linksParent.appendElement();
	}
}
