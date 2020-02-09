
import MyEvent from "../event/myEvent";
import Dictionary from "./dictionary";

export default class EventDictionary extends Dictionary {
    constructor(props) {
        super(props);
        this._events = new Dictionary();
    }

    _updateEvent(name, value) {
        if (this._events.has(name)) {
            this._events.get(name).trigger(value);
        }
    }

    put(name, value) {
        this._checkValidName(name);
        super.put(name, value);
        this._updateEvent(name, value);
    }

    remove(name, value) {
        this._checkValidName(name);
        super.remove(name, value);
        this._updateEvent(name);
    }

    addListener(name, listener) {
        this._checkValidName(name);
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
        this._checkValidName(name);
        if (this._events.has(name)) {
            this._events.get(name).interface.removeListener(listener);
        }
    }
}
