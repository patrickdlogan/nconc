$(document).ready(function() {

    module("Trampoline Module");

    function fact(n) {
	return _.trampoline(fact_tramp(n, 1));
    }

    function fact_tramp(n, result) {
	if (n == 1)
	    return _.land(result);
	else
	    return _.bounce(fact_tramp, n-1, n*result);
    }

    test("trampolining", function() {
	var n1 = fact(1);
	equal(n1, 1, "fact(1) should equal 1");
	var n2 = fact(2);
	equal(n2, 2, "fact(2) should equal 2");
	var n3 = fact(3);
	equal(n3, 6, "fact(3) should equal 6");
	var n10 = fact(10);
	equal(n10, 3628800, "fact(10) should equal 3628800");
	var n1000 = fact(1000);
	equal(n1000, 4.0238726008e102567, "fact(1000)");
	var n100000 = fact(100000);
	equal(n100000, Number.POSITIVE_INFINITY, "fact(100000) sucks number-wise but does not run out of stack");
    });

    module("Reading Module");

    test("reading numbers", function() {
    	var value_int = _.schemeRead('1');
    	equal(value_int, 1, "the reader should handle integers.");
    	var value_float = _.schemeRead('1.2');
    	equal(value_float, 1.2, "the reader should handle floats.");
    	var neg = _.schemeRead('-3');
    	equal(neg, -3, "the reader should handle negative numbers");
    });

    test("reading whitespace", function() {
    	var value = _.schemeRead(' 	  54321  	  ');
    	equal(value, 54321, "the reader should read a number surrounded by whitespace.");
    });

    test("reading strings", function() {
    	var value = _.schemeRead('"hello"');
    	equal(value, "hello", "the reader should handle double-quoted strings.");
    	var empty = _.schemeRead('""');
    	equal(empty, "", "the reader should handle empty strings.");
    });

    test("reading empty arrays", function() {
    	var empty = _.schemeRead('[]');
    	deepEqual(empty, [], "the reader should handle empty arrays.");
    	var empty_with_whitespace = _.schemeRead('[ 	\t]');
    	deepEqual(empty, [], "the reader should handle empty arrays with whitespace.");
    });

    test("reading arrays of numbers", function() {
    	var size_one = _.schemeRead('[2]');
    	deepEqual(size_one, [2], "the reader should handle size one arrays.");
    	var size_one_with_whitespace = _.schemeRead(' [ 77 ] ');
    	deepEqual(size_one_with_whitespace, [77], "the reader should handle whitespace in arrays.");
    	var size_two = _.schemeRead('[42 9]');
    	deepEqual(size_two, [42, 9], "the reader should handle size two arrays.");
    	var size_two_with_whitespace = _.schemeRead('[  42 \t \n 9  ]');
    	deepEqual(size_two_with_whitespace, [42, 9], "the reader should handle whitespace in size two arrays.");
    	var size_three = _.schemeRead('[ 42 -17 9 ]');
    	deepEqual(size_three, [42, -17, 9], "the reader should handle size three arrays of numbers.");
    	var size_four = _.schemeRead('[  -17 9 155.3 43 ]');
    	deepEqual(size_four, [-17, 9, 155.3, 43], "the reader should handle size four arrays of numbers.");
    });

    test("reading arrays of strings", function() {
    	var array_with_one_string = _.schemeRead('["foo"]');
    	deepEqual(array_with_one_string, ["foo"], "the reader should handle arrays with string elements.");
    	var one_string_array_with_whitespace = _.schemeRead('[ "foo"   \t	]');
    	deepEqual(one_string_array_with_whitespace, ["foo"], "the reader should handle whitespace within arrays with string elements.");
    	var two_strings = _.schemeRead('["one" "two"]');
    	deepEqual(two_strings, ["one", "two"], "the reader should handle multiple string elements.");
    	var two_strings_no_whitespace = _.schemeRead('["one""two"]');
    	deepEqual(two_strings_no_whitespace, ["one", "two"], "the reader should handle multiple string elements without whitespace delimiters.");
    });

    test("reading symbols", function() {
    	var sym = _.schemeRead('foobar');
    	equal(_.schemeSymbolToString(sym), 'foobar', "symbols from the reader should contain the name read.");
    	ok(_.isSchemeSymbol(sym), "symbols from the reader should be interned.");
    	ok(!_.isSchemeSymbol({}), "symbols are privately typed objects.");
    	var sym2 = _.schemeRead('fooBAR');
    	strictEqual(sym, sym2, "reading the same symbol should be case-insensitive.");
        var alphanum = _.schemeRead('foo23');
    	equal(_.schemeSymbolToString(alphanum), 'foo23', "symbols should be able to include numerals after the first character.");
    	var plus = _.schemeRead('+');
    	equal(_.schemeSymbolToString(plus), "+", "symbols should be more than alphanumeric.");
    });

    test("reading mixed element arrays", function() {
    	var string_and_number = _.schemeRead('[ "one" 1]');
    	deepEqual(string_and_number, ["one", 1], "the reader should handle arrays with strings followed by numbers.");
    	var string_and_number_no_whitespace = _.schemeRead('[ "one"1]');
    	deepEqual(string_and_number_no_whitespace, ["one", 1], "the reader should handle arrays of strings followed by numbers without whitespace delimiters.");
    	var number_and_string = _.schemeRead('[  1 	\t\n\n "one" ]');
    	deepEqual(number_and_string, [1, "one"], "the reader should handle arrays with numbers followed by strings.");
    	var outer = _.schemeRead(' [ 343.34   3.2e2   "hey"   []   2   -1   [[2   3   "foo"]   12]]  ');
    	equal(outer.length, 7, "the top-level array should have seven elements.");
    	var inner = outer[6];
    	equal(inner.length, 2, "the sixth element should be an array with two elements.");
    	var sym = _.schemeStringToSymbol("symbol2symbol");
    	var string_number_symbol_string = _.schemeRead('["not a symbol" -20922.5 symbol2symbol"also not a symbol"]');
    	deepEqual(string_number_symbol_string, ["not a symbol", -20922.5, sym, "also not a symbol"], "arrays can also have symbols as elements.");
    });

    test("reading arrays of arrays", function() {
    	var array_with_empty_array = _.schemeRead('[[]]');
    	deepEqual(array_with_empty_array, [[]], "the reader should handle arrays with empty array elements.");
    	var array_with_empty_array_and_whitespace = _.schemeRead('[    \t []	]');
    	deepEqual(array_with_empty_array_and_whitespace, [[]], "the reader should handle whitespace within arrays of empty arrays.");
    	var array_of_one_element_array = _.schemeRead('[[ 2  ]]');
    	deepEqual(array_of_one_element_array, [[2]], "the reader should handle arrays of non-empty arrays");
    	var array_with_two_element_array = _.schemeRead('[[ 2 "hey" ]]');
    	deepEqual(array_with_two_element_array, [[2, "hey"]], "the reader should handle arrays of mixed-element arrays");
    	var string_and_array = _.schemeRead('["one" [ 1 \t ]]');
    	deepEqual(string_and_array, ["one", [1]], "the reader should handle an array of a string and an array.");
    	var array_and_string = _.schemeRead('[ [ 1 \t ]"one"]');
    	deepEqual(array_and_string, [[1], "one"], "the reader should handle an array of an array and a string.");
    	var number_and_array = _.schemeRead('[1 [ 1 \t ]]');
    	deepEqual(number_and_array, [1, [1]], "the reader should handle an array of a number and an array.");
    	var array_and_number = _.schemeRead('[ [ 1 \t ]22]');
    	deepEqual(array_and_number, [[1], 22], "the reader should handle an array of an array and a number.");
    	var two_arrays = _.schemeRead('[[-112.3] [ 1 \t ]]');
    	deepEqual(two_arrays, [[-112.3], [1]], "the reader should handle an array of multiple arrays.");
    	var really_nested = _.schemeRead(' [[[1] ["2"]] [4] [["5" 6]]]  ');
    	deepEqual(really_nested, [[[1], ["2"]], [4], [["5", 6]]], "the reader should handle arbitrarily nested arrays.");
    });

    test("reading lists", function() {
    	var empty = _.schemeRead('()');
    	ok(_.isSchemeEmptyList(empty), "empty parens should read as the empty list.");
    	ok(!_.isSchemeEmptyList(4), "the empty list is a special object.");
    	var empty2 = _.schemeRead('( \n\n ) \t');
    	strictEqual(empty, empty2, "the empty list should be a singleton.");
    	var list = _.schemeRead('(1)');
    	ok(_.isSchemePair(list), "the reader should handle lists of numbers.");
    	equal(_.schemeCar(list), 1, "the reader should build a list with 1 as the first element.");
    	equal(_.schemeCdr(list), _.schemeEmptyList(), "the reader should build proper lists.");
    	var size_two = _.schemeRead('  ( \t 3 "four" ) ');
    	ok(_.isSchemePair(size_two), "the reader should handle lists of size two.");
    	equal(_.schemeCar(size_two), 3, "the size two list should begin with a three.");
    	var rest = _.schemeCdr(size_two);
    	ok(_.isSchemePair(rest), "the cdr of the list should be a list.");
    	ok(!_.isSchemePair({}), "pairs should be distinguishable.");
    	equal(_.schemeCar(rest), "four", "the second element of the size two list should be a string.");
    	ok(_.isSchemeEmptyList(_.schemeCdr(rest)), "the size two list should be properly terminated.");
    	var definition = _.schemeRead('(define FOO [3 (4 5)])');
    	equal(_.schemeLength(definition), 3, "the list should have three elements.");
    	var arr = _.schemeCar(_.schemeCdr(_.schemeCdr(definition)));
    	equal(arr[0], 3, "the array in the list has the first element 3.");
    	equal(_.schemeLength(arr), 2, "the length function should work for the array in the list.");
    });

    test("reading quote", function() {
    	var expr = _.schemeRead("'foo");
    	ok(_.isSchemePair(expr), "the reader should handle a single quote as (QUOTE expr).");
    	equal(_.schemeCar(expr), _.schemeQuote(), "the reader should expand a single quote into the special form.");
    	equal(_.schemeCar(_.schemeCdr(expr)), _.schemeStringToSymbol("foo"), "the value of the special form should be the expression read.");
    	var quoted_list = _.schemeRead("' (+ 2 3 4 5)");
    	ok(_.isSchemePair(quoted_list), "the reader should read quoted lists.");
    	equal(_.schemeCar(quoted_list), _.schemeQuote(), "quoted lists should start with the symbol QUOTE.");
    	equal(_.schemeLength(_.schemeCar(_.schemeCdr(quoted_list))), 5, "the whole list should be quoted.");
	var quoted_empty = _.schemeRead("'()");
    	ok(_.isSchemePair(quoted_empty), "the reader should read quoted empty lists.");
    	equal(_.schemeCar(quoted_empty), _.schemeQuote(), "quoted empty lists should start with the symbol QUOTE.");
    	equal(_.schemeCar(_.schemeCdr(quoted_empty)), _.schemeEmptyList(), "quoted empty list should should, well, wrap the empty list in a quote.");
    });

    test("reading boxes", function() {
	var box = _.schemeRead('#&"apple"');
	ok(_.isSchemeBox(box), "the reader should handle shorthand for boxes.");
	equal(_.schemeUnbox(box), "apple", "the box should contain the given string.");
	_.schemeSetBox(box, [1, 2, 3]);
	deepEqual(_.schemeUnbox(box), [1, 2, 3], "the box should be updatable.");
    });

    test("reading hashes", function() {
    	var empty_hash = _.schemeRead('{}');
    	deepEqual(empty_hash, {}, "empty curlies should read as an empty hash.");
    	var hash_one = _.schemeRead(' {  \t\n "one" 11111 } ');
    	equal(hash_one["one"], 11111, "the reader should build hashes with key-value pairs.");
    	var hash_two = _.schemeRead(' { "two"22222"one" 11111 } ');
    	equal(hash_two["one"], 11111, "the reader should build hashes with multiple key-value pairs, one.");
    	equal(hash_two["two"], 22222, "the reader should build hashes with multiple key-value pairs, two.");
    	var arr = _.schemeRead('[ {} { "hey" [1 2 3] "ho" hohoho } "haha"]');
    	equal(_.schemeLength(arr), 3, "the reader should handle arrays with hash elements.");
    });

    test("reading comments", function() {
	raises(function() {
	    _.schemeRead('; this is a comment.');
	}, "the reader should treat comments as whitespace.");
	var nums = _.schemeRead('[1 ; one is the loneliest number.\n 2 3]');
	deepEqual(nums, [1, 2, 3], "reading a comment in the midst of an array should respond with that array.");
	var one = _.schemeRead('1 ; one');
	equal(one, 1, "the reader should ignore trailing comments.");
	var str = _.schemeRead('; ignore this comment. \n "this string is here" ; and this one too.');
	equal(str, "this string is here", "the reader should ignore leading and trailing comments.");
    });

    module("Eval Module");

    test("self-evaluating values", function() {
    	var value_int = _.schemeEval(_.schemeRead('1'));
    	equal(value_int, 1, "integers should be self-evaluating.");
    	var value_float = _.schemeEval(_.schemeRead('1.2'));
    	equal(value_float, 1.2, "floats should be self-evaluating.");
    	var neg = _.schemeEval(_.schemeRead('-3'));
    	equal(neg, -3, "negative numbers of course should also be self-evaluating");
    	var value_string = _.schemeEval(_.schemeRead('"strings are self-evaluating"'));
    	equal(value_string, "strings are self-evaluating", "strings should be self-evaluating.");
    	var empty_array = _.schemeEval(_.schemeRead('[]'));
    	deepEqual(empty_array, [], "empty arrays should be self-evaluating.");
    	var value_array = _.schemeEval(_.schemeRead('[1 2 3 4 5 6 7]'));
    	deepEqual(value_array, [1, 2, 3, 4, 5, 6, 7], "arrays should be self-evaluating.");
        var true_value = _.schemeEval(_.schemeRead('#t'));
    	strictEqual(true_value, true, "#t should be self-evaluating.");
        var false_value = _.schemeEval(_.schemeRead('#f'));
    	strictEqual(false_value, false, "#f should be self-evaluating.");
    	var empty_hash = _.schemeEval(_.schemeRead('{}'));
    	deepEqual(empty_hash, {}, "empty hashes should be equal.");
    	var value_hash = _.schemeEval(_.schemeRead('{"one" 1 "two" [2 2]}'));
	var second = value_hash["two"];
	deepEqual(second, [2, 2], "should be able to get the value for a key.");
    });

    test("evaluating quotes", function() {
	var quoted_num = _.schemeRead("'1");
	ok(_.isSchemePair(quoted_num), "the reader should read a quoted number.");
	equal(_.schemeCar(quoted_num), _.schemeQuote(), "the list should be a quoted expression.");
	equal(_.schemeCar(_.schemeCdr(quoted_num)), 1, "the quoted expression should be a number.");
	equal(_.schemeCdr(_.schemeCdr(quoted_num)), _.schemeEmptyList(), "the quoted expression should be a proper list.");
	var num = _.schemeEval(quoted_num);
	equal(typeof num, 'number', "quoted numbers should evaluate to the number.");
	var quoted_summation = _.schemeEval(_.schemeRead("'(+ 2 3 4)"));
	equal(_.schemeLength(quoted_summation), 4, "the value of a quoted list is the list itself.");
	var quoted_box = _.schemeEval(_.schemeRead(" '#&[45 yes] "));
	equal(_.schemeUnbox(quoted_box).length, 2, "quoted self-evaluating values evaluate to themselves.");
    });

    test("evaluating symbols and defining variables", function() {
	raises(function() {
	    _.schemeEval(_.schemeRead("i-am-an-unbound-symbol"));
	}, "evaluating unbound symbols should raise an exception.");
	var plus = _.schemeEval(_.schemeRead("+"));
	ok(_.isFunction(plus), "builtins should be defined in the top-level environment.");
	_.schemeEval(_.schemeRead('(define x 5)'));
	var x = _.schemeEval(_.schemeRead('x'));
	equal(x, 5, "define should establish a binding for a variable.");
	_.schemeEval(_.schemeRead('(define x "a different value")'));
	var xprime = _.schemeEval(_.schemeRead('x'));
	equal(xprime, "a different value", "a second define should rebind the variable to the new value.");
	var minus1 = _.schemeEval(_.schemeRead("(- 1)"));
	equal(minus1, -1, "the evaluator should handle procedure application.");
	_.schemeEval(_.schemeRead('(define x 10)'));
	var x = _.schemeEval(_.schemeRead("(+ 7 x x 100)"));
	equal(x, 127, "the evaluator should handle multiple arguments.");
    });

    test("evaluating if-statements", function() {
    	var one = _.schemeEval(_.schemeRead("(if #t 1 2)"));
    	equal(one, 1, "the evaluator should handle if-statements with true conditions.");
    	var two = _.schemeEval(_.schemeRead("(if #f 1 2)"));
    	equal(two, 2, "the evaluator should handle if-statements with false conditions.");
    	var three = _.schemeEval(_.schemeRead("(if 1 3)"));
    	equal(three, 3, "the evaluator should handle if-statements with truthy conditions and no else expression.");
    	var four = _.schemeEval(_.schemeRead("(if '() 4 5)"));
    	equal(four, 4, "the evaluator should handle if-statements with '() being a truthy condition.");
    	var five = _.schemeEval(_.schemeRead("(if null 5 6)"));
    	equal(five, 5, "the evaluator should handle if-statements with null being a truthy condition.");
    });

    test("evaluating lambdas", function() {
    	var lambda = _.schemeEval(_.schemeRead("(lambda (x) (- x))"));
    	ok(_.isSchemeLambda(lambda), "the evaluator should handle lambdas.");
    	var result = _.schemeEval(_.schemeRead("((lambda (x) (- x)) 2)"));
    	equal(result, -2, "the evaluator should handle procedure application.");
    	var z = _.schemeEval(_.schemeRead("(- (- (- 15)))"));
    	equal(z, -15, "the evaluator should handle nested combinations.");
    	var x1 = _.schemeEval(_.schemeRead("((lambda (y) y) (- (- (- 15))))"));
    	equal(x1, -15, "the evaluator should handle nested combinations in argument positions to lambda applications.");
    	_.schemeEval(_.schemeRead("(define x 5)"));
    	var y1 = _.schemeEval(_.schemeRead("(- 100 (- x))"));
    	equal(y1, 105, "the evaluator should be able to add and subtract.");
    	var y = _.schemeEval(_.schemeRead("((lambda (y) (- 100 (- y))) (- (- (- 15))))"));
    	equal(y, 85, "the evaluator should handle a more complex combination.");
    	var y2 = _.schemeEval(_.schemeRead("((lambda (y) y) (- (- (- -15))))"));
    	equal(y2, 15, "the evaluator should negate numbers as expected!");
    	var x = _.schemeEval(_.schemeRead("((lambda (x) (- ((lambda (y) y) (- (- (- -15)))) x)) 7)"));
    	equal(x, 8, "the evaluator should handle a somewhat complex non-recursive combination.");
	var zero = _.schemeEval(_.schemeRead("(+)"));
	equal(zero, 0, "plus with no arguments should be zero.");
    });

    test("evaluating closures", function() {
    	_.schemeEval(_.schemeRead("(define plus2 ((lambda (x) (lambda (y) (+ y x))) 2))"));
    	var n = _.schemeEval(_.schemeRead("(plus2 3)"));
    	equal(n, 5, "the evaluator should handle closures.");
    });

    test("evaluating begin", function() {
	var n = _.schemeEval(_.schemeRead("(begin 1 2 3 4)"));
	equal(n, 4, "the evaluator should handle 'begin'.");
    });

    test("evaluating tail-recursive functions", function() {
	_.schemeEval(_.schemeRead("(define fact (lambda (n) (fact-aux n 1)))"));
	_.schemeEval(_.schemeRead("(define fact-aux (lambda (n result) (if (= n 1) result (fact-aux (- n 1) (* n result)))))"));
	var n1 = _.schemeEval(_.schemeRead("(fact 1)"));
	equal(n1, 1, "scheme factorial of 1 should be 1.");
	var n2 = _.schemeEval(_.schemeRead("(fact 2)"));
	equal(n2, 2, "scheme factorial of 2 should be 2.");
	var n3 = _.schemeEval(_.schemeRead("(fact 3)"));
	equal(n3, 6, "scheme factorial of 3 should be 6.");
	var n10 = _.schemeEval(_.schemeRead("(fact 10)"));
	equal(n10, 3628800, "scheme factorial of 10 should equal 3628800");
	var n1000 = _.schemeEval(_.schemeRead("(fact 1000)"));
	equal(n1000, 4.0238726008e102567, "(fact 1000)");
    });

    test("evaluating set!", function() {
	_.schemeEval(_.schemeRead("(define x (+ 1 2 3 4 5 6 7 8 9 10))"));
	_.schemeEval(_.schemeRead("(set! x 10)"));
	var x = _.schemeEval(_.schemeRead("x"));
	equal(x, 10, "set! of a top-level definition should change the value at the top-level.");
	_.schemeEval(_.schemeRead("(define y 5)"));
	var local_y  = _.schemeEval(_.schemeRead("((lambda (y) (set! y 100) y) 3)"));
	equal(local_y, 100, "set! of a local definition should change the value at that lexical level.");
	var global_y = _.schemeEval(_.schemeRead("y"));
	equal(global_y, 5, "set! of a local definition should not change the value of the obscured binding at the top-level.");
	raises(function () {
	    _.schemeEval(_.schemeRead("(set! z 10)"));
	}, "should not be able to set! an undefined variable.");
    });

    test("evaluating primitive call/cc", function() {
	_.schemeEval(_.schemeRead("(define foo (lambda (return) (return #t) #f))"));
	var ident = _.schemeEval(_.schemeRead("(foo (lambda (x) x))"));
	ok(!ident, "should not return dynamically given the identity function.");
	var pcwcc = _.schemeEval(_.schemeRead("(primitive-cwcc foo)"));
	ok(pcwcc, "should return dynamically given the current continuation.");
	_.schemeEval(_.schemeRead("(define plus5 #f) ; We'll set plus5 to a continuation in the next expression."));
	var n = _.schemeEval(_.schemeRead("(+ 5 (primitive-cwcc (lambda (k) (set! plus5 k) 32)))"));
	equal(n, 37, "the original result.");
	var this_one_goes_to_ten = _.schemeEval(_.schemeRead("(plus5 5)"));
	equal(this_one_goes_to_ten, 10, "this one should go to ten.");
	var mine_goes_to_eleven = _.schemeEval(_.schemeRead("(plus5 6)"));
	equal(mine_goes_to_eleven, 11, "mine should go to eleven.");
    });

    module("Known Bugs Module");

    // These bugs reading boxed and quote-marked non-delimited values
    // are not yet top-priority. They probably can be fixed by
    // expanding the definition of box and quote grammars into cases
    // for non-delimited and cases for self-delimited values.

    test("known bug reading boxes", function() {
	raises(function() {
	    _.schemeRead('[1 2 #&3"string"#&[4 5 6]7]');
	}, "the reader no longer has a bug reading non-delimited values immediately following a boxed self-delimiting value.");
    });

    test("known bug reading quote marks", function() {
	raises(function() {
	    _.schemeRead("['()3]");
	}, "the reader no longer has a bug reading non-delimited values immediately following a quote-marked self-delimiting value.");
    });
});
