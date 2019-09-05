
import { isUdf, isFunction, isArray } from "./type";

export { clamp, extend, removeDuplicates, partition,
         show, hide, $, isDescendant, setBooleanAttribute,
         stopBubbling, AddToEventLoop, createSVG, toPrecision };

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function extend() {
    const master = {};
    for (let i = 0, l = arguments.length; i < l; i+=1) {
        let object = arguments[i];
        for (let key in object) {
            if (object.hasOwnProperty(key)) {
                master[key] = object[key];
            }
        }
    }
    return master;
}

function removeDuplicates(arr) {
    return Array.from(new Set(arr));
}

function partition(arr, cb, thisArg) {
    if (!isArray(arr)) {
        throw new Error("Invalid argument.");
    } else if (!isFunction(cb)) {
        throw new Error("Invalid argument.");
    }

    return arr.reduce((acc, cur, index) => {
        let b;
        if (isUdf(thisArg)) {
            b = cb(cur, index, arr);
        } else {
            b = cb.call(thisArg, cur, index, arr);
        }

        acc[b?0:1].push(cur);

        return acc;
    }, [[], []]);
}

function show(elm) {
    elm.classList.remove("noshow");
}

function hide(elm) {
    elm.classList.add("noshow");
}

function $(selector, elm, all) {
    if (typeof elm === "boolean") {
        all = elm;
        elm = document;
    } else if (isUdf(elm)) {
        all = false;
        elm = document;
    } else if (isUdf(all)) {
        all = false;
    }

    if (all) {
        return elm.querySelectorAll(selector);
    } else {
        return elm.querySelector(selector);
    }
}

function isDescendant(parent, child) {
    let node = child.parentNode;
     while (node !== null) {
         if (node === parent) {
             return true;
         } else {
            node = node.parentNode;
         }
     }
     return false;
}

function setBooleanAttribute(elm, attr, b) {
    if (b) {
        elm.setAttribute(attr, attr);
    } else {
        elm.removeAttribute(attr);
    }
}

function stopBubbling(elm, ...eventNames) {
    eventNames.forEach((name) => {
        elm.addEventListener(name, (evt) => {
            evt.stopPropagation();
        });
    });
}

class AddToEventLoop {
    constructor(cb) {
        this._callback = cb;
        this._added = false;
    }

    invoke() {
        if (!this._added) {
            this._added = true;
            setTimeout(() => {
                this._callback();
                this._added = false;
            });
        }
    }
}

const createSVG = (function(){
    const SVGNS   = "http://www.w3.org/2000/svg";
    const XLINKNS = "http://www.w3.org/1999/xlink";

    function Inner (href) {
        const svg = document.createElementNS(SVGNS, "svg");
        if (href) {
            const use = document.createElementNS(SVGNS, "use");
            use.setAttributeNS(XLINKNS,"href", href);
            svg.appendChild(use);
        } else {
            console.warn("Invalid argument href:", href);
        }

        return svg;
    }

    Object.defineProperty(Inner, "SVGNS", {get: () => SVGNS});
    Object.defineProperty(Inner, "XLINKNS", {get: () => XLINKNS});

    return Inner;
})();

function toPrecision(n, p) { 
    return Number(Number.parseFloat(n).toPrecision(p));
}
