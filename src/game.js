var copter = copter || {};
copter.graphics = copter.graphics || {};

/**
 * A single level in the game.
 * @constructor
 */
copter.Level = function(levelConfig) {
  this.size_ = levelConfig.size;
  this.name_ = levelConfig.name;
  this.viewPos_ = {x: 0, y: 0};
  this.score_ = 0;
  this.scoreAnim_ = 0;
  this.message_ = '';
  
  // Tiles and props are entirely static. Render the whole lot to an invisible
  // canvas up front.
  var tileSheet = new copter.graphics.ImageStrip('tiles.png', 15, 4);
  var tileCanvas = document.createElement('canvas');
  tileCanvas.width = levelConfig.size.x;
  tileCanvas.height = levelConfig.size.y;
  var tileContext = tileCanvas.getContext('2d');
  for (var i = 0; i < levelConfig.tiles.length; i++) {
   var row = levelConfig.tiles[i];
    for (var j = 0; j < row.length; j++) {
      var tileIndex = row[j];
      if (tileIndex) {
        tileSheet.draw(tileContext, i * 32, j * 32, tileIndex - 1);
      }
    }
  }
  for (var i = 0; i < levelConfig.props.length; i++) {
    var prop = levelConfig.props[i];
    var propImg = new copter.graphics.ImageStrip(prop[0] + '.png', 1);
    propImg.draw(tileContext, prop[1].x, prop[1].y, 0);
  }
  this.tileCanvas_ = tileCanvas;
  this.sky_ = new copter.graphics.ImageStrip(levelConfig.sky + '.png');
  this.copter_ = new copter.Helicopter();
  this.copter_.level_ = this;
  this.clouds_ = [];
  if (levelConfig.clouds) {
    for (var i = 0; i < 40; i++) {
      this.clouds_.push(new copter.Cloud(
          Math.random() * this.size_.x,
          Math.random() * this.size_.y * 2));
    }
  }
  this.dynamic_ = [];
  for (var i = 0; i < levelConfig.dynamic.length; i++) {
    var objType = levelConfig.dynamic[i][0];
    var obj = levelConfig.dynamic[i][1];
    var dynamicObj;
    if (objType == 'star') {   
      this.addDynamicObj(new copter.Star(obj.x, obj.y));
    } else if (objType == 'special_star') {   
      this.addDynamicObj(new copter.Star(obj.x, obj.y, true));
    } else if(objType == 'sheep') {
      this.addDynamicObj(new copter.Sheep(obj.x, obj.y));
    } else if(objType == 'hostage') {
      this.addDynamicObj(new copter.Hostage(obj.x, obj.y));
    }
  }
  return this
};

copter.Level.prototype.addDynamicObj = function(obj) {
  this.dynamic_.push(obj);
  obj.level_ = this;
};

copter.Level.prototype.removeDynamicObj = function(obj) {
  this.dynamic_.splice(this.dynamic_.indexOf(obj), 1);
};

copter.Level.prototype.increaseScore = function(amount) {
  this.score_ += amount;
  if (amount > 1) {
    this.scoreAnim_ = 20;
  }
};

copter.Level.prototype.postMessage = function(message) {
  this.message_ = message;
};

copter.Level.prototype.hitTest = function(x, y) {
  var imgd = this.tileCanvas_.getContext('2d').getImageData(x, y, 1, 1);
  return imgd.data[3] > 0;
};

copter.Level.prototype.step = function() {
  var self = this;
  this.copter_.step();
  this.dynamic_.forEach(function(obj) {
    obj.step();
    if (copter.graphics.intersect(
        self.copter_.getBodyBBox(), obj.getBBox())) {
      obj.collideHelicopterBody();
    }
    if (copter.graphics.intersect(
        self.copter_.getBladesBBox(), obj.getBBox())) {
      obj.collideHelicopterBlades();
    }
    if (copter.graphics.intersect(
        self.copter_.getLadderBBox(), obj.getBBox())) {
      obj.collideHelicopterLadder();
    }
  });
  this.viewPos_.x = Math.min(Math.max(this.copter_.x - 200, 0), this.size_.x - 800);
  // TODO(joosterman): Pixel-wise collision checking.
  if (this.hitTest(this.copter_.x, this.copter_.y + 10) ||
      this.hitTest(this.copter_.x + 100, this.copter_.y) ||
      this.hitTest(this.copter_.x + 100, this.copter_.y + 35) ||
      this.hitTest(this.copter_.x, this.copter_.y + 10)) {
      this.copter_.destroy();
  }
};

