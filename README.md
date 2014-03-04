sss
===

A CSS preprocessor for GreatCodeClub Project #2

```
Tokens:
ws: /\*.*\*/ | //.*\n | \s+
open: {
close: {
var: @[a-zA-Z0-9\-]*
value: :
end: ;
string: [^;:{}>\s]+
```
```
Grammar:
document -> topElement*
topElement -> (varline end) | block
varLine -> var value (string | var)+
block -> selector open ((bodyLine end)* bodyLine end?)? close
selector -> (string | value)+
bodyLine -> varLine | valueLine | block
valueLine -> string value string+
```
