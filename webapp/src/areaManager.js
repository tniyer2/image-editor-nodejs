
import { isSubclass } from "./type";
import { addEvent } from "./event";
import { ConstantDictionary } from "./dictionary";
import { Anchor, Box } from "./geometry";
import { AreaWrapper, Area, Tab } from "./area";

export default class {
	constructor(root) {
		if (!(root instanceof HTMLElement)) {
			throw new Error("Invalid argument.");
		}

		this._anchor = new Anchor(document.body);
		this._root = new Box(root, this._anchor);
		this.root = new AreaWrapper();
		this.root.add(this._root);

		this.tabs = new TabManager();
	}

	getArea() {
		return new Area(this.tabs);
	}

	getAreaWrapper() {
		return new AreaWrapper();
	}
}

class TabManager {
	constructor() {
		this._dictionary = new ConstantDictionary();
		this._array = [];
		addEvent(this, "onChange");
	}

	get freeTabs() {
		return this._array.filter(i => !i.single || i.free)
			   .map(o => Object.assign({}, o));
	}

	register(key, tabType, single=true) {
		if (!isSubclass(tabType, Tab)) {
			throw new Error("Invalid argument.");
		} else if (typeof single !== "boolean") {
			throw new Error("Invalid argument.");
		}

		const info =
		{ key: key,
		  type: tabType,
		  single: single };
		if (single) {
			const tab = new tabType();
			tab.tabKey = key;
			info.instance = tab;
			info.free = true;
		}

		this._dictionary.put(key, info);
		this._array.push(info);
		this._onChange.trigger();
	}

	get(key) {
		if (!this._dictionary.has(key)) {
			throw new Error("Argument 'key' is not a registered tab.");
		}

		const info = this._dictionary.get(key);
		if (info.single) {
			return info.instance;
		} else {
			throw new Error("Cannot get instance of tab '" + key + "'. Tab is not registered as single.");
		}
	}

	use(key) {
		if (!this._dictionary.has(key)) {
			throw new Error("Argument 'key' is not a registered tab.");
		}

		const info = this._dictionary.get(key);
		if (info.single) {
			if (!info.free) {
				throw new Error("Cannot access tab in use.");
			}

			info.free = false;
			this._onChange.trigger();

			return info.instance;
		} else {
			const tab = new info.type();
			tab.tabKey = info.key;
			return tab;
		}
	}

	free(key) {
		if (!this._dictionary.has(key)) {
			throw new Error("Argument 'key' is not a registered tab.");
		}

		const info = this._dictionary.get(key);
		if (!info.single) {
			return;
		} else if (info.free) {
			throw new Error("Tab is already free.");
		}

		info.free = true;
		this._onChange.trigger();
	}
}