copter.Level.prototype.draw = function(ctx) {
  // Render background, clouds, and tiles
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 2; j++) {
      this.sky_.draw(ctx, i * 200, j * 200, 0);
    }
  }
  var self = this;
  this.clouds_.forEach(function(obj) {
    obj.draw(ctx, self.viewPos_);
  });
  ctx.drawImage(this.tileCanvas_, -this.viewPos_.x, -this.viewPos_.y);
  // Render foreground objects and helicopter.
  this.dynamic_.forEach(function(obj) {
    obj.draw(ctx, self.viewPos_);
  });
  this.copter_.draw(ctx, this.viewPos_);
  // Render scoreboard.
  if (this.scoreAnim_) {
    this.scoreAnim_--;
  }
  var fontSize = 30 + this.scoreAnim_;
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 0.5;
  ctx.fillRect(620, 10, 160, 50);
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = 'black';
  ctx.font = fontSize + 'px Impact';
  ctx.fillText('Score: ' + Math.floor(this.score_), 630 - this.scoreAnim_, 50);
  // Render player message.
  if (this.message_) {
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.5;
    //ctx.fillRect(290, 200, 240, 40);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'black';
    ctx.font = '20px Impact';
    ctx.fillText(this.message_, 300, 130);
  }
};


/**
 * Base class for collectables, non-static scenery, etc.
 */
 copter.DynamicObject = function(img, x, y) {
   this.img_ = img;
   this.x = x;
   this.y = y;
 };
 
copter.DynamicObject.prototype.getBBox = function() {
   var size = this.img_.getSize();
   return {x1: this.x, y1: this.y, x2: this.x + size.x, y2: this.y + size.y};
};
 
copter.DynamicObject.prototype.step = function() {};

copter.DynamicObject.prototype.collideHelicopterBody = function() {};

copter.DynamicObject.prototype.collideHelicopterBlades = function() {};

copter.DynamicObject.prototype.collideHelicopterLadder = function() {};
 
copter.DynamicObject.prototype.draw = function(ctx, viewOffset) {
    var screenPos = {
      x: this.x - viewOffset.x,
      y: this.y - viewOffset.y,
    };
    this.img_.draw(ctx, screenPos.x, screenPos.y);
  };


/**
 * Paralax scrolling background cloud.
 */
 copter.Cloud = function(x, y){
  var img = this.trailImg_ = new copter.graphics.ImageStrip('cloud.png', 3);
  this.depth_ = Math.random() * 0.3 + 0.2;
  this.frame_ = Math.round(Math.floor(Math.random() * 4));
  this.parent.constructor.call(this, img, x, y);
};
copter.Cloud.prototype = new copter.DynamicObject();
copter.Cloud.prototype.parent = copter.DynamicObject.prototype

copter.Cloud.prototype.draw = function(ctx, viewOffset) {
  this.img_.draw(ctx, this.x - viewOffset.x * this.depth_, this.y - viewOffset.y, this.frame_);
};


/**
 * Gib is a gravity-affected chunk of helicopter / sheep from a after collision.
 */
copter.Gib = function(img, x, y, trailImg){
  this.xSpeed_ = Math.random() * 6 - 3;
  this.ySpeed_ = -Math.random() * 6 - 3;
  this.trail_ = [];
  this.trailImg_ = trailImg;
  this.parent.constructor.call(this, img, x, y);
};
copter.Gib.prototype = new copter.DynamicObject();
copter.Gib.prototype.parent = copter.DynamicObject.prototype

copter.Gib.prototype.step = function(ctx, viewPos) {
  this.trail_.push({x: this.x, y: this.y});
  if (this.trail_.length == 6) {
    this.trail_ = this.trail_.splice(1);
  }
  this.ySpeed_ += 0.5;
  this.x += this.xSpeed_;
  this.y += this.ySpeed_;
  if (this.y > 600) {
    this.level_.removeDynamicObj(this);
  }
};
copter.Gib.prototype.draw = function(ctx, viewOffset) {
  if (this.trailImg_) {
    for(var i = 0; i < this.trail_.length; i++) {
      var pos = this.trail_[i];
      this.trailImg_.draw(ctx, pos.x - viewOffset.x, pos.y - viewOffset.y, 5-i);
    }
  }
  this.parent.draw.call(this, ctx, viewOffset);
};


/**
 * A player-controlled helicopter.
 * @constructor
 */
