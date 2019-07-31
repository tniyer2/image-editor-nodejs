
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
		const index = this._keys.findIndex(o => o.key === key);
		if (index !== -1) {
			const obj = this._keys[index];
			this._keys.splice(index, 1);

			obj.subkeys.forEach((k, i) => {
				this._locks[i].free(k);
			});
		} else {
			console.warn("Could not find key from this._keys:", key);
		}
	}

	pipe(lock) {
		this._locks.push(lock);
	}
}
