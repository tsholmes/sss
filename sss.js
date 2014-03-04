(function(root) {
  function Reader(text) {
    this.text = text;
    this.index = 0;
    this.marks = [{char:0,line:0}];
    this.char = 0;
    this.line = 0;
  }
  Reader.prototype.next = function() {
    if (this.index == this.text.length) return null;
    var ret = this.text[this.index++];
    if (ret == "\n") {
      this.char = 0;
      this.line++;
    } else {
      this.char++;
    }
    this.marks[this.index] = this.mark();
    return ret;
  }
  Reader.prototype.mark = function() {
    return {line:this.line,char:this.char};
  }
  Reader.prototype.back = function() {
    this.index = Math.max(this.index-1,0);
    var mark = this.marks[this.index];
    this.line = mark.line;
    this.char = mark.char;
  }

  var Util = {
    isws: function(c) {
      return c==" " || c=="\n" || c=="\r" || c=="\t";
    },
    isname: function(c) {
      return c && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c == "-") || (c >= "0" && c <= "9"));
    },
    isempty: function(o) {
      for (var x in o) return false;
      return true;
    }
  };

  function Scanner(reader) {
    this.reader = reader;
    this.lastws = false;
  }
  Scanner.prototype.token = function(text,type,mark) {
    return {text:text,type:type,mark:mark};
  }
  Scanner.prototype.readLineComment = function() {
    var c;
    while ((c = this.reader.next()) && c != "\n");
  }
  Scanner.prototype.readComment = function() {
    var star = false;
    while (true) {
      var c = this.reader.next();
      if (c == null) {
        this.error("unclosed comment");
      }
      if (c == "*") {
        star = true;
      } else if (c == '/' && star) {
        break;
      } else {
        star = false;
      }
    }
  }
  Scanner.prototype.readWS = function() {
    var c;
    while ((c = this.reader.next()) && Util.isws(c));
    if (c) this.reader.back();
  }
  Scanner.prototype.readName = function() {
    var ret = "";
    var c;
    while (Util.isname(c = this.reader.next())) {
      ret += c;
    }
    if (c) this.reader.back();
    return ret;
  }
  Scanner.prototype.readString = function() {
    var ret = "";
    var c;
    while (c = this.reader.next()) {
      if (c == ";" || c == ":" || c == "{" || c == "}" || c == ">" || Util.isws(c))
        break;
      ret += c;
    }
    if (c) this.reader.back();
    return ret;
  }
  Scanner.prototype.error = function(msg) {
    throw new Error("Syntax error at line " + this.mark.line + " char " + this.mark.char + ": " + msg);
  }
  Scanner.prototype.readToken = function() {
    var lastws = this.lastws;
    this.lastws = false;
    this.mark = this.reader.mark();
    var c = this.reader.next();
    if (c == null) {
      return null;
    }
    if (Util.isws(c)) {
      this.lastws = true;
      this.readWS();
      if (lastws) {
        return this.readToken();
      }
      return this.token("","ws",this.mark);
    } else if (c == "/") {
      this.lastws = true;
      c = this.reader.next();
      if (c == "/") {
        this.readLineComment();
      } else if (c == "*") {
        this.readComment();
      } else {
        this.error("Invalid comment");
      }
      if (lastws) {
        this.lastws = true;
        return this.readToken();
      }
      return this.token("","ws",this.mark);
    } else if (c == "{") {
      return this.token(c,"open",this.mark);
    } else if (c == "}") {
      return this.token(c,"close",this.mark);
    } else if (c == "@") {
      return this.token(c+this.readName(),"var",this.mark);
    } else if (c == ":") {
      return this.token(c,"value",this.mark);
    } else if (c == ";") {
      return this.token(c,"end",this.mark);
    } else {
      return this.token(c+this.readString(),"string",this.mark);
    }
  }

  function Parser(scanner) {
    this.scanner = scanner;
    this.tokens = [];
    this.marks = [];
    this.index = 0;
    this.variables = [{}];
    this.blocks = {};
  }
  Parser.prototype.token = function(skipws) {
    if(this.index < this.tokens.length) {
      var t = this.tokens[this.index++];
      if (skipws && t.type == "ws") return this.token();
      return t;
    }
    var t = this.scanner.readToken();
    if (!t) return null;
    if (this.marks.length > 0) {
      this.index++;
    } else {
      this.tokens = [];
      this.index = 1;
    }
    this.tokens.push(t);
    if (skipws && t.type == "ws") return this.token(skipws);
    return t;
  }
  Parser.prototype.mark = function() {
    this.marks.push(this.index);
  }
  Parser.prototype.reset = function() {
    if (this.marks.length > 0) {
      this.index = this.marks.pop();
    }
  }
  Parser.prototype.back = function() {
    this.index--;
  }
  Parser.prototype.error = function(t,msg) {
    throw new Error("Error at line " + t.mark.line + " char " + t.mark.char + ": " + msg);
  }
  Parser.prototype.log = function() {
    if (true) return;
    console.log.apply(console,arguments);
  }
  Parser.prototype.setVariable = function(name,value) {
    this.variables[this.variables.length-1][name] = value;
  }
  Parser.prototype.getVariable = function(name) {
    for (var i = this.variables.length; --i >= 0;) {
      if (name in this.variables[i]) {
        return this.variables[i][name];
      }
    }
    return null;
  }
  Parser.prototype.pushScope = function() {
    this.variables.push({});
  }
  Parser.prototype.popScope = function() {
    this.variables.pop();
  }
  Parser.prototype.parseValue = function() {
    this.log("ENTER parseValue");
    var ret = "";
    var v = this.token();
    this.back();
    var t = this.token(true);
    if (!t) this.error(v,"Unexpected EOF in value");
    do {
      if (t.type == "open") this.error(t,"Unexpected '{' in value");
      if (t.type == "ws") ret += " ";
      else if (t.type == "var") ret += this.getVariable(t.text);
      else ret += t.text;
    } while ((t = this.token()) && t.type != "end" && t.type != "close");
    if (!t) this.error(v,"Unexpected EOF in value");
    this.back();
    this.log("EXIT parseValue");
    return ret.trim();
  }
  Parser.prototype.parseVarLine = function() {
    this.log("ENTER parseVarLine");
    var v = this.token();
    var t = this.token(true);
    if (!t || t.type != "value") this.error(v,"Expected ':' after variable");
    var name = v.text;
    var value = this.parseValue();
    this.setVariable(name, value);
    t = this.token(true);
    if (t.type != "end") this.error(t,"Expected ';' after value");
    this.log("EXIT parseVarLine");
  }
  Parser.prototype.parseSelector = function() {
    this.log("ENTER parseSelector");
    var ret = "";
    var v = this.token();
    this.back();
    var t;
    while ((t = this.token()) && t.type != "end" && t.type != "open" && t.type != "close") {
      if (t.type == "ws") ret += " ";
      else ret += t.text;
    }
    if (!t || t.type != "open") this.error(v,"Expected '{' after selector");
    this.log("EXIT parseSelector");
    return ret.trim();
  }
  Parser.prototype.parseValueLine = function(sel) {
    this.log("ENTER parseValueLine");
    var n = this.token(true);
    if (n.type != "string") this.error(n,"Expecting property name, got: " + n.type);
    var t = this.token(true);
    if (t.type != "value") this.error(t,"Expecting ':' after property name");
    var name = n.text;
    var val = this.parseValue();
    this.log("set '" + sel + "'.'" + name + "' = '" + val + "'");
    this.blocks[sel][name] = val;
    t = this.token(true);
    if (t.type == "close") this.back();
    else if (t.type != "end") this.error(t,"Expected ';' after property value");
    this.log("EXIT parseValueLine");
  }
  Parser.prototype.parseBodyLine = function(sel) {
    this.log("ENTER parseBodyLine");
    this.mark();
    var v = this.token(true);
    this.back();

    if (v.type == "var") {
      this.parseVarLine();
      this.log("EXIT parseBodyLine");
      return true;
    }

    var statement = false;
    var t;
    while (t = this.token(true)) {
      if (t.type == "close") {
        statement = true;
        break;
      } else if (t.type == "open") {
        break;
      } else if (t.type == "end") {
        statement = true;
        break;
      }
    }
    if (!t) {
      this.log("EXIT parseBodyLine");
      return false;
    }
    this.reset();
    if (v.type == "close") {
      this.log("EXIT parseBodyLine");
      return false;
    } else if (statement) {
      this.parseValueLine(sel);
    } else {
      this.parseBlock(sel + " ");
    }
    this.log("EXIT parseBodyLine");
    return true;
  }
  Parser.prototype.parseBlock = function(path) {
    this.log("ENTER parseBlock");
    var v = this.token();
    this.back();
    this.pushScope();
    var sel = path + this.parseSelector();
    if (!(sel in this.blocks)) this.blocks[sel] = {};
    while (this.parseBodyLine(sel));
    var t = this.token(true);
    if (!t || t.type != "close") this.error(v, "Unclosed block");
    this.popScope();
    this.log("EXIT parseBlock");
  }
  Parser.prototype.parseTopElement = function() {
    this.log("ENTER parseTopElement");
    this.mark();
    var t = this.token();
    if (!t) {
      this.log("EXIT parseTopElement");
      return false;
    } else if (t.type == "ws") {
      return this.parseTopElement();
    } else if (t.type == "var") {
      this.reset();
      this.parseVarLine();
    } else if (t.type == "string" || t.type == "value") {
      this.reset();
      this.parseBlock("");
    } else {
      this.error(t,"Expected variable or selector");
    }
    this.log("EXIT parseTopElement");
    return true;
  }
  Parser.prototype.parse = function() {
    this.log("ENTER parse");
    while (this.parseTopElement());
    this.log("EXIT parse");
  }

  function MinifiedFormatter() { }
  MinifiedFormatter.prototype.format = function(blocks) {
    var ret = "";
    for (var x in blocks) {
      if (Util.isempty(blocks[x])) continue;
      ret += x + this.formatBlock(blocks[x]);
    }
    return ret;
  }
  MinifiedFormatter.prototype.formatBlock = function(block) {
    var ret = "{";
    for (var x in block) {
      ret += x + ":" + block[x] + ";";
    }
    return ret.substring(0,ret.length-1) + "}";
  }

  function PrettyFormatter() { }
  PrettyFormatter.prototype.format = function(blocks) {
    var ret = "";
    for (var x in blocks) {
      if (Util.isempty(blocks[x])) continue;
      ret += x + " " + this.formatBlock(blocks[x]);
    }
    return ret;
  }
  PrettyFormatter.prototype.formatBlock = function(obj) {
    var ret = "{\n";
    for (var x in obj) {
      ret += "  " + x + ": " + obj[x] + ";\n";
    }
    return ret + "}\n\n";
  }

  root.sss = function(text,pretty) {
    var reader = new Reader(text);
    var scanner = new Scanner(reader);
    var parser = new Parser(scanner);
    parser.parse();
    var formatter = pretty?new PrettyFormatter():new MinifiedFormatter();
    return formatter.format(parser.blocks);
  }
})((typeof module !== "undefined" && typeof module.exports !== "undefined")?module.exports:window);
