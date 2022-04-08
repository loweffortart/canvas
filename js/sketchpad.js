// ------------------------------------------------
// Util functions
// ------------------------------------------------
  function onLongPress(element, callback) {
    let timer;

    element.addEventListener('touchstart', () => { 
      this._sketching = true;
      timer = setTimeout(() => {
        timer = null;
        callback();
      }, 300);
    });

    function cancel() {
      clearTimeout(timer);
      this._sketching = false;
    }

    element.addEventListener('touchend', cancel);
    element.addEventListener('touchmove', cancel);
  }


// ------------------------------------------------
// Sketchpad (MIT Licence)
// https://github.com/yiom/sketchpad/blob/master/scripts/sketchpad.js
// ------------------------------------------------

function Sketchpad(config) {
  // Enforces the context for all functions
  for (var key in this.constructor.prototype) {
    this[key] = this[key].bind(this);
  }

  // Warn the user if no DOM element was selected
  if (!config.hasOwnProperty('element')) {
    console.error('SKETCHPAD ERROR: No element selected');
    return;
  }

  this.element = config.element;

  // Width can be defined on the HTML or programatically
  this._width = config.scale * config.width;
  this._height = config.scale * config.height;

  // Pen attributes
  this.color = '#000000';
  this.penSize = 0;
  this.basePenSize = 5 * config.scale;

  // Stroke control variables
  this.strokes = [];
  this._currentStroke = {
    color: null,
    size: null,
    lines: [],
  };

  // Undo History
  this.undoHistory = [];

  // Animation function calls
  this.animateIds = [];

  // Set sketching state
  this._sketching = false;

  // Setup canvas sketching listeners
  this.reset();
}

//
// Private API
//

// [!!] needed to scale canvas height properly
// https://stackoverflow.com/questions/42041233/incorrect-mouse-position-on-html-canvas-when-having-a-navigation-bar
Sketchpad.prototype._cursorPosition = function(event) {
  let bounds = this.canvas.getBoundingClientRect();
  let x = event.pageX - bounds.left - scrollX;
  let y = event.pageY - bounds.top - scrollY;
  return {
    x: x/bounds.width*this.canvas.width ,
    y: y/bounds.height*this.canvas.height,
  }
};

Sketchpad.prototype._draw = function(start, end, color, size) {
  this._stroke(start, end, color, size, 'source-over');
};

Sketchpad.prototype._erase = function(start, end, color, size) {
  this._stroke(start, end, color, size, 'destination-out');
};

Sketchpad.prototype._stroke = function(start, end, color, size, compositeOperation) {
  this.context.save();
  this.context.lineJoin = 'round';
  this.context.lineCap = 'round';
  this.context.strokeStyle = color;
  this.context.lineWidth = size;
  this.context.globalCompositeOperation = compositeOperation;
  this.context.beginPath();
  this.context.moveTo(start.x, start.y);
  this.context.lineTo(end.x, end.y);
  this.context.closePath();
  this.context.stroke();

  this.context.restore();
};

//
// Callback Handlers
//

Sketchpad.prototype._mouseDown = function(event) {
  this._lastPosition = this._cursorPosition(event);
  this._currentStroke.color = this.color;
  this._currentStroke.size = this.penSize;
  this._currentStroke.lines = [];
  this._sketching = true;
  this.canvas.addEventListener('mousemove', this._mouseMove);
};

Sketchpad.prototype._mouseUp = function(event) {
  if (this._sketching) {
    this.strokes.push($.extend(true, {}, this._currentStroke));
    this._sketching = false;
  }
  this.canvas.removeEventListener('mousemove', this._mouseMove);
};

Sketchpad.prototype._mouseMove = function(event) {
  var currentPosition = this._cursorPosition(event);

  this._draw(this._lastPosition, currentPosition, this.color, this.penSize);
  this._currentStroke.lines.push({
    start: $.extend(true, {}, this._lastPosition),
    end: $.extend(true, {}, currentPosition),
  });

  this._lastPosition = currentPosition;
};

