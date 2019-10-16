
export default class {
	constructor(lock) {
		this._lock = lock;
	}

	cook(node) {
		if (this._lock && this._lock.locked) return;

		const {graph, acyclic} = this._getSubGraph(node);
		if (acyclic) {
			let key;
			if (this._lock) {
				key = this._lock.lock();
			}
			return this._getChain(graph).finally((info) => {
				if (this._lock) {
					this._lock.free(key);
				}
				return info;
			});
		} else {
			console.warn("graph is cyclic:", graph);
		}
	}

	_getChain(graph) {
		const last = graph.length - 1;

		return graph.reduce((chain, node, cur) => chain.then((info) => {
			if (!node.locked && node.dirty) {
				const d = Date.now();
				return node.cook().then(() => {
					const elapsed = Date.now() - d;
					info.time.push(elapsed);
					return info;
				});
			} else {
				if (cur === last) {
					info.clean = true;
				}
				return info;
			}
		}), Promise.resolve({ time: [], clean: false }));
	}

	_getSubGraph(start) {
		let graph = [];

		const unmark = (node) => {
			node.p_perm = node.p_temp = false;
		};

		const visit = (node, first=false) => {
			if (node.p_perm) {
				return true;
			}
			if (node.p_temp) {
				graph.forEach(unmark);
				graph = [];
				return false;
			}
			node.p_temp = true;
			if (!node.locked) {
				for (const ref of node.dependencies) {
					const acyclic = visit(ref);
					if (!acyclic) {
						unmark(ref);
						graph.push(ref);
						return false;
					}
				}
			}
			graph.push(node);
			if (first) {
				graph.forEach(unmark);
			} else {
				node.p_temp = false;
				node.p_perm = true;
			}
			return true;
		};

		const acyclic = visit(start, true);
		if (!acyclic) {
			unmark(start);
		}
		return { graph: graph, acyclic: acyclic };
	}
}
