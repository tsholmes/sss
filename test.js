var input, output, convert, pretty;

document.onreadystatechange = function() {
  if (document.readyState != "interactive") return;
  input = document.getElementById("input");
  output = document.getElementById("output");
  convert = document.getElementById("convert");
  pretty = document.getElementById("pretty");

  convert.onclick = function() {
    output.innerText = sss(input.value,pretty.checked);
  }
}
