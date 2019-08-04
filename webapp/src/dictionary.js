
import { MyEvent } from "./event";

export { Dictionary, ConstantDictionary, EventDictionary };

const Dictionary = (function(){
    const PROTO_PROP = "__proto__";

    return class {
        constructor(proto) {
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

        _checkValidName(name) {
            if (name === PROTO_PROP) {
                throw new Error(`name cannot have the value '${PROTO_PROP}'`);
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
    };
})();

class ConstantDictionary extends Dictionary {
    put(name, value) {
        this._checkValidName(name);
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