Sketchpad.prototype._touchStart = function(event) {
  event.preventDefault();
  if (this._sketching) {
    return;
  }

  this._lastPosition = this._cursorPosition(event.changedTouches[0]);
  this._currentStroke.color = this.color;
  this._currentStroke.size = this.penSize;
  this._currentStroke.lines = [];
  this._sketching = true;
  this.canvas.addEventListener('touchmove', this._touchMove, false);
};

Sketchpad.prototype._touchEnd = function(event) {
  event.preventDefault();
  if (this._sketching) {

    // [!!] Enable dots
    if (this._currentStroke.lines.length==0){
      let pos = this._lastPosition
      let line = {
        'start': {'x':pos.x, 'y':pos.y},
        'end': {'x':pos.x, 'y':pos.y+1}
      }
      this._currentStroke.lines.push(line)
      this.drawStroke(this._currentStroke);
    }

    this.strokes.push($.extend(true, {}, this._currentStroke));
    this._sketching = false;
  }
  this.canvas.removeEventListener('touchmove', this._touchMove);
};

Sketchpad.prototype._touchCancel = function(event) {
  event.preventDefault();
  if (this._sketching) {
    this.strokes.push($.extend(true, {}, this._currentStroke));
    this._sketching = false;
  }
  this.canvas.removeEventListener('touchmove', this._touchMove);
};

Sketchpad.prototype._touchLeave = function(event) {
  event.preventDefault();
  if (this._sketching) {
    this.strokes.push($.extend(true, {}, this._currentStroke));
    this._sketching = false;
  }
  this.canvas.removeEventListener('touchmove', this._touchMove);
};

Sketchpad.prototype._touchMove = function(event) {
  event.preventDefault();
  var currentPosition = this._cursorPosition(event.changedTouches[0]);

  this._draw(this._lastPosition, currentPosition, this.color, this.penSize);
  this._currentStroke.lines.push({
    start: $.extend(true, {}, this._lastPosition),
    end: $.extend(true, {}, currentPosition),
  });

  this._lastPosition = currentPosition;
};

// [!!] On long press: fill canvas with a single, giant stroke
Sketchpad.prototype._onLongPress = function(event) {
  let stroke = {
    color: this.color,
    size: this.canvas.width,
    lines: [{
      'start': {'x':this.canvas.width/2, 'y':0},
      'end': {'x':this.canvas.width/2, 'y':this.canvas.height}
    }],
  };
  this.strokes.push($.extend(true, {}, stroke))
  this.drawStroke(stroke);
  this._sketching = false;
};

//
// Public API
//

Sketchpad.prototype.reset = function() {
  // Set attributes
  this.canvas = $(this.element)[0];
  this.canvas.width = this._width;
  this.canvas.height = this._height;
  this.context = this.canvas.getContext('2d');

  // [!!] force white background on the Canvas
  this.context.fillStyle = '#ffffff';  /// set white fill style
  this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

  // Setup event listeners
  this.redraw(this.strokes);

  // Mouse
  this.canvas.addEventListener('mousedown', this._mouseDown);
  this.canvas.addEventListener('mouseout', this._mouseUp);
  this.canvas.addEventListener('mouseup', this._mouseUp);

  // Touch
  this.canvas.addEventListener('touchstart', this._touchStart);
  this.canvas.addEventListener('touchend', this._touchEnd);
  this.canvas.addEventListener('touchcancel', this._touchCancel);
  this.canvas.addEventListener('touchleave', this._touchLeave);
  onLongPress(this.canvas, this._onLongPress)

};

Sketchpad.prototype.drawStroke = function(stroke) {
  for (var j = 0; j < stroke.lines.length; j++) {
    var line = stroke.lines[j];
    this._draw(line.start, line.end, stroke.color, stroke.size);
  }
};

