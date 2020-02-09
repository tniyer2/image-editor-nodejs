
import { isObject, isArray } from "../util/type";
import { addEvent } from "../event/util";

export { Collection, BASE, SELECT };

const Collection = (function(){
	const SINGLE = 0, MULTIPLE = 1;

	const Inner2 = function (info) {
		if (!isArray(info) || !info.every(o => isObject(o))) {
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
					if (this[priv].includes(item)) {
						throw new Error("Invalid argument.");
					}

					this[priv].push(item);
					if (p.onAdd) {
						this["_" + p.onAdd].trigger(item);
					}
					if (p.onChange) {
						this["_" + p.onChange].trigger(p.add);
					}
				};

				Inner.prototype[p.remove] = function(item) {
					const i = this[priv].indexOf(item);
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
						const i = this[priv].indexOf(newItem);
						const found = i !== -1;
						const old = this[priv];
						this[priv] = [newItem];
						if (found) {
							old.splice(i, 1);
						}

						old.forEach((item) => {
							if (p.onRemove) {
								this["_" + p.onRemove].trigger(item);
							}
						});

						if (!found) {						
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
