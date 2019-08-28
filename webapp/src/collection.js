
import { isArray } from "./type";
import { addEvent } from "./event";

export { Collection, BASE, SELECT };

const Collection = (function(){
	const SINGLE = 0, MULTIPLE = 1;

	const Inner2 = function (info) {
		if (!isArray(info) || !info.every(o => typeof o === "object")) {
			throw new Error("Invalid argument.");
		}

		class Inner {
			constructor() {
				info.forEach((p) => {
					if (p.type === Collection.MULTIPLE) {
						this["_" + p.var] = [];

						if (p.onAdd) {
							addEvent(this, p.onAdd);
						}
						if (p.onRemove) {
							addEvent(this, p.onRemove);
						}
						if (p.onChange) {
							addEvent(this, p.onChange);
						}
					} else if (p.type === Collection.SINGLE) {
						this["_" + p.var] = p.defaultVar;

						if (p.onChange) {
							addEvent(this, p.onChange);
						}
					} else {
						throw new Error("Invalid type: " + p.type);
					}
				});
			}
		}

		info.forEach((p) => {
			const pub = p.var,
				  priv = "_" + pub;

			if (p.type === Collection.MULTIPLE) {
				Object.defineProperty(Inner.prototype, pub, {
					get: function() {
						return this[priv].slice();
					}
				});

				Inner.prototype[p.add] = function(item) {
					this[priv].push(item);
					if (p.onAdd) {
						this["_" + p.onAdd].trigger(item);
					}
					if (p.onChange) {
						this["_" + p.onChange].trigger(p.add);
					}
				};

				Inner.prototype[p.remove] = function(item) {
					const i = this[priv].findIndex(o => o === item);
					const found = i !== -1;
					if (found) {
						this[priv].splice(i, 1);

						if (p.onRemove) {
							this["_" + p.onRemove].trigger(item);
						}
						if (p.onChange) {
							this["_" + p.onChange].trigger(p.remove);
						}
					}
					return found;
				};

				if (p.clear) {
					Inner.prototype[p.clear] = function() {
						const old = this[priv];
						this[priv] = [];

						old.forEach((item) => {
							if (p.onRemove) {
								this["_" + p.onRemove].trigger(item);
							}
						});
						if (p.onChange) {
							this["_" + p.onChange].trigger(p.clear);
						}
					};
				}

				if (p.addOnly) {
					Inner.prototype[p.addOnly] = function(newItem) {
						let n = this[priv].filter(o => o === newItem);
						if (n.length > 1) {
							console.warn("item is referenced multiple times in array:", newItem);
							n = n.slice(0, 1);
						}
						const old = this[priv].filter(o => o !== newItem);

						if (n.length) {
							this[priv] = n;
						}

						old.forEach((item) => {
							if (p.onRemove) {
								this["_" + p.onRemove].trigger(item);
							}
						});

						if (!n.length) {
							this[priv] = [newItem];
							if (p.onAdd) {
								this["_" + p.onAdd].trigger(newItem);
							}
						}

						if (p.onChange) {
							this["_" + p.onChange].trigger(p.addOnly);
						}
					};
				}
			} else if (p.type === Collection.SINGLE) {
				Object.defineProperty(Inner.prototype, pub, {
					get: function() {
						return this[priv];
					},
					set: function(val) {
						const old = this[priv];
						this[priv] = val;
						if (p.onChange) {
							this["_" + p.onChange].trigger(old, val);
						}
					}
				});
			} else {
				throw new Error("Invalid type: " + p.type);
			}
		});

		return Inner;
	};

	Object.defineProperty(Inner2, "SINGLE", { get: () => SINGLE });
	Object.defineProperty(Inner2, "MULTIPLE", { get: () => MULTIPLE });

	return Inner2;
})();

const BASE = Object.freeze(
{ type: Collection.MULTIPLE, var: "items",
  add: "add", remove: "remove",
  onAdd: "onAdd", onRemove: "onRemove",
  onChange: "onChange" });

const SELECT = Object.freeze(
{ type: Collection.MULTIPLE, var: "selected",
  add: "select", remove: "deselect",
  clear: "deselectAll", addOnly: "selectOnly",
  onAdd: "onSelect", onRemove: "onDeselect",
  onChange: "onSelectedChange" });
