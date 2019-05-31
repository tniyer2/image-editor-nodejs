
import { removeItem, isUdf } from "./utility";

export { Dictionary, ConstantDictionary, EventDictionary };

class Dictionary {
    constructor(options)
    {
        this._inner = Object.create(options || null);
    }

    get keys()
    {
        return Object.keys(this._inner);
    }

    get values()
    {
        return Object.values(this._inner);
    }

    _checkValidName(name)
    {
        if (typeof name !== "string")
        {
            throw new Error("name should be a string.");
        }
        if (name === "__proto__")
        {
            throw new Error("name cannot have the value '__proto__'");
        }
    }

    put(name, value)
    {
        this._checkValidName(name);
        this._inner[name] = value;
    }

    remove(name)
    {
        this._checkValidName(name);
        delete this._inner[name]; 
    }

    has(name)
    {
        this._checkValidName(name);
        return name in this._inner;
    }

    get(name)
    {
        this._checkValidName(name);
        return this._inner[name];
    }
}

class ConstantDictionary extends Dictionary {
    constructor()
    {
        super(...arguments);
    }

    put(name, value)
    {
        this._checkValidName(name);
        if (this.has(name))
        {
            throw new Error(`Cannot set value, key '${name}' already has a value.`);
        }
        else
        {
            super.put(name, value);
        }
    }

    remove()
    {
        throw new Error("Cannot call remove on a ConstantDictionary");
    }
}

class EventDictionary extends Dictionary {
    constructor()
    {
        super(...arguments);
        this._listeners = new Dictionary();
    }

    mutate(name, cb)
    {
        let value = super.get(name);
        cb(value);
        this._callListeners(name);
    }

    put(name, value)
    {
        super.put(name, value);
        this._callListeners(name);
    }

    addListener(name, listener)
    {
        let arr = this._listeners.get(name);
        if (isUdf(arr))
        {
            this._listeners.put(name, [listener]);
        }
        else
        {
            arr.push(listener);
        }
    }

    removeListener(name, listener)
    {
        let arr = this._listeners.get(name);
        if (arr)
        {
            removeItem(arr, listener);
        }
    }

    _callListeners(name)
    {
        let arr = this._listeners.get(name);
        if (arr)
        {
            let value = super.get(name);
            arr.forEach((f) => {
                f.call(null, value);
            });
        }
    }
}
