
export default class {
	constructor() {
		this._keys = [];
		this._keyCount = 5; // random number
		this._locks = [];
	}

	get locked() {
		return Boolean(this._keys.length);
	}

	lock () {
		const k = this._keyCount;
		this._keyCount += 1;

		const s = this._locks.map(l => l.lock());

		this._keys.push({ key: k, subkeys: s });

		return k;
	}

	free(key) {
		const i = this._keys.findIndex(o => o.key === key);
		if (i === -1) {
			throw new Error("Could not find argument 'key' in this._keys");
		}

		const obj = this._keys[i];
		this._keys.splice(i, 1);
		obj.subkeys.forEach((k, j) => {
			this._locks[j].free(k);
		});
	}

	pipe(lock) {
		this._locks.push(lock);
	}
}
