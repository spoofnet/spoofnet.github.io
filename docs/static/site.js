// Open External Links in new browser window
$(document.links).filter(function() {
 return this.hostname != window.location.hostname;
}).attr('target', '_blank');

// Create Magnifying Glass link for oversized images (non-hyperlinks only)
$(document).ready(function() {    
 $('.visual').find('img').each(function(i) {
  if(($(this)[0].naturalWidth > $(this.parentNode)[0].scrollWidth) && !$(this).parent().is('a')) {
   $(this).css({'cursor': 'zoom-in'});
   $(this).attr('onclick', 'window.open("' + $(this)[0].src +'", "_blank")');
  }
 });
});