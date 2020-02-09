
import { isUdfOrNull, isObjectLiteral } from "./type";

export default class Dictionary {
    constructor(props) {
        const empty = Object.create(null);
        if (isUdfOrNull(props)) {
            this._inner = empty;
        } else if (isObjectLiteral(props)) {
            this._inner = Object.assign(empty, props);
        } else {
            throw new Error("Invalid argument.");
        }
    }

    keys() {
        return Object.keys(this._inner);
    }

    values() {
        return Object.values(this._inner);
    }

    items() {
        return Object.assign({}, this._inner);
    }

    _checkValidName(name) {
        const message = "Invalid key '" + name + "'";
        if (typeof name !== "string") {
            throw new Error(message);
        } else if (name === "__proto__") {
            throw new Error(message);
        } else if (name === "prototype") {
            throw new Error(message);
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
