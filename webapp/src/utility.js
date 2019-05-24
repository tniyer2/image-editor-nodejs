
export { noop, isUdf, isFunction, wrap, bindWrap, extend, addGetter, show, hide };

function noop(){} // eslint-disable-line no-empty-function

function isUdf(a) { return typeof a === "undefined"; }

function isFunction(f) { return f && {}.toString.call(f) === "[object Function]"; }

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

function addGetter(obj, publicName, privateName, value)
{
    obj[privateName] = value;

    Object.defineProperty(obj, publicName, {
        get: () => {
            return obj[privateName];
        }
    });
}

const cl_hide = "noshow";
function show(elm)
{
	elm.classList.remove(cl_hide);
}

function hide(elm)
{
	elm.classList.add(cl_hide);
}
