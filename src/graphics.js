var copter = copter || {};
copter.graphics = copter.graphics || {};

/**
 * Stores all loaded HTML5 image objects for the life of the game, keyed by URL.
 */
copter.graphics.ImageCache = {};

/**
 * Loads a single HTML5 image object (async).
 * Optionally notifies once the image is loaded using a callback.
 */
copter.graphics.loadImage = function(url, opt_callback) {
  var img = new Image();
  img.onload = function() {
    copter.graphics.ImageCache[url] = img;
    console.log('Image ' + url + ' loaded.')
    if (opt_callback) {
      opt_callback();
    }
  };
  img.src = 'images/' + url;
};

/**
 * Wraps an HTML5 Image with support for tile sheets or animated sprite strips.
 * @constructor
 */
copter.graphics.ImageStrip = function(url, opt_numFramesX, opt_numFramesY) {
  this.img_ = copter.graphics.ImageCache[url];
  if (!this.img_) {
    alert('Forgot to load ' + url);
  }
  this.numFramesX_ = opt_numFramesX || 1;
  this.numFramesY_ = opt_numFramesY || 1;
  this.frameWidth = this.img_.width / this.numFramesX_;
  this.frameHeight = this.img_.height / this.numFramesY_;
  this.numFrames = this.numFramesX_ * this.numFramesY_;
  return this;
};

copter.graphics.ImageStrip.prototype.draw = function(ctx, x, y, opt_frame){
  var frame = opt_frame == undefined ? 1 : opt_frame;
  var frameX = frame % this.numFramesX_;
  var frameY = Math.floor(frame / this.numFramesX_);
  ctx.drawImage(
      this.img_,
      // Src x, y, width, height.
      this.frameWidth * frameX, this.frameHeight * frameY,
      this.frameWidth, this.frameHeight, 
      // Dest x, y, width, height.
      x, y, this.frameWidth, this.frameHeight); 
};

copter.graphics.ImageStrip.prototype.getSize = function() {
  return {x: this.frameWidth, y: this.frameHeight};
};


/**
 * Wraps a copter.graphics.ImageStrip to include a frame counter for animation.
 */
copter.graphics.AnimatedImage = function(url, numFrames, opt_animSpeed) {
  this.imageStrip_ = new copter.graphics.ImageStrip(url, numFrames, 1);
  this.animSpeed_ = opt_animSpeed || 1;
  this.numFrames_ = numFrames;
  this.currentFrame_ = 0;
  return this;
};

copter.graphics.AnimatedImage.prototype.draw = function(ctx, x, y){
  this.currentFrame_ += this.animSpeed_;
  this.currentFrame_ %= this.numFrames_;
  this.imageStrip_.draw(ctx, x, y, Math.floor(this.currentFrame_));
}

copter.graphics.AnimatedImage.prototype.getSize = function() {
  return this.imageStrip_.getSize();
};


/**
 * Returns if two bounding boxes intersect.
 */
copter.graphics.intersect = function(bbox1, bbox2) {
  return !(bbox2.x1 > bbox1.x2
      || bbox2.x2 < bbox1.x1
      || bbox2.y1 > bbox1.y2
      || bbox2.y2 < bbox1.y1);
};