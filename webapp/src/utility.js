
export { noop, isUdf, init, isFunction, snap, clamp, wrap, bindWrap, warnIfError, 
         extend, removeItem, forEach, addGetter, addGetterRaw, getRandomString, 
         preventBubble, show, hide, removeChildren, createSVG, setDisabled };

function noop(){}

function isUdf(a) { return typeof a === "undefined"; }

function init(a, defaultvalue) { return isUdf(a) ? defaultValue : a; }

function isFunction(f) { return typeof f === "function"; }

function snap(a, b) { return a - (a % b); }

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function wrap(f, ...args) {
	return new Promise((resolve, reject) => {
		f(...args, resolve, reject);
	});
}

function bindWrap(f, context, ...args) {
	return wrap(f.bind(context), ...args);
}

function warnIfError(e) {
    if (!isUdf(e)) {
        console.warn(e);
    }
}

function extend() {
    let master = {};
    let object;
    for (let i = 0, l = arguments.length; i < l; i+=1) {
        object = arguments[i];
        for (let key in object) {
            if (object.hasOwnProperty(key)) {
                master[key] = object[key];
            }
        }
    }
    return master;
}

function removeItem(arr, item) {
    let i = arr.findIndex(n => n === item);
    if (i === -1) {
        return false;
    }
    else {
        arr.splice(i, 1);
        return true;
    }
}

function forEach(a, b, cb) {
    if (a.length !== b.length) {
        throw new Error("a and b must have the same length.");
    }
    for (let i = 0; i < a.length; i+=1) {
        cb(a[i], b[i]);
    }
}

function addGetter(obj, publicName, value, privateName) {
    if (isUdf(privateName)) {
        privateName = "_" + publicName;
    }
    if (!isUdf(value)) {
        obj[privateName] = value;
    }
    Object.defineProperty(obj, publicName, {
        get: () => {
            return obj[privateName];
        }
    });
}

function addGetterRaw(obj, publicName, value) {
    Object.defineProperty(obj, publicName, { get: () => value });
}

const getRandomString = (function(){
    const all = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    return function(len) {
        let s = "";
        let allLen = all.length;
        for (let i = 0; i < len; i+=1) {
            let rand = Math.floor(Math.random() * allLen);
            s += all.charAt(rand);
        }
        return s;
    };
})();

function preventBubble(elm, eventName) {
    elm.addEventListener(eventName, (evt) => {
        evt.stopPropagation();
    });
}

function show(elm) {
	elm.classList.remove("noshow");
}

function hide(elm) {
	elm.classList.add("noshow");
}

function removeChildren(elm) {
    let n;
    while ((n = elm.firstChild)) {
        elm.removeChild(n);
    }
}

const createSVG = (function(){
    const SVGNS   = "http://www.w3.org/2000/svg";
    const XLINKNS = "http://www.w3.org/1999/xlink";

    return function (href) {
        let svg = document.createElementNS(SVGNS, "svg");
        let use = document.createElementNS(SVGNS, "use");
        use.setAttributeNS(XLINKNS,"href", href);
        svg.appendChild(use);

        return svg;
    };
})();

function setDisabled(elm, disable) {
    if (disable) {
        elm.setAttribute("disabled", "disabled");
    } else {
        elm.removeAttribute("disabled");
    }
}
