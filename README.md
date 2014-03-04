sss
===

A CSS preprocessor for GreatCodeClub Project #2

Tokens:
-------
```
ws: /\*.*\*/ | //.*\n | \s+
open: {
close: }
var: @[a-zA-Z0-9\-]*
value: :
end: ;
string: [^;:{}>\s]+
```
Grammar
-------
```
document -> topElement*
topElement -> (varline end) | block
varLine -> var value (string | var)+
block -> selector open ((bodyLine end)* bodyLine end?)? close
selector -> (string | value)+
bodyLine -> varLine | valueLine | block
valueLine -> string value string+
```

Usage:
------
```
var src = "SSS GOES HERE";
var formatted = false;
var css = sss(src,formatted);
var style = document.createElement("style");
style.innerText = css;
document.head.appendChild(style);
```
Example:
--------
```
@zero: 0px;
div {
  margin: @zero;
  padding: @zero;
  @fg: white;
  @bg: black;
  span {
    color: @fg;
    background-color: @bg;
  }
  a:hover {
    color: @bg;
    background-color: @fg;
  }
}
```
transforms to:
```
div {
  margin: 0px;
  padding: 0px;
}

div span {
  color: white;
  background-color: black;
}

div a:hover {
  color: black;
  background-color: white;
}
```