Sketchpad.prototype.redraw = function(strokes) {
  for (var i = 0; i < strokes.length; i++) {
    this.drawStroke(strokes[i]);
  }
};

Sketchpad.prototype.toObject = function() {
  return {
    width: this.canvas.width,
    height: this.canvas.height,
    strokes: this.strokes,
    undoHistory: this.undoHistory,
  };
};

Sketchpad.prototype.toJSON = function() {
  return JSON.stringify(this.toObject());
};

Sketchpad.prototype.animate = function(ms, loop, loopDelay) {
  this.clear();
  var delay = ms;
  var callback = null;
  for (var i = 0; i < this.strokes.length; i++) {
    var stroke = this.strokes[i];
    for (var j = 0; j < stroke.lines.length; j++) {
      var line = stroke.lines[j];
      callback = this._draw.bind(this, line.start, line.end,
                                 stroke.color, stroke.size);
      this.animateIds.push(setTimeout(callback, delay));
      delay += ms;
    }
  }
  if (loop) {
    loopDelay = loopDelay || 0;
    callback = this.animate.bind(this, ms, loop, loopDelay);
    this.animateIds.push(setTimeout(callback, delay + loopDelay));
  }
};

Sketchpad.prototype.cancelAnimation = function() {
  for (var i = 0; i < this.animateIds.length; i++) {
    clearTimeout(this.animateIds[i]);
  }
};

Sketchpad.prototype.clear = function() {
  // this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  // [!!] White bg
  this.context.fillStyle = '#ffffff';
  this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

};

Sketchpad.prototype.undo = function() {
  this.clear();
  var stroke = this.strokes.pop();
  if (stroke) {
    this.undoHistory.push(stroke);
    this.redraw(this.strokes);
  }
};

Sketchpad.prototype.redo = function() {
  var stroke = this.undoHistory.pop();
  if (stroke) {
    this.strokes.push(stroke);
    this.drawStroke(stroke);
  }
};


// -------------------------
// Color palette
// -------------------------

class ColorPalette {
  constructor(options) {
    this.div = $(options.div)
    this.sketchpad = options.sketchpad
    this.colors = options.colors
    this.size = 0
    this.active = -1

    this.create_colorbar()
  }

  get color(){
    return this.colors[this.active]
  }

  create_colorbar(){
    for (let i=0; i<this.colors.length; i++){

      // special border for white
      let style_args = '';
      let outer_color = this.colors[i];
      if (this.colors[i]=='#FFFFFF'){
        outer_color = '#757575'
        style_args = '-webkit-text-fill-color: white; -webkit-text-stroke-width: 0.5px; -webkit-text-stroke-color:#757575'
      }

      let dot = $(`
        <span class="fa-stack dot" dotid="${i}">
          <i class="fas fa-circle inner-dot fa-stack-1x" style="color: ${this.colors[i]}; font-size: 0.35em;${style_args}"></i>
          <i class="far fa-circle outer-dot fa-stack-1x" style="color: ${outer_color}; font-size: 0.85em;"></i>
        </span>
      `)

      dot.click(el => this.click_dot(i))

      this.div.append(dot);
    }
    this.click_dot(1)
  }

  click_dot(dot_id){
    
    if (this.active!=dot_id && this.active>=0){
      let dot = $(`span[dotid="${this.active}"]`).removeClass('active')
      dot.find('.inner-dot').css({'font-size':'0.35em'})
      dot.find('.outer-dot').css({'font-size':'0.85em'})
    }

    if (this.active==dot_id)
      this.size = (this.size + 1) % 3

    let size = (this.size+1)*0.35
    let dot = $(`span[dotid="${dot_id}"]`)
    dot.find('.inner-dot').css({'font-size':`${size}em`})
    dot.find('.outer-dot').css({'font-size':`${size+0.5}em`})
    dot.addClass('active')

    this.active = dot_id
    this.sketchpad.color = this.colors[this.active];
    this.sketchpad.penSize = (this.size+1)*this.sketchpad.basePenSize
  }
}