/* Cheat sheet: the Print button. Theme and text size come from controls.js. */
(function () {
  var b = document.getElementById('print');
  if (b) b.addEventListener('click', function () { window.print(); });
})();
