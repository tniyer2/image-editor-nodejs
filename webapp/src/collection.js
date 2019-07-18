
import { isFunction, removeItem } from "./utility";
import { addEvent } from "./event";

export { Collection, BASE, SELECT };

class Collection {
	constructor(...info) {
		const addAndListen = (n, l) => {
			if (n) {
				addEvent(this, n);
				if (isFunction(this[l])) {
					this[n].addListener(this[l]);
				}
			}
		};

		info.forEach((p, i) => {
			const pub = p.varName,
				  priv = "_" + pub;

			if (p.type === Collection.MULTIPLE) {
				this[priv] = [];
				Object.defineProperty(this, pub, {
					get: () => this[priv].slice()
				});

				addAndListen(p.onAdd, p.defaultOnAdd);
				addAndListen(p.onRemove, p.defaultOnRemove);
				addAndListen(p.onChange, p.defaultOnChange);

				this[p.add] = (item) => {
					this[priv].push(item);
					if (p.onAdd) {
						this["_" + p.onAdd].trigger(item);
					}
					if (p.onChange) {
						this["_" + p.onChange].trigger();
					}
				};

				this[p.remove] = (item) => {
					const removed = removeItem(this[priv], item);
					if (removed) {
						if (p.onRemove) {
							this["_" + p.onRemove].trigger(item);
						}
						if (p.onChange) {
							this["_" + p.onChange].trigger();
						}
					} else {
						console.warn("Could not remove item from this." + priv + ":", item);
					}
				};

				if (p.clear) {
					this[p.clear] = () => {
						const old = this[priv];
						this[priv] = [];

						old.forEach((item) => {
							if (p.onRemove) {
								this["_" + p.onRemove].trigger(item);
							}
						});
						if (p.onChange) {
							this["_" + p.onChange].trigger();
						}
					};
				}
			} else if (p.type === Collection.SINGLE) {
				addAndListen(p.onChange, p.defaultOnChange);

				this[priv] = p.defaultVar;
				Object.defineProperty(this, pub, {
					get: () => this[priv],
					set: (val) => {
						this[priv] = val;
						if (p.onChange) {
							this["_" + p.onChange].trigger();
						}
					}
				});
			} else {
				throw new Error("Invalid type:", p.type);
			}
		});
	}

	static get MULTIPLE() {
		return 0;
	}

	static get SINGLE() {
		return 1;
	}
}

const BASE = Object.freeze(
{ type: Collection.MULTIPLE, varName: "items",
  add: "add", remove: "remove",
  onAdd: "onAdd", onRemove: "onRemove",
  defaultOnAdd: "_defaultOnAdd",
  defaultOnRemove: "_defaultOnRemove" });

const SELECT = Object.freeze(
{ type: Collection.MULTIPLE, varName: "selected",
  add: "select", remove: "deselect",
  clear: "deselectAll",
  onAdd: "onSelect", onRemove: "onDeselect",
  defaultOnAdd: "_defaultOnSelect",
  defaultOnRemove: "_defaultOnDeselect" });
