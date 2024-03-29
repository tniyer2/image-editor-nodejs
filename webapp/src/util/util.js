
import { isUdf } from "./type";

export { clamp, extend, removeDuplicates,
         show, hide, $, isDescendant,
         setBooleanAttribute, stopBubbling,
         AddToEventLoop, createSVG, toPrecision,
         copyCanvas };

function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

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

    if (all === true) {
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
    if (b === true) {
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
    constructor(f) {
        this._function = f;
        this._added = false;
    }

    update() {
        if (!this._added) {
            this._added = true;
            setTimeout(() => {
                this._function();
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
        const use = document.createElementNS(SVGNS, "use");
        use.setAttributeNS(XLINKNS,"href", href);
        svg.appendChild(use);

        return svg;
    }

    Object.defineProperty(Inner, "SVGNS", {get: () => SVGNS});
    Object.defineProperty(Inner, "XLINKNS", {get: () => XLINKNS});

    return Inner;
})();

function toPrecision(n, p) { 
    return Number(Number.parseFloat(n).toPrecision(p));
}

function copyCanvas(source) {
    if (!(source instanceof HTMLCanvasElement)) {
        throw new Error("Invalid argument.");
    }

    const
        w = source.width,
        h = source.height,
        canvas = document.createElement("canvas");

    canvas.getContext("2d").drawImage(source, w, h);
    return canvas;
}
