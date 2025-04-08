// drawing constants and functions
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const drawColor = (r,g,b) => { ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.strokeStyle = `rgb(${r},${g},${b})`; }

// global important variables
let keys = {};
let mouse = { 
  x: 0, y: 0, lmb: false, rmb: false,
  lmbAlreadyPressed: false, rmbAlreadyPressed: false
};

let gameover = false;
let livesRemaining = 3;

let level = 0;

// image & texture loading
const truckImage = new Image();
truckImage.src = './images/truck.png';

const enemyTruckImage = new Image();
enemyTruckImage.src = './images/enemy-truck.png';

const grassyRoadImage = new Image();
grassyRoadImage.src = './images/background/grassy-road.png';

let sandyRoadImages = [];
for (let i = 0; i < 4; i++) {
  sandyRoadImages.push(new Image());
  sandyRoadImages[i].src = `./images/background/sandy-road${i}.png`;
}
// const sandyRoadImage = new Image();
// sandyRoadImage.src = './images/sandy-road.png';

const rockImage = new Image();
rockImage.src = './images/rock.png';

const sightImage = new Image();
sightImage.src = './images/sight.png';

const crateImage = new Image();
crateImage.src = './images/crate.png';

// classes
class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  intersects(rect) {
    return this.x < rect.x + rect.width && this.x + this.width > rect.x && this.y < rect.y + rect.height && this.y + this.height > rect.y;
  }
}

class MovingRect extends Rect {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.vel = { x: 0, y: 0 };
  }

  updatePosition(updateX=true, updateY=true) {
    if (updateX == true) this.x += this.vel.x;
    if (updateY == true) this.y += this.vel.y;
  }
}

class GameActor extends MovingRect {
  draw(image) {
    ctx.drawImage(image, this.x, this.y, this.width, this.height);
  }
}

class Road extends GameActor {
  update(roadList) {
    this.vel.x = -8;
    this.updatePosition();
    if (this.x + this.width < 0) this.x += this.width * roadList.length;
    if (this.x > canvas.width) this.x -= this.width * roadList.length;
  }
}

class Background extends GameActor {
  update(backgroundList) {
    this.vel.x = -0.25;
    this.updatePosition();
    if (this.x + this.width < 0) this.x += this.width * backgroundList.length;
    if (this.x > canvas.width) this.x -= this.width * backgroundList.length;
  }
}


class Projectile extends GameActor {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.durability = 0;
  }
}

class Truck extends GameActor {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    
    this.bounds = { // find a way to not hard code these (i think i could do canvas.height * 0.3125, i'll add that later)
      top: 175 - this.height + 5,
      bottom: 385 - this.height - 5
    }
  }
  
  update() {
    this.updatePosition();
    if (this.x < 0) this.x = 0;
    
    if (this.y < this.bounds.top) this.y = this.bounds.top;
    if (this.y > this.bounds.bottom) this.y = this.bounds.bottom;
  }
}

class Enemy extends Truck {
  follow(target) {
    let followAngle = Math.atan2(target.y - this.y, target.x - this.x);
    let followSpeed = 2;
    this.vel.x = Math.cos(followAngle) * followSpeed;
    this.vel.y = Math.sin(followAngle) * followSpeed;
  }
}


class Player extends Truck { // the strange constants, like +30 for the x on the cursor, is to center it on the top of the player's truck
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.projectiles = [];
    
    this.cursor = { x: 0, y: 0, angle: 0 };
    
    this.health = 100;
  }
  
  updateCursor() {
    this.cursor.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    this.cursor.x = Math.cos(this.cursor.angle);
    this.cursor.y = Math.sin(this.cursor.angle);
  }

  drawCursor(image) {
    ctx.drawImage(image, this.cursor.x * 35 + this.x + 30, this.cursor.y * 35 + this.y, 15, 15);
  }
  
  shootProjectile() {
    let projectile = new Projectile(this.cursor.x + this.x + 30, this.cursor.y + this.y, 15, 15);
    let projectileSpeed = 10;
    projectile.vel.x = Math.cos(this.cursor.angle) * projectileSpeed;
    projectile.vel.y = Math.sin(this.cursor.angle) * projectileSpeed;
    projectile.durability = 3;
    
    this.projectiles.push(projectile);
  }
}

// set the roads & background
let roads = [];
for (let i = 0; i < Math.floor(canvas.width/Math.floor(canvas.height/2)) + 1; i++) {
  // width of each road is half the height of the canvas
  // the height of each road is the height of the canvas
  roads.push(new Road(i * Math.floor(canvas.height/2), 0, Math.floor(canvas.height/2), canvas.height));
}

