// Open External Links in new browser window
$(document.links).filter(function() {
 return this.hostname != window.location.hostname;
}).attr('target', '_blank');
