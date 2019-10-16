
import { isUdf } from "../util/type";
import MyEvent from "./myEvent";

export { addEvent };

function addEvent(obj, pub, priv) {
	if (isUdf(priv)) {
		priv = "_" + pub;
	}

	const e = new MyEvent();
	obj[priv] = e;
	obj[pub] = e.interface;
}