let backgrounds = [];
for (let i = 0; i < Math.floor(canvas.width/Math.floor(canvas.height/2)) + 1; i++) {
  // width of each road is half the height of the canvas
  // the height of each road is the height of the canvas
  backgrounds.push(new Background(i * Math.floor(canvas.height/2), 0, Math.floor(canvas.height/2), canvas.height));
}

const player = new Player(0, 0, 64, 64);

// let enemies = [new Enemy(700, 0, 64, 64), new Enemy(1200, 0, 64, 64)];
let enemies = [];
for (let i = 0; i < 250; i++) {
  let emptyTruck = new Truck(0,0,0,0);
  if (i%2==0) enemies.push(new Enemy(700 + 50 * i, emptyTruck.bounds.top, 64, 64));
  if (i%2==1) enemies.push(new Enemy(700 + 50 * i, emptyTruck.bounds.bottom, 64, 64));
}

function render() {
  drawColor(255,255,255);
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw game entities
  roads.forEach(road => {
    // road.draw(grassyRoadImage);
    road.draw(sandyRoadImages[1]);
    road.draw(sandyRoadImages[0]);
  });

  backgrounds.forEach(background => {
    background.draw(sandyRoadImages[1]);
    background.draw(sandyRoadImages[3]);
  });

  ctx.drawImage(sandyRoadImages[2], 0, 0, Math.floor(canvas.height/2), canvas.height);

  enemies.forEach(enemy => {
    enemy.draw(enemyTruckImage);
  });

  player.draw(truckImage);
  player.drawCursor(sightImage);

  player.projectiles.forEach(projectile => {
    projectile.draw(rockImage);
  });
}

function game() {
  // gameover screen
  if (gameover) {
    drawColor(0,0,0);
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    drawColor(255,255,255);

    ctx.font = '48px serif';
    ctx.fillText('Game over', 0, 48);
    
    ctx.font = '20px serif';
    ctx.fillText('Press R to restart', 0, 68);
  
    if (keys['r']) {
      gameover = false;
    }

    return;
  }

  render();

  // update game entities
  player.updateCursor();
  player.update();
  
  player.vel.x = 0;
  player.vel.y = 0;

  player.projectiles.forEach((projectile, i) => {
    projectile.updatePosition();
    if (projectile.durability <= 0) {
      player.projectiles.splice(i, 1);
    } else if (projectile.x + projectile.width < 0 || projectile.y + projectile.height < 0 || projectile.x > canvas.width || projectile.y > canvas.height) {
      player.projectiles.splice(i, 1);
    }
  });

  enemies.forEach((enemy, i) => {
    enemy.follow(player);
    enemy.update();

    player.projectiles.forEach(projectile => {
      if (enemy.intersects(projectile)) {
        enemies.splice(i, 1);
        projectile.durability -= 1;
      }
    });

    if (enemy.intersects(player)) {
      gameover = true;
      enemies.splice(i, 1);
    }
  });
  
  roads.forEach(road => {
    road.update(roads);
  });

  backgrounds.forEach(background => {
    background.update(backgrounds);
  });

  // key events
  if (keys['a']) {
    player.vel.x = -5;
  }
  if (keys['d']) {
    player.vel.x = 5;
  }
  if (keys['w']) {
    player.vel.y = -5;
  }
  if (keys['s']) {
    player.vel.y = 5;
  }

  if (mouse.lmb && !mouse.lmbAlreadyPressed) {
    player.shootProjectile();
    mouse.lmbAlreadyPressed = true;
  }
  if (!mouse.lmb) {
    mouse.lmbAlreadyPressed = false;
  }
}

// key and mouse handlers
function keyHandler(event) {
  if (event.type == 'keyup') keys[event.key] = false;

  if (keys[event.key]) return;
  if (event.type == 'keydown') keys[event.key] = true;
}

function mousePosHandler(event) {
  let rect = canvas.getBoundingClientRect();
  mouse.x = Math.floor( (event.clientX - rect.left) / (rect.right - rect.left) * canvas.width );
  mouse.y = Math.floor( (event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height );
}

function mouseDownHandler(event) {
  if (event.button == 0) {
    mouse.lmb = true;
  }
  if (event.button == 2) {
    mouse.rmb = true;
  }
}
function mouseUpHandler(event) {
  if (event.button == 0) {
    mouse.lmb = false;
  }
  if (event.button == 2) {
    mouse.rmb = false;
  }
}

document.addEventListener('keydown', keyHandler);
document.addEventListener('keyup', keyHandler);
document.addEventListener('mousemove', mousePosHandler);
document.addEventListener('mousedown', mouseDownHandler);
document.addEventListener('mouseup', mouseUpHandler);

setInterval(() => {
  game();
}, 1000/60);