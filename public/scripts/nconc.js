// **NCONC** is a Scheme interpreter written in Javascript. The primary features at this point are:
//
// * Tail recursion does not grow the Javascript stack. (i.e. "TCO" - Tail Call Optimization)
// * Full continuations and `call-with-current-continuation` (aka `call/cc`)
//
// ## Missing at this point:
//
// * Macros
// * Printing
// * Everything else that's easily implemented in every interpreter for every language (e.g. the standard libraries)
//
// ## Implemented:
//
// ### `call-with-current-continuation`
//
// Most implementations of Scheme found on the web will state they
// implement "almost all of Scheme" *except* for full continuations,
// and often except for efficient tail calls. The problem with this is
// the essence of Scheme is, truly, full continuations and efficient
// tail calls.
//
// Implementing simple mechanisms for full continuations and efficient
// tail calls is not difficult. My impression is most language
// implementers are just unfamiliar with these
// mechanisms. Additionally, most programmers are just unfamiliar with
// the utility of these features.
//
// Most Scheme programs will run fine without full continuations. But
// most of the interesting, uniquely-Scheme programs would be
// cumbersome at best, if not impossible, to implement without access
// to continuations.
//
// And so NCONC's *current* purpose is not to provide anything
// approximating a usable Scheme system. Rather it is currently
// intended to demonstrate how full continuations can be implemented
// in a small number of lines of Javascript. The same mechanism (a
// trampoline) can be applied in a significantly more efficient
// interpreter or compiler, and without much more difficulty.
//
// ## Why 'NCONC'?
//
// `NCONC` is from Mac Lisp (and so Common Lisp) - rather than
// Scheme.
//
//     (DEFUN NCONC (&OPTIONAL (L1 NIL) (L2 NIL L2?) &REST MORE)
//       (COND ((NOT L2?) L1)
//             ((NULL MORE) (*NCONC L1 L2)) ;defined elsewhere in this manual
//             (T (*NCONC L1 (LEXPR-FUNCALL #'NCONC L2 MORE)))))
//
// But Scheme has `SET-CDR!` and so `NCONC!` could be defined in
// Scheme. [SRFI 1 (List Library)](http://srfi.schemers.org/srfi-1/
// "Scheme SRFI 1 (List Library)") defines `APPEND!` which is
// essentially `NCONC`.
//
//     ;; Untested as of yet...
//     (define append! lists
//       (define (append-aux! l1 l2 . rest)
//         (set-cdr! l1 l2)
//         (if (not (null? rest))
//           (append-aux! l1 (car rest) (cdr rest))))
//       (case (length lists) 
//         ((0) '())
//         ((1) (car lists))
//         (else (append-aux! (car lists) (cadr lists) (cddr lists)))))
//
// However calling this project `APPEND!` would not be nearly as fun
// as `NCONC`. The word is not only fun to pronounce, it should imply
// the techniques here (or alternatives) should be used to alter the
// tails of all Scheme interpreters and compilers. Saying no to the
// ['expensive procedure call
// myth'](http://library.readscheme.org/page1.html "The Original 'Lambda Papers' by Guy Steele and Gerald Sussman") has been a foundation of Scheme for well over 30 years.

