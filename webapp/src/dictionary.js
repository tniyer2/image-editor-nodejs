
import { removeItem, isUdf } from "./utility";
import { MyEvent } from "./event";

export { Dictionary, ConstantDictionary, EventDictionary };

class Dictionary {
    constructor(options) {
        this._inner = Object.create(options || null);
    }

    get keys() {
        return Object.keys(this._inner);
    }

    get values() {
        return Object.values(this._inner);
    }

    _checkValidName(name) {
        if (name === "__proto__") {
            throw new Error("name cannot have the value '__proto__'");
        }
    }

    put(name, value) {
        this._checkValidName(name);
        this._inner[name] = value;
    }

    remove(name) {
        this._checkValidName(name);
        delete this._inner[name]; 
    }

    has(name) {
        this._checkValidName(name);
        return name in this._inner;
    }

    get(name) {
        this._checkValidName(name);
        return this._inner[name];
    }
}

class ConstantDictionary extends Dictionary {
    put(name, value) {
        this._checkValidName(name);
        if (this.has(name)) {
            throw new Error(`Cannot set value, key '${name}' has already been set.`);
        }
        else {
            super.put(name, value);
        }
    }

    remove() {
        throw new Error("Cannot call remove on an object of type ConstantDictionary");
    }
}

class EventDictionary extends Dictionary {
    constructor(options) {
        super(options);
        this._events = new Dictionary();
    }

    mutate(name, cb) {
        let value = super.get(name);
        cb(value);
        if (this._events.has(name)) {
            this._events.get(name).trigger(value);
        }
    }

    put(name, value) {
        super.put(name, value);
        if (this._events.has(name)) {
            this._events.get(name).trigger(value);
        }
    }

    addListener(name, listener) {
        if (!this._events.has(name)) {
            this._events.put(new MyEvent());
        }
        this._events.get(name).interface.addListener(listener);
    }

    removeListener(name, listener) {
        if (this._events.has(name)) {
            this._events.get(name).interface.removeListener(listener);
        }
    }
}
