
import { isFunction } from "./utility";

export default class {
	constructor()
	{
		this._values = Object.create(null);
		this._listeners = Object.create(null);
	}

	_checkValidName(name)
	{
		if (name === "__proto__")
		{
			throw new Error("cannot set property with name __proto__");
		}
	}

	get(name)
	{
		this._checkValidName(name);
		return this._values[name];
	}

	set(name, value)
	{
		this._checkValidName(name);
		this._values[name] = value;
		this._callListeners(name);
	}

	addListener(name, listener)
	{
		this._checkValidName(name);
		if (!isFunction(listener))
		{
			throw new Error("listener is not a function");
		}

		if (!this._listeners[name])
		{
			this._listeners[name] = [];	
		}
		this._listeners[name].push(listener);
	}

	_callListeners(name)
	{
		if (this._listeners[name])
		{
			this._listeners[name].forEach((f) => {
				try {
					f(this._values[name]);
				} catch (e) {
					console.warn(e);
				}
			})
		}
	}
}