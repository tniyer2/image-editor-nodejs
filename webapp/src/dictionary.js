
import { isUdf } from "./type";
import { MyEvent } from "./event";

export { Dictionary, ConstantDictionary, EventDictionary };

class Dictionary {
    constructor(proto) {
        if (!isUdf(proto) && typeof proto !== "object") {
            throw new Error("Invalid argument.");
        }
        this._inner = Object.create(proto || null);
    }

    get keys() {
        return Object.keys(this._inner);
    }

    get values() {
        return Object.values(this._inner);
    }

    get items() {
        return Object.assign({}, this._inner);
    }

    put(name, value) {
        this._inner[name] = value;
    }

    remove(name) {
        delete this._inner[name]; 
    }

    has(name) {
        return name in this._inner;
    }

    get(name) {
        return this._inner[name];
    }
}

class ConstantDictionary extends Dictionary {
    put(name, value) {
        if (this.has(name)) {
            throw new Error(`Cannot set value, key '${name}' has already been set.`);
        } else {
            super.put(name, value);
        }
    }

    remove() {
        throw new Error("Cannot call remove on ConstantDictionary");
    }
}

class EventDictionary extends Dictionary {
    constructor(proto) {
        super(proto);
        this._events = new Dictionary();
    }

    _updateEvent(name, value) {
        if (this._events.has(name)) {
            this._events.get(name).trigger(value);
        }
    }

    put(name, value) {
        super.put(name, value);
        this._updateEvent(name, value);
    }

    remove(name, value) {
        super.remove(name, value);
        this._updateEvent(name);
    }

    addListener(name, listener) {
        let event;
        if (this._events.has(name)) {
            event = this._events.get(name);
        } else {
            event = new MyEvent();
            this._events.put(name, event);
        }
        event.interface.addListener(listener);
    }

    removeListener(name, listener) {
        if (this._events.has(name)) {
            this._events.get(name).interface.removeListener(listener);
        }
    }
}