copter.Helicopter = function() {
  var img = new copter.graphics.AnimatedImage(
      'helicopter.png', 2, 0.3);
  this.parent.constructor.call(this, img, 0, 200);
  this.copterImg_ = img;
  this.bladesImg_ = new copter.graphics.AnimatedImage(
      'helicopter_blades.png', 4, 0.3);
  this.bladesOffset_ = {x: 10, y: -15};
  this.ladderImg_ = new copter.graphics.ImageStrip(
      'helicopter_ladder.png', 5);
  this.ladderOffset_ = {x: 50, y: 30};
  this.trailImg_ = new copter.graphics.ImageStrip(
      'helicopter_trail.png', 5);
  this.ySpeed_ = 0;
  this.autopilot_ = true;
  this.dead_ = false;
  this.trailPositions_ = [];
};
copter.Helicopter.prototype = new copter.DynamicObject();
copter.Helicopter.prototype.parent = copter.DynamicObject.prototype

copter.Helicopter.prototype.getBodyBBox = function() {
   var size = this.copterImg_.getSize();
   return {x1: this.x, y1: this.y, x2: this.x + size.x, y2: this.y + size.y};
};

copter.Helicopter.prototype.getBladesBBox = function() {
   var size = this.bladesImg_.getSize();
   var offset = this.bladesOffset_;
   return {
       x1: this.x + offset.x,
       y1: this.y + offset.y,
       x2: this.x + offset.x + size.x,
       y2: this.y + offset.y + size.y};
};

copter.Helicopter.prototype.getLadderBBox = function() {
   var size = this.ladderImg_.getSize();
   var offset = this.ladderOffset_;
   return {
       x1: this.x + offset.x,
       y1: this.y + offset.y,
       x2: this.x + offset.x + size.x,
       y2: this.y + offset.y + size.y};
};

copter.Helicopter.prototype.step = function() {
  if (this.dead_) {
    if (window.mouseDown) {
      window.location.reload();
    }
  } else {
    if ((this.x % 20) == 0) {
      this.trailPositions_.push({x: this.x - 10, y: this.y});
    }
    if (this.trailPositions_.length == 6) {
      this.trailPositions_ = this.trailPositions_.splice(1);
    }
    this.x += 4;
    this.y += this.ySpeed_;
    if (window.mouseDown) {
      this.ySpeed_ -= 0.3;
    } else if (!this.autopilot_){
      this.ySpeed_ += 0.3;
    }
    this.level_.increaseScore(0.5);
    if (this.autopilot_) {
      this.level_.postMessage('Autopilot: Click to start');
      if (window.mouseDown) {
        this.autopilot_ = false;
        this.level_.postMessage('');
      }
    }
  }
};

copter.Helicopter.prototype.destroy = function() {
  trailImg = new copter.graphics.AnimatedImage('helicopter_trail_dead.png', 5);
  img = new copter.graphics.AnimatedImage('helicopter_gib_1.png', 5, 0.5);
  this.level_.addDynamicObj(new copter.Gib(img, this.x, this.y, trailImg));
  img = new copter.graphics.AnimatedImage('helicopter_gib_2.png', 10, 0.5);
  this.level_.addDynamicObj(new copter.Gib(img, this.x + 30, this.y, trailImg));
  img = new copter.graphics.AnimatedImage('helicopter_gib_3.png', 10, 0.5);
  this.level_.addDynamicObj(new copter.Gib(img, this.x + 70, this.y, trailImg));
  img = new copter.graphics.AnimatedImage('helicopter_blades.png', 4, 0.2);
  this.level_.addDynamicObj(new copter.Gib(img, this.x, this.y - 20, trailImg));
  this.level_.postMessage('Pwned. Click to retry');
  this.dead_ = true;
  window.mouseDown = false;
  this.y = - 200;
};

copter.Helicopter.prototype.draw = function(ctx, viewOffset) {
  if(!this.dead_) {
    var screenPos = {
      x: this.x - viewOffset.x,
      y: this.y - viewOffset.y,
    };
    for(var i = 0; i < this.trailPositions_.length; i++) {
      var pos = this.trailPositions_[i];
      this.trailImg_.draw(ctx, pos.x - viewOffset.x, pos.y - viewOffset.y, 5-i);
    }
    this.copterImg_.draw(ctx, screenPos.x, screenPos.y);
    this.bladesImg_.draw(ctx, screenPos.x + this.bladesOffset_.x, screenPos.y + this.bladesOffset_.y);
    this.ladderImg_.draw(ctx, screenPos.x + this.ladderOffset_.x, screenPos.y + this.ladderOffset_.y, 4);
  }
}


/**
 * Hostages are rescued with the ladder, or chopped with the blades.
 */
 copter.Hostage = function(x, y){
  var img = this.trailImg_ = new copter.graphics.AnimatedImage('hostage.png', 10, 0.5);
  this.parent.constructor.call(this, img, x, y);
};
copter.Hostage.prototype = new copter.DynamicObject();
copter.Hostage.prototype.parent = copter.DynamicObject.prototype

