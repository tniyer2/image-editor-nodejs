
import { isUdf } from "./type";
import { ConstantDictionary } from "./dictionary";
import { addEvent } from "./event";
import { Anchor, Box } from "./geometry";
import { NewTab } from "./tabs";
import { AreaWrapper, Tab } from "./area";

export default class {
	constructor(root) {
		if (!(root instanceof HTMLElement)) {
			throw new Error("Invalid argument.");
		}

		this._anchor = new Anchor(document.body);
		this._root = new Box(root, this._anchor);
		this.container = new AreaWrapper();
		this.container.attach(this._root);

		this.tabs = new TabFactory();
	}
}

class TabFactory {
	constructor() {
		this._dictionary = new ConstantDictionary();
		this._array = [];
		addEvent(this, "onChange");
	}

	getFreeTabs() {
		return this._array.filter(i => !i.single || i.free)
			   .map(o => Object.assign({}, o));
	}

	register(name, tabType, single=true) {
		if (typeof tabType !== "object" ||
			!(tabType.prototype instanceof Tab)) {
			throw new Error("Invalid argument.");
		} else if (typeof single !== "boolean") {
			throw new Error("Invalid argument.");
		}

		const info =
		{ name: name,
		  type: tabType,
		  single: single };
		if (single) {
			const tab = new tabType();
			tab.tabString = name;
			info.instance = tab;
			info.free = true;
		}

		this._dictionary.put(name, info);
		this._array.push(info);
		this._onChange.trigger();
	}

	get(name, markUsed=true) {
		let isDefault = false;
		if (typeof markUsed !== "boolean") {
			throw new Error("Invalid argument.");
		} else if (isUdf(name) || name === null) {
			isDefault = true;
		} else if (!this._dictionary.has(name)) {
			throw new Error("Argument 'name' is not a registered tab.");
		}

		if (isDefault) {
			const tab = new NewTab(this);
			tab.tabString = null;
			return tab;
		} else {
			const info = this._dictionary.get(name);
			if (info.single) {
				if (markUsed) {
					if (!info.free) {
						throw new Error("Cannot access tab in use.");
					}
					info.free = false;
					this._onChange.trigger();
				}

				return info.instance;
			} else {
				const tab = new info.type();
				tab.tabString = null;
				return tab;
			}
		}
	}

	free(name) {
		if (name === null) {
			return;
		} else if (!this._dictionary.has(name)) {
			throw new Error("Argument 'name' is not a registered tab.");
		}

		const info = this._dictionary.get(name);
		if (info.free) {
			throw new Error("Tab is already free.");
		}

		info.free = true;
		this._onChange.trigger();
	}
}
