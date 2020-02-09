
import Dictionary from "./dictionary";

export default class ConstantDictionary extends Dictionary {
    put(name, value) {
        this._checkValidName(name);
        if (this.has(name)) {
            throw new Error("Invalid State. Key '" + name + "' already set.");
        }
        super.put(name, value);
    }

    remove() {
        throw new Error("Cannot call remove on ConstantDictionary");
    }
}
