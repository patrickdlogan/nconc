/**************************************************************** 
 * PEG.js grammer for the NCONC (Scheme-ish) dialect of Lisp.
 *
 * This is a Parsing Expression Grammar, which is top-down and
 * order-dependent. This is not the same as a CFG and combines lexing
 * and parsing into one grammar.
 *
 * The default value for a match is the string that matches. Else the
 * result is the value returned by the transforming javascript block.
 *
 */

start
  = _ expression:expression _ { return expression; }

expression
  = number
  / symbol /* With a PEG grammar symbols should follow numbers to ease the definition of symbols with +, -, etc. */
  / string
  / array
  / list
  / hash
  / quoted_expression
  / boolean
  / box

quoted_expression
  = "'" _ expression:expression { return _.schemeCons(_.schemeQuote(), _.schemeCons(expression, _.schemeEmptyList())); }

boolean
  = true / false

true
  = "#t" { return true; }

false
  = "#f" { return false; }

box
  = "#&" expression:expression { return _.schemeBox(expression); }

hash
  = "{" _ "}" { return new Object(); }
  / "{" _ entries:key_and_value_maybe_more { return entries; }

key_and_value_maybe_more
  = key:(string) _ value:expression _ "}" { var hash = new Object(); hash[key] = value; return hash; }
  / key:(string) _ value:expression _ rest:key_and_value_maybe_more { rest[key] = value; return rest; }

list
  = "(" _ ")" { return _.schemeEmptyList(); }
  / "(" _ elements:list_elements { return elements; }

list_elements
  = non_delimited_list_element_maybe_more
  / self_delimited_list_element_maybe_more

non_delimited_list_element_maybe_more
  = element:(non_delimited_value) _ ")" { return _.schemeList(element); }
  / first:(non_delimited_value) whitespace+ rest:non_delimited_list_element_maybe_more { return _.schemeCons(first, rest); }
  / first:(non_delimited_value) _ rest:self_delimited_list_element_maybe_more          { return _.schemeCons(first, rest); }

non_delimited_value
  = number / symbol / boolean / box / quoted_expression

self_delimited_value
  = string / array / list / hash

self_delimited_list_element_maybe_more
  = element:(self_delimited_value) _ ")" { return _.schemeList(element); }
  / first:(self_delimited_value)   _ rest:list_elements { return _.schemeCons(first, rest); }

array
  = "[" _ "]" { return []; }
  / "[" _ elements:array_elements { return elements; }

array_elements
  = non_delimited_array_element_maybe_more
  / self_delimited_array_element_maybe_more

non_delimited_array_element_maybe_more
  = element:(non_delimited_value) _ "]" { return [element]; }
  / first:(non_delimited_value) whitespace+ rest:non_delimited_array_element_maybe_more { return [first].concat(rest); }
  / first:(non_delimited_value) _ rest:self_delimited_array_element_maybe_more          { return [first].concat(rest); }

self_delimited_array_element_maybe_more
  = element:(self_delimited_value) _ "]" { return [element]; }
  / first:(self_delimited_value)   _ rest:array_elements { return [first].concat(rest); }

symbol
  = first:initial_symbol_char+ rest:subsequent_symbol_char* {
      var name = first.join('') + rest.join('');
      return _.schemeStringToSymbol(name);
  }

initial_symbol_char
  = alpha / non_alphanum_symbol_char

subsequent_symbol_char
  = alphanum / non_alphanum_symbol_char

non_alphanum_symbol_char
  = "+"/"-"/"/"/"*"/"="/"<"/">"/"!"/"?"/"$"/"_"/"%"

alpha
  = [a-zA-Z]

alphanum
  = [a-zA-Z0-9]

number
  = int_:int frac:frac exp:exp { return parseFloat(int_ + frac + exp); }
  / int_:int frac:frac         { return parseFloat(int_ + frac);       }
  / int_:int exp:exp           { return parseFloat(int_ + exp);        }
  / int_:int                   { return parseFloat(int_);              }

int
  = digit19:digit19 digits:digits     { return digit19 + digits;       }
  / digit:digit
  / "-" digit19:digit19 digits:digits { return "-" + digit19 + digits; }
  / "-" digit:digit                   { return "-" + digit;            }

frac
  = "." digits:digits { return "." + digits; }

exp
  = e:e digits:digits { return e + digits; }

digits
  = digits:digit+ { return digits.join(""); }

e
  = e:[eE] sign:[+-]? { return e + sign; }

digit
  = [0-9]

digit19
  = [1-9]

hexDigit
  = [0-9a-fA-F]

string
  = '"' '"'             { return "";    }
  / '"' chars:chars '"' { return chars; }

chars
  = chars:char+ { return chars.join(""); }

char
  // In the original JSON grammar: "any-Unicode-character-except-"-or-\-or-control-character"
  = [^"\\\0-\x1F\x7f]
  / '\\"'  { return '"';  }
  / "\\\\" { return "\\"; }
  / "\\/"  { return "/";  }
  / "\\b"  { return "\b"; }
  / "\\f"  { return "\f"; }
  / "\\n"  { return "\n"; }
  / "\\r"  { return "\r"; }
  / "\\t"  { return "\t"; }
  / "\\u" h1:hexDigit h2:hexDigit h3:hexDigit h4:hexDigit {
      return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4));
    }

_ "whitespace"
  = whitespace*

whitespace
  = [ \t\n\r]
  / comment

comment
  = ";" (!"\n" .)*