copter.Hostage.prototype.collideHelicopterBlades = function() {
  this.level_.removeDynamicObj(this);
  var img, trailImg;
  img = new copter.graphics.AnimatedImage('hostage_gib_3.png', 10);
  this.level_.addDynamicObj(new copter.Gib(img, this.x, this.y, trailImg));
  trailImg = new copter.graphics.AnimatedImage('blood.png', 1);
  img = new copter.graphics.AnimatedImage('hostage_gib_1.png', 10);
  this.level_.addDynamicObj(new copter.Gib(img, this.x, this.y, trailImg));
  img = new copter.graphics.AnimatedImage('hostage_gib_2.png', 10);
  this.level_.addDynamicObj(new copter.Gib(img, this.x, this.y, trailImg));
  this.level_.increaseScore(-100);
};

copter.Hostage.prototype.collideHelicopterLadder = function() {
  this.level_.removeDynamicObj(this);
  this.level_.increaseScore(50);
};


/**
 * Stars float in the sky, and are collected by the player for points.
 */
copter.Star = function(x, y, special){
  this.special_ = !!special;
  var imgPath = this.special_ ? 'star_special.png' : 'star.png';
  var img = new copter.graphics.AnimatedImage(imgPath, 10, 0.5); 
  this.parent.constructor.call(this, img, x, y);
};
copter.Star.prototype = new copter.DynamicObject();
copter.Star.prototype.parent = copter.DynamicObject.prototype

copter.Star.prototype.draw = function(ctx, viewPos) {
  this.parent.draw.call(this, ctx, viewPos);
};
copter.Star.prototype.collideHelicopterBody = function() {
  this.level_.increaseScore(this.special_ ? 500 : 50);
  this.level_.removeDynamicObj(this);
  for (var dir = 0; dir <= 2 * Math.PI; dir+=Math.PI/8) {
    var burst = new copter.StarBurst(this.x, this.y, dir, this.special_);
    this.level_.addDynamicObj(burst);
  }
};


/**
 * StarBurst is emitted in 8 directions from a collected star.
 */
copter.StarBurst = function(x, y, direction, special){
  var imgPath = special ? 'star_burst_special.png' : 'star_burst.png';
  var img = new copter.graphics.AnimatedImage(imgPath, 1);
  this.visible_ = true;
  this.direction_ = direction;
  this.ttl_ = 50;
  this.parent.constructor.call(this, img, x, y);
};
copter.StarBurst.prototype = new copter.DynamicObject();
copter.StarBurst.prototype.parent = copter.DynamicObject.prototype

copter.StarBurst.prototype.step = function(ctx, viewPos) {
  this.ttl_--;
  if (this.ttl_ == 0) {
    this.level_.removeDynamicObj(this);
  }
  var dx = Math.cos(this.direction_);
  var dy = Math.sin(this.direction_);
  this.x += dx * 10;
  this.y += dy * 10;
};


/**
 * Sheep wander back and forth on the ground.
 */
copter.Sheep = function(x, y){
  var img = new copter.graphics.ImageStrip('sheep.png', 2);
  this.dir_ = 1;
  this.startX_ = x;
  this.parent.constructor.call(this, img, x, y);
};
copter.Sheep.prototype = new copter.DynamicObject();
copter.Sheep.prototype.parent = copter.DynamicObject.prototype

copter.Sheep.prototype.step = function() {
  if (Math.random() > 0.95) {
    this.dir_ *= -1;
  }
  if (this.x < this.startX_ - 20) {
    this.dir_ = 1;
  }
  if (this.x > this.startX_ + 20) {
    this.dir_ = -1;
  }
  this.x += this.dir_ * 0.5;
};

copter.Sheep.prototype.collideHelicopterBody = function() {
  this.level_.removeDynamicObj(this);
  var img = new copter.graphics.AnimatedImage('terrorist_gib_1.png', 5);
  var trailImg = new copter.graphics.AnimatedImage('blood.png', 1);
  for (var i = 0; i < 5; i++) {
    this.level_.addDynamicObj(new copter.Gib(img, this.x, this.y, trailImg));
  }
};

copter.Sheep.prototype.draw = function(ctx, viewOffset) {
    var screenPos = {
      x: this.x - viewOffset.x,
      y: this.y - viewOffset.y,
    };
    this.img_.draw(ctx, screenPos.x, screenPos.y, this.dir_ > 0 ? 1 : 0);
};
