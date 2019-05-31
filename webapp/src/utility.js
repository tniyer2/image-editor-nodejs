
export { noop, isUdf, wrap, bindWrap, extend, removeItem, addGetter, Vector2,
         getRandomString, show, hide, removeChildren, createSVG, setDisabled };

function noop(){}

function isUdf(a) { return typeof a === "undefined"; }

function wrap(f, ...args)
{
	return new Promise((resolve, reject) => {
		f(...args, resolve, reject);
	});
}

function bindWrap(f, context, ...args)
{
	return wrap(f.bind(context), ...args);
}

function extend()
{
    var master = {};
    for (var i = 0, l = arguments.length; i < l; i+=1) {
        var object = arguments[i];
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                master[key] = object[key];
            }
        }
    }
    return master;
}

function removeItem(arr, item)
{
    let i = arr.findIndex(n => n === item);
    if (i === -1)
    {
        return false;
    }
    else
    {
        arr.splice(i, 1);
        return true;
    }
}

function addGetter(obj, publicName, value, privateName)
{
    if (isUdf(privateName))
    {
        privateName = "_" + publicName;
    }
    if (!isUdf(value))
    {
        obj[privateName] = value;
    }
    Object.defineProperty(obj, publicName, {
        get: () => {
            return obj[privateName];
        }
    });
}

class Vector2 {
    constructor(x, y)
    {
        addGetter(this, "x", x);
        addGetter(this, "y", y);
    }

    static add(r, l)
    {
        return new Vector2(r.x + l.x, r.y + l.y);
    }

    static subtract(r, l)
    {
        return new Vector2(r.x - l.x, r.y - l.y);
    }
}

const getRandomString = (function(){
    const all = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    return function(len) {
        let s = "";
        let allLen = all.length;
        for (let i = 0; i < len; i+=1)
        {
            let rand = Math.floor(Math.random() * allLen);
            s += all.charAt(rand);
        }
        return s;
    };
})();

function show(elm)
{
	elm.classList.remove("noshow");
}

function hide(elm)
{
	elm.classList.add("noshow");
}

function removeChildren(elm)
{
    while(elm.firstChild)
    {
        elm.removeChild(elm.firstChild);
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

function setDisabled(elm, disable)
{
    if (disable)
    {
        elm.setAttribute("disabled", "disabled");
    }
    else
    {
        elm.removeAttribute("disabled");
    }
}
