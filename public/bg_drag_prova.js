(function() {
    var ImageControl;
  
    ImageControl = (function() {
      return function() {
        this.init = function(args) {
          var imageContainer, mainContainer, patternImage, zoomSlider, zoomSliderContainer;
          this.originalArgs = args;
          mainContainer = $(args.container).css({
            position: 'relative',
            'max-width': args.containerSize,
            height: args.containerSize,
            overflow: 'hidden'
          });
          imageContainer = $('<div />').css({
            width: '97%',
            height: '97%',
            top: '4%',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'move'
          });
          patternImage = $('<div />').attr({
            class: 'pattern-background-image'
          }).css({
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            position: 'absolute',
            'background-size': "70%",
            'background-repeat': 'repeat',
            'background-position': "0% 0%",
            'background-image': `url('${args.backgroundPattern}')`
          });
          zoomSliderContainer = $("<div />").attr({
            class: 'range-slider'
          }).css({
            top: 0,
            right: 0,
            width: '100%',
            height: '2%',
            'z-index': 100000,
            position: 'absolute',
            'text-align': 'center'
          });
          zoomSlider = $("<input type='range' step='1' min='20' max='99' value='70'>").css({
            width: '50%',
            display: 'inline-block',
            '-webkit-appearance': 'none',
            'background': '#eee',
            '-webkit-tap-highlight-color': 'rgba(255, 255, 255, 0)'
          });
          zoomSliderContainer.append(zoomSlider);
          zoomSliderContainer.append("<span> <---- Zoom control </span>");
          imageContainer.append(patternImage);
          mainContainer.append(imageContainer);
          mainContainer.append(zoomSliderContainer);
          this.zoomSlider = zoomSlider;
          this.patternImage = patternImage;
          zoomSlider.on('input change', function(e) {
            var zoomVal;
            zoomVal = $(this).val();
            return imageContainer.find('.pattern-background-image').css({
              'background-size': "" + zoomVal + "%"
            });
          });
          return imageContainer.on('mousedown touchstart', function(e) {
            var containerSize, elepos, mousedown, patternBackground, patternBackgroundWidth, zoomLevel;
            e.preventDefault();
            patternBackground = $(this).find('.pattern-background-image');
            patternBackgroundWidth = patternBackground.width();
            mousedown = {
              x: e.originalEvent.pageX || e.originalEvent.touches[0].pageX,
              y: e.originalEvent.pageY || e.originalEvent.touches[0].pageY
            };
            elepos = {
              x: parseFloat(patternBackground.css("backgroundPosition").split(" ")[0].replace('%', '')),
              y: parseFloat(patternBackground.css("backgroundPosition").split(" ")[1].replace('%', ''))
            };
            zoomLevel = parseInt(zoomSlider.val());
            containerSize = parseInt(patternBackgroundWidth);
            $(document).on('mouseup touchend', function(e) {
              return $(document).unbind('mousemove touchmove');
            });
            return $(document).on('mousemove touchmove', function(e) {
              var actualMovePercentage, mousepos, movePercentage;
              mousepos = {
                x: e.originalEvent.pageX || e.originalEvent.changedTouches[0].pageX || mousedown.x,
                y: e.originalEvent.pageY || e.originalEvent.changedTouches[0].pageY || mousedown.y
              };
              if (mousedown !== mousepos) {
                movePercentage = {
                  x: (100 * (mousepos.x - mousedown.x)) / patternBackgroundWidth,
                  y: (100 * (mousepos.y - mousedown.y)) / patternBackgroundWidth
                };
                actualMovePercentage = {
                  x: (0.7 / (1 - (zoomLevel / 100))) * movePercentage.x,
                  y: (0.7 / (1 - (zoomLevel / 100))) * movePercentage.y
                };
                patternBackground.css({
                  'background-position': `${elepos.x + actualMovePercentage.x}% ${elepos.y + actualMovePercentage.y}%`
                });
              }
            });
          });
        };
      };
    })();
  
    $(document).ready(function() {
      var imageControl;
      imageControl = new ImageControl();
      imageControl.init({
        container: '.container',
        containerSize: '500px',
        backgroundPattern: 'https://cookieshq.co.uk/images/2016/06/28/background-image.jpg'
      });
    });
  
  }).call(this);