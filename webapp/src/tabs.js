
import { createSVG } from "./utility";
import { Box } from "./geometry";
import { Tab } from "./area";

export { NewTab, ViewportTab, NodeEditorTab };

const NewTab = (function(){
	const CLASSES =
	{ root: "new-tab",
	  list: "tab-list",
	  info: "tab-info",
	  name: "tab-name" };

	return class extends Tab {
		constructor(tabFactory) {
			super();
			this._tabFactory = tabFactory;
			this.tabName = "New Tab";

			this._createDOM();
			this._updateList = this._updateList.bind(this);
			this._tabFactory.onChange.addListener(this._updateList);
			this._fillList();
		}

		_createDOM() {
			this._box.element.classList.add(CLASSES.root);

			const list = document.createElement("ul");
			list.classList.add(CLASSES.list);
			this._box.element.appendChild(list);
			this._list = list;
		}

		_updateList() {
			this._clearList();
			this._fillList();
		}

		_clearList() {
			let child;
			while ((child = this._list.firstChild)) {
				child.remove();
			}
		}

		_fillList() {
			const tabs = this._tabFactory.getFreeTabs();

			tabs.forEach((tab) => {
				const li = document.createElement("li");
				li.addEventListener("click", () => {
					this._tabUI.tab = this._tabFactory.get(tab.name);
				});
				li.classList.add(CLASSES.info);
				this._list.appendChild(li);

				const name = document.createElement("span");
				name.innerText = tab.tabName;
				name.classList.add(CLASSES.name);
				li.appendChild(name);
			});
		}

		onRemove() {
			super.onRemove();
			this._tabFactory.onChange.removeListener(this._updateList);
		}
	};
})();

const ViewportTab = (function(){
	const CLASSES =
	{ root: "viewport-tab",
	  toolbar: "toolbar",
	  tools: "toolbar__tools",
	  options: "toolbar__options",
	  viewport: "viewport-wrapper",
	  innerViewport: "viewport",
	  background: "viewport__background",
	  layerParent: "layers" };

	return class extends Tab {
		constructor() {
			super();
			this.tabName = "Viewport";
			this._createDOM();
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
			this.viewport.appendDOM();

			const ivp = document.createElement("div");
			ivp.classList.add(CLASSES.innerViewport);
			this.innerViewport = new Box(ivp, this.viewport);
			this.innerViewport.appendDOM();

			const background = document.createElement("div");
			background.classList.add(CLASSES.background);
			ivp.appendChild(background);

			const lp = document.createElement("div");
			lp.classList.add(CLASSES.layerParent);
			ivp.appendChild(lp);
		}
	};
})();

const NodeEditorTab = (function(){
	const CLASSES =
	{ root: "node-editor",
	  search: "node-search",
	  searchWrapper: "node-search__wrapper",
	  searchWrapper2: "node-search__wrapper2",
	  searchWrapper3: "node-search__wrapper3",
	  nodeSpace: "node-space-wrapper",
	  innerNodeSpace: "node-space",
	  linksParent: "links-parent" };
	const SEARCH_ICON = "#icon-search";

	return class extends Tab {
		constructor() {
			super();
			this.tabName = "Node Editor";
			this._createDOM();
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
			this.nodeSpace.appendDOM();

			const ins = document.createElement("div");
			ins.classList.add(CLASSES.innerNodeSpace);
			this.innerNodeSpace = new Box(ins, this._box);
			this.innerNodeSpace.appendDOM();

			const links = document.createElement("div");
			links.classList.add(CLASSES.linksParent);
			this.linksParent = new Box(links, this.innerNodeSpace);
			this.linksParent.appendDOM();
		}
	};
})();