(function() {

    // Some unique objects for the implementation. Not much interesting here.

    var _empty_list 	= {};
    var _symbol_tag 	= {};
    var _box_tag    	= {};
    var _pair_tag   	= {};
    var _bounce_tag     = {};
    var _symbols    	= {};

    // `_primitive_cwcc` is an object representing the Scheme
    // procedure `call-with-current-continuation`. This is called
    // *primitive* here because by the time it is bound to it's Scheme
    // name it will have been wrapped to provide `dynamic-wind`
    // functionality. **(`dynamic-wind` is not yet implemented.)**
    var _primitive_cwcc = {is_primitive_cwcc:true};

    // This is the top-level lexical environment where the standard
    // procedures are bound.
    var _top_level = {_parent:null};

    // A *trampoline* avoids growing the Javascript stack by using a
    // *bouncer*. The trampoline is given an initial bouncer. A
    // bouncer ready to bounce has an array (possibly empty) of
    // arguments. The trampoline applies these arguments to the
    // bouncer. The bouncer does some work and returns a(nother)
    // bouncer. This loop continues forever until the trampoline
    // encounters a bouncer ready to land. A bouncer that lands has a
    // value, and the trampoline returns this value to its caller.
    function _trampoline(bouncer, ticks) {
	var ticker = ticks;
	while (true) {
	    if (bouncer.hasOwnProperty('land')) {
		return bouncer.land;
	    } else if (ticker == 0) {
		return bouncer;
	    } else if (bouncer.bounce) {
		bouncer = bouncer.bounce.apply(null, bouncer.argv);
		ticker--;
	    } else {
		throw "a trampoline bouncer must bounce or land: " + bouncer;
	    }
	}
    }

    // Call `_bounce` with any number of arguments. Makes a bouncer
    // ready to bounce with an array of those arguments.
    //
    // Each specific bouncer's `fn` determines when it will return the
    // next bouncer to the trampoline. A bouncer that performs more
    // work requires less bouncing overhead. This is somewhat
    // like "loop unrolling" by a compiler in order to execute N
    // iterations of a loop without branching.
    //
    // In a single-threaded Javascript runtime though, this can starve
    // other event-driven callbacks from executing.
    //
    // A *fair* trampoline (not implemented yet for NCONC) will yield
    // time back to the runtime, e.g. setting a timer to continue the
    // trampoline later.
    function _bounce() {
	var fn = arguments[0];
	var argv = _.toArray(arguments).slice(1);
	return {bounce: fn, argv: argv, tag: _bounce_tag};
    }

    // Call `_land` with a single value. Makes a bouncer ready to land
    // with that value.
    function _land(value) {
	return {land: value};
    }

    var request_topic = "topk.it.nconc.eval.request";
    var reply_topic   = "topk.it.nconc.eval.reply";
    var ticks = 1000;

    function publishResult(result, id) {
	var topic = reply_topic + "." + id;
	var reply = {value: result, id: id};
	PageBus.publish(topic, reply);
    }

    function monitorEval(bouncer, id) {
	var result = _trampoline(bouncer, ticks);
	if (result && result.tag && result.tag === _bounce_tag) {
	    _.delay(monitorEval, 5, result, id);
	} else {
	    publishResult(result, id);
	}
    }

    function onRequest(topic, msg, data) {
	if (_.isUndefined(msg.form)) {
	    var id   = (_.isUndefined(msg.id)) ? msg.id : _.uniqueId("reply_");
	    var topic = reply_topic + "." + id;
	    var reply = {error: "An NCONC eval request requires a form key.", id: id};
	    PageBus.publish(topic, reply);
	} else {
	    var form = msg.form;
	    var id   = (_.isUndefined(msg.id)) ? _.uniqueId("reply_") : msg.id;
	    var result = _eval(form, _top_level, ticks);
	    if (result && result.tag && result.tag === _bounce_tag) {
		_.delay(monitorEval, 5, result, id);
	    } else {
		publishResult(result, id);
	    }
	}
    }

    PageBus.subscribe(request_topic, null, onRequest, null);

    function _extendEnv(parv, argv, parent_env) {
	var env = _.clone({_parent:parent_env});
	_.each(_.zip(parv, argv), function (pairv) {
	    var sym = pairv[0];
	    var val = pairv[1];
	    env[sym._name] = _bind(sym, val);
	});
	return env;
    }

    function _stringToSymbol(str) {
	if (!_.isString(str)) { throw "expected a string: " + str; }
	var lower = str.toLowerCase();
	return _intern(_.clone({_tag:_symbol_tag, _name:lower}));
    }

    function _symbolToString(sym) {
	if (!_isSymbol(sym)) { throw "expected a scheme symbol: " + sym; }
	return sym._name;
    }

    function _isSymbol(x) {
	return x && x._tag && x._tag === _symbol_tag;
    }

    function _intern(sym) {
	if (!_isSymbol(sym)) { throw "expected a scheme symbol: " + sym; }
	var result = _symbols[sym._name];
	if (!result) {
	    result = sym;
	    _symbols[sym._name] = sym;
	}
	return result;
    }

    function _cons(car, cdr) {
	return _.clone({_tag:_pair_tag, _car:car, _cdr:cdr});
    }

    function _list(obj) {
	return _cons(obj, _empty_list);
    }

    function _car(pair) {
	if (!_isPair(pair)) { throw "expected a scheme pair: " + pair; }
	return pair._car;
    }

    function _cdr(pair) {
	if (!_isPair(pair)) { throw "expected a scheme pair: " + pair; }
	return pair._cdr;
    }

    function _isEmptyList(x) {
	return x === _empty_list;
    }

    function _isPair(x) {
	return x && x._tag && x._tag === _pair_tag;
    }

    function _first(list) {
	if (_.isArray(list) && list.length > 0) {
	    return list[0];
	} else if (_isPair(list)) {
	    return _car(list);
	} else {
	    throw "expected a list or an array: " + list;
	}
    }

    function _second(list) {
	if (_.isArray(list) && list.length > 1) {
	    return list[1];
	} else if (_isPair(list)) {
	    return _car(_cdr(list));
	} else {
	    throw "expected a list or an array: " + list;
	}
    }

    function _third(list) {
	if (_.isArray(list) && list.length > 2) {
	    return list[2];
	} else if (_isPair(list)) {
	    return _car(_cdr(_cdr(list)));
	} else {
	    throw "expected a list or an array: " + list;
	}
    }

    function _fourthOrFalse(list) {
	var result = false;
	try {
	    result = _fourth(list);
	} catch (ex) {}
	return result;
    }

    function _fourth(list) {
	if (_.isArray(list) && list.length > 3) {
	    return list[3];
	} else if (_isPair(list)) {
	    return _car(_cdr(_cdr(_cdr(list))));
	} else {
	    throw "expected a list or an array: " + list;
	}
    }

    function _listLength(pair, n) {
	n = (_.isUndefined(n)) ? 1 : n+1;
	var cdr = _cdr(pair);
	while (_isPair(cdr)) {
	    n++;
	    cdr = _cdr(cdr);
	}
	return n;
    }

    function _length(obj) {
	if (_.isArray(obj))
	    return obj.length;
	if (_isPair(obj))
	    return _listLength(obj);
	if (_isEmptyList(obj))
	    return 0;
	return _.size(obj);
    }

    function _minus() {
	if (arguments.length < 1) { throw "- expects at least one number: " + arguments; }
	var first  = arguments[0];
	var rest   = _.toArray(arguments).slice(1);
	if (rest.length == 0) {
	    return -first;
	} else {
	    return _.reduce(rest, function(memo, n) {
		return memo - n;
	    }, first);
	}
    }

    function _plus() {
	return _.reduce(arguments, function(memo, n) {
	    return memo + n;
	}, 0);
    }

    function _mult() {
	return _.reduce(arguments, function(memo, n) {
	    return memo * n;
	}, 1);
    }

    function _equal() {
	if (arguments.length < 2) { throw "= expects at least two numbers: " + arguments; }
	var argv = _.toArray(arguments);
	if (!_.all(argv, _.isNumber)) { throw "= expects all arguments to be numbers: " + argv; }
	var first = argv[0];
	var rest  = argv.slice(1);
	return _.all(rest, function(n) {
	    return first == n;
	});
    }

    function _listToVector(list) {
	var result = [];
	var next = list;
	while (_isPair(next)) {
	    result.push(_car(next));
	    next = _cdr(next);
	}
	if (!_isEmptyList(next)) { throw "expected a proper list: " + list; }
	return result;
    }

    function _identity(x) {
	return x;
    }

    function _bind(sym, val) {
	return _.clone({_symbol: sym, _value:val });
    }

    function _findBinding(str, env) {
	var e = env;
	var b = e[str];
	while (_.isUndefined(b) && !_.isNull(e._parent)) {
	    e = e._parent;
	    b = e[str];
	}
	return b;
    }

    function _evalSymbol(sym, env, k) {
	var b = _findBinding(sym._name, env);
	if (!b) { throw "the symbol is unbound: " + ((sym._name) ? sym._name : sym); }
	return k(b._value);
    }

    function _evalAssignment(sym, form, env, k) {
	var k_prime = function(val) {
	    var b = _findBinding(sym._name, env);
	    if (!b) { throw "cannot set! and undefined variable: " + sym._name; }
	    b._value = val;
	    return k(val);
	}
	return _bounce(_evalTramp, form, env, k_prime);
    }

    function _evalDefine(sym, form, env, k) {
	var k_prime = function(val) {
	    env[sym._name] = _bind(sym, val);
	    return k(val);
	}
	return _bounce(_evalTramp, form, env, k_prime);
    }

    function _makeBeginRestK(rest, env, k) {
	return function(val) {
	    var n = _car(rest);
	    var r = _cdr(rest);
	    var k_prime = (_isEmptyList(r)) ? k : _makeBeginRestK(r, env, k);
	    return _bounce(_evalTramp, n, env, k_prime);
	}
    }

    function _evalBegin(forms, env, k) {
	var next = _car(forms);
	var rest = _cdr(forms);
	var k_prime = (_isEmptyList(rest)) ? k : _makeBeginRestK(rest, env, k);
	return _bounce(_evalTramp, next, env, k_prime);
    }

    function _isProcedure(x) {
	return _.isFunction(x) || x.is_lambda || x.is_primitive_cwcc;
    }

    function _apply(proc, argv, env, k) {
	if (proc.is_lambda) {
	    // Not implemented yet... need an environment stack.
	    // var dynamic_env = env;
	    var lexical_env = proc.env;
	    var env_prime   = _extendEnv(proc.params, argv, lexical_env);
	    return _bounce(_evalTramp, proc.body, env_prime, k);
	} else if (proc.is_primitive_cwcc) {
	    if (argv.length != 1) { throw "call-with-current-continuation expects one argument: " + sexpr; }
	    var p = argv[0];
	    if (!_isProcedure(p)) { throw "call-with-current-continuation expects a procedure: " + sexpr; }
	    k.is_continuation = true;
	    return _apply(p, [k], env, k);
	} else if (proc.is_continuation) {
	    var v = argv[0];
	    return proc(v);
	} else {
	    var result = proc.apply(null, argv);
	    return k(result);
	}
    }

    function _makeCombRestK(argv, rest, env, k) {
	return function(val) {
	    var n = _car(rest);
	    var r = _cdr(rest);
	    var a = argv.concat(val);
	    var k_prime = (_isEmptyList(r)) ? _makeCombApplyK(a, env, k) : _makeCombRestK(a, r, env, k);
	    return _bounce(_evalTramp, n, env, k_prime);
	}
    }

    function _makeCombApplyK(argv, env, k) {
	return function(val) {
	    var proc = null;
	    var a = [];
	    if (argv.length == 0) {
		proc = val;
	    } else {
		proc = argv[0];
		a = argv.slice(1);
		a.push(val);
	    }
	    return _apply(proc, a, env, k);
	}
    }

    function _evalCombination(sexpr, env, k) {
	var argv  = [];
	var next = _car(sexpr);
	var rest  = _cdr(sexpr);
	var k_prime = (_isEmptyList(rest)) ? _makeCombApplyK([], env, k) : _makeCombRestK([], rest, env, k);
	return _bounce(_evalTramp, next, env, k_prime);
    }

    function _evalIf(conditional, then_form, else_form, env, k) {
	var k_prime = function(val) {
	    var consequent = (val !== false) ? then_form : else_form;
	    return _bounce(_evalTramp, consequent, env, k);
	}
	return _bounce(_evalTramp, conditional, env, k_prime);
    }

    function _evalLambda(sexpr, env, k) {
	var proc = _.clone({is_lambda:true});
	proc.params = _listToVector(_second(sexpr));
	var forms   = _cdr(_cdr(sexpr));
	var n = _length(forms);
	if (n == 1) {
	    proc.body = _car(forms);
	} else {
	    proc.body = _cons(_begin, forms);
	}
	proc.env = env;
	return k(proc);
    }

    function _evalTramp(sexpr, env, k) {
	if (_isSymbol(sexpr)) {
	    return _evalSymbol(sexpr, env, k);
	} else if (_isPair(sexpr)) {
	    var first = _car(sexpr);
	    if (first === _quote) {
		return k(_second(sexpr));
	    } else if (first === _define) {
		var def_sym  = _second(sexpr);
		var def_form = _third(sexpr);
		return _evalDefine(def_sym, def_form, env, k);
	    } else if (first === _set) {
		var set_sym  = _second(sexpr);
		var set_form = _third(sexpr);
		return _evalAssignment(set_sym, set_form, env, k);
	    } else if (first === _if) {
		var conditional = _second(sexpr);
		var then_form   = _third(sexpr);
		var else_form   = _fourthOrFalse(sexpr);
		return _evalIf(conditional, then_form, else_form, env, k);
	    } else if (first === _lambda) {
		return _evalLambda(sexpr, env, k);
	    } else if (first === _begin) {
		return _evalBegin(_cdr(sexpr), env, k);
	    } else {
		return _evalCombination(sexpr, env, k);
	    }
	} else {
	    return k(sexpr);
	}
    }

    function _eval(sexpr, env, ticks) {
	return _trampoline(_evalTramp(sexpr, env, _land), ticks);
    }

    function _define(symbol, func) {
	_top_level[symbol] = _bind(_stringToSymbol(symbol), func);
    }

    _.mixin({
	trampoline: _trampoline,
	bounce:     _bounce,
	land:       _land,
	schemeRead: function(str) {
	    return parser.parse(str);
	},
	schemeEmptyList: function() {
	    return _empty_list;
	},
	schemeQuote: function() {
	    return _quote;
	},
	schemeBox: function(x) {
	    return _.clone({_tag:_box_tag, _contents:x});
	},
	schemeUnbox: function(box) {
	    if (!_.isSchemeBox(box)) { throw "expected a scheme box: " + box; }
	    return box._contents;
	},
	schemeSetBox: function(box, x) {
	    if (!_.isSchemeBox(box)) { throw "expected a scheme box: " + box; }
	    box._contents = x;
	},
	isSchemeBox: function(x) {
	    return x && x._tag && x._tag === _box_tag;
	},
	isSchemeLambda: function(x) {
	    return !!x.is_lambda;
	},
	schemeEval: function(sexpr, options) {
	    var opts = (options) ? options : {};
	    var sexpr = arguments[0];
	    var env   = opts['env'];
	    var ticks = opts['ticks'];
	    if (!ticks) {
		ticks = -1;
	    }
	    return _eval(sexpr, env || _top_level, ticks);
	},
	schemeList:           _list,
	schemeStringToSymbol: _stringToSymbol,
	schemeSymbolToString: _symbolToString,
	isSchemeSymbol:       _isSymbol,
	isSchemeEmptyList:    _isEmptyList,
	isSchemePair:         _isPair,
	schemeCons:   	      _cons,
	schemeCar:    	      _car,
	schemeCdr:    	      _cdr,
	schemeLength: 	      _length,
	schemeListToVector:   _listToVector,
	define: _define
    });

    var _scheme_builtins = {
	"*":_mult,
	"+":_plus,
	"-":_minus,
	"=":_equal,
	"primitive-cwcc":_primitive_cwcc,
	"null":null
    };

    _.each(_scheme_builtins, function(value, key) {
	_define(key, value);
    });

    var _begin   = _stringToSymbol("begin");
    var _define  = _stringToSymbol("define");
    var _if      = _stringToSymbol("if");
    var _lambda  = _stringToSymbol("lambda");
    var _quote   = _stringToSymbol("quote");
    var _set     = _stringToSymbol("set!");

}());
