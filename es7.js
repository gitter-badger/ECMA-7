// ECMA-7 polyfill
(function(global) {
    "use strict";

    var Symbol = global.Symbol || {};


    function assert(c, m) {
        if (!c) {
            throw Error("Internal assertion failure" + (m ? ': ' + m : ''));
        }
    }

    function defineInternal(o, p, v, override) {
        if (p in o && !override) {
            return;
        }

        if (typeof v === 'function') {
            // Sanity check that functions are appropriately named (where possible)
            assert((global.Symbol && p instanceof global.Symbol) ||
                !('name' in v) || v.name === p || v.name === p + '_', 'Expected function name "' + p + '", was "' + v.name + '"');

            Object.defineProperty(o, p, {
                configurable: true,
                enumerable: false,
                writable: true,
                value: v
            });
        } else {
            Object.defineProperty(o, p, {
                value: v,
                configurable: false,
                enumerable: false,
                writable: false
            });
        }
    }

    // 4.3.1 Data Types and Values
    function type(v) {
        switch (typeof v) {
            case 'undefined':
                return 'undefined';
            case 'boolean':
                return 'boolean';
            case 'number':
                return 'number';
            case 'string':
                return 'string';
            default:
                if (v === null) {
                    return 'null';
                }
                if (v instanceof global.Symbol) {
                    return 'symbol';
                }
                return 'object';
        }
    }

    // 6.1.5.1 Well-Known Symbols and Intrinsics
    var $$iterator = typeof Symbol !== 'undefined' && Symbol.iterator ||
        '_es7-shim iterator_';

    // 7.1.4 ToInteger
    function ToInteger(argument) {
        var number = +argument;
        if (number !== number) {
            return 0;
        }
        if (number === 0 || number === Infinity || number === -Infinity) {
            return number;
        }
        return (number >= 0 ? 1 : -1) * Math.floor(Math.abs(number));
    }

    // 7.1.6
    function ToUint32(argument) {
        return argument >>> 0;
    }

    // 7.1.13 ToObject
    function ToObject(x, optMessage) {
        /* jshint eqnull:true */
        if (x === null || x === undefined) {
            throw TypeError(optMessage || 'Cannot call method on ' + x);
        }
        return Object(x);
    }

    // 7.1.15 ToLength
    function ToLength(argument) {
        var len = ToInteger(argument);
        if (len <= 0) {
            return 0;
        }
        return Math.min(len, 0x20000000000000 - 1); // 2^53-1
    }

    // 7.2.3 SameValue( a, b )
    var SameValue = function(a, b) {
        if (a === b) {
            // 0 === -0, but they are not identical.
            if (a === 0) {
                return 1 / a === 1 / b;
            }
            return true;
        }
        return isNaN(a) && isNaN(b);
    };


    // 9.1.13 ObjectCreate(proto, internalDataList)
    function ObjectCreate(proto, internalDataList) {
        return Object.create(proto, internalDataList);
    }

    // DRAFTS / PROPOSALS / SUGGESTIONS
    // ================================

    // Compare

    defineInternal(
        Number,
        'compare',
        function compare(first, second, tolerance) {
            var difference = first - second;
            return Math.abs(difference) <= (tolerance || 0) ? 0 : difference < 0 ? -1 : 1;
        });

    // getPropertyDescriptor

    defineInternal(
        Object, 'getPropertyDescriptor',
        function getPropertyDescriptor(o, p) {
            do {
                var desc = Object.getOwnPropertyDescriptor(o, p);
                if (desc) {
                    return desc;
                }
                o = Object.getPrototypeOf(o);
            } while (o);
            return undefined;
        });

    // getPropertyNames

    defineInternal(
        Object, 'getPropertyNames',
        function getPropertyNames(o) {
            var names = ObjectCreate(null);
            do {
                Object.getOwnPropertyNames(o).forEach(function(name) {
                    names[name] = true;
                });
                o = Object.getPrototypeOf(o);
            } while (o);
            return Object.keys(names);
        });

    // getOwnPropertyDescriptors

    defineInternal(
        Object, 'getOwnPropertyDescriptors',
        function getOwnPropertyDescriptors(o) {
            var obj = ToObject(o),
                keys = Object.getOwnPropertyNames(obj),
                descriptors = {},
                i = 0,
                len = keys.length;
            for (; i < len; ++i) {
                var nextKey = keys[i],
                    desc = Object.getOwnPropertyDescriptor(obj, nextKey);
                descriptors[nextKey] = desc;
            }
            return descriptors;
        });

    // pushAll

    defineInternal(
        Array.prototype, 'pushAll',
        function pushAll(other, start, end) {
            other = ToObject(other);
            if (start === undefined) {
                start = 0;
            }
            start = ToUint32(start);
            var otherLength = ToUint32(other.length);
            if (end === undefined) {
                end = otherLength;
            }
            end = ToUint32(end);
            var self = ToObject(this),
                length = ToUint32(self.length),
                i = 0,
                j = length;

            for (; i < end; i++, j++) {
                self[j] = other[i];
            }
            self.length = j;
            return;
        });

    // https://github.com/domenic/Array.prototype.contains/
    // TC39 2014-11 renamed to 'includes'
    defineInternal(
        Array.prototype, 'includes',
        function includes(target /*, fromIndex*/ ) {
            if (this === undefined || this === null) {
                throw new TypeError('Cannot convert this value to object');
            }

            var obj = Object(this),
                len = parseInt(obj.length) || 0;

            if (len < 1) {
                return false;
            }
            var from = Math.floor(arguments[1] || 0);
            // In ECMA 6 max length is 2^53-1, currently limited to 2^32-1
            if (from >= len || from > 0xFFFFFFFF) {
                return false;
            }

            if (from < 0) {
                from = len + from;
            }
            if (from === -Infinity || from < 0) {
                from = 0;
            }

            var check;

            if (from >= 0) {
                check = from;
            } else {
                check = len + Math.abs(from);
                if (check < 0) {
                    check = 0;
                }
            }
            while (check < len) {
                var currentElement = obj[check];
                if (target === currentElement ||
                    target !== target && currentElement !== currentElement
                ) {
                    return true;
                }
                check += 1;
            }
            return false;
        });

    // Values

    defineInternal(
        Object, 'values',
        function values(o) {
            return Object.keys(o).map(function(p) {
                return o[p];
            });
        });

    // Entries

    defineInternal(
        Object, 'entries',
        function entries(o) {
            return Object.keys(o).map(function(p) {
                return [p, o[p]];
            });
        });

    // Escape

    defineInternal(
        RegExp, 'escape',
        function escape(s) {
            return String(s).replace(/[^a-zA-Z0-9]/g, '\\$&');
        });

    // at

    defineInternal(
        String.prototype, 'at',
        function at(pos) {
           var s = String(this),
                position = ToInteger(pos),
                size = s.length;
            if (position < 0 || position >= size) {
                return '';
            }
            var first = s.charAt(position),
                cuFirst = first.charCodeAt(0);

            if (cuFirst < 0xD800 || cuFirst > 0xDBFF || position + 1 === size) {
                return first;
            }

            var cuSecond = s.charCodeAt(position + 1);

            if (cuSecond < 0xDC00 || cuSecond > 0xDFFF) {
                return first;
            }

            var second = s.charAt(position + 1),
                cp = (first - 0xD800) * 0x400 + (second - 0xDC00) + 0x10000;
            return String.fromCharCode(cuFirst, cuSecond);
        });

    // lpad
    defineInternal(
        String.prototype, 'lpad',
        function lpad() {
            var minLength = arguments[0],
                fillStr = arguments[1];

            var s = String(this);

            if (minLength === undefined) {
                return s;
            }
            var intMinLength = ToInteger(minLength),
                fillLen = intMinLength - s.length;

            if (fillLen < 0) {
                throw new RangeError();
            }

            if (fillLen === Infinity) {
                throw new RangeError();
            }

            var sFillStr = String(fillStr);
            if (fillStr === undefined) {
                sFillStr = ' ';
            }
            var sFillVal = '';
            while (sFillVal.length < fillLen) {
                sFillVal += sFillStr;
            }
            return sFillVal + s;
        });

    // rpad

    defineInternal(
        String.prototype, 'rpad',
        function rpad() {
            var minLength = arguments[0],
                fillStr = arguments[1];

            var s = String(this);

            if (minLength === undefined) {
                return s;
            }

            var intMinLength = ToInteger(minLength),
                fillLen = intMinLength - s.length; // NOTE: Wiki is bogus here

            if (fillLen < 0) {
                throw new RangeError();
            }

            if (fillLen === Infinity) {
                throw new RangeError();
            }

            var sFillStr = String(fillStr);

            if (fillStr === undefined) sFillStr = ' '; // NOTE: Wiki is bogus here

            var sFillVal = '';

            while (sFillVal.length < fillLen) {
                sFillVal += sFillStr;
            }

            return s + sFillVal;
        });

    var MIN_NORMALIZED_F32 = Math.pow(2, -126);
    var MIN_NORMALIZED_F64 = Math.pow(2, -1022);

    // denormz

    defineInternal(
        Math, 'denormz',
        function denormz(x) {
            if (x > 0 && x < MIN_NORMALIZED_F64) {
                return 0;
            }
            if (x < 0 && x > -MIN_NORMALIZED_F64) {
                return -0;
            }
            return x;
        });

    // fdenormz

    defineInternal(
        Math, 'fdenormz',
        function fdenormz(x) {
            if (x > 0 && x < MIN_NORMALIZED_F32) {
                return 0;
            }
            if (x < 0 && x > -MIN_NORMALIZED_F32) {
                return -0;
            }
            return x;
        });

}(this));