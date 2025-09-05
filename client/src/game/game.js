"use-strict"

import Phaser from "phaser";
import emptyHandsImage from "./../assets/Empty_hands.png"
import klakinImage from "./../assets/Klakin.png"
import shootGunImage from "./../assets/ShootGun.png"
import grinadImage from "./../assets/Grinad.png"
import noGrinadImage from "./../assets/No_grinad.png"
import theGrinadImage from "./../assets/The_grinad.png"
import explosion1Image from "./../assets/Explosion1.png"  
import explosion2Image from "./../assets/Explosion2.png"  
import explosion3Image from "./../assets/Explosion3.png"  
import explosion4Image from "./../assets/Explosion4.png"  
import explosion5Image from "./../assets/Explosion5.png"  
import explosion6Image from "./../assets/Explosion6.png"  
import healthBar1Image from "./../assets/HealthBar1.png";
import healthBar2Image from "./../assets/HealthBar2.png";
import healthBar3Image from "./../assets/HealthBar3.png";
import healthBar4Image from "./../assets/HealthBar4.png";
import healthBar5Image from "./../assets/HealthBar5.png";
import outdoor from "./../assets/tilemaps/battle-royale1.json";
import outdoorImage from "./../assets/tilemaps/battle-royale.png";
import bulletImage from "./../assets/bullet.png";
import cursorImage from "./../assets/cursor.cur";
import bulletSound from "./../assets/sound/bulletSound.mp3";
import backgroundMusic1 from "./../assets/sound/backgroundMusic1.mp3";
import backgroundMusic2 from "./../assets/sound/backgroundMusic2.mp3";
import * as Colyseus from "colyseus.js";

var gameConfig = require('./../../config.json');

const endpoint = (window.location.hostname === "localhost") 
    ? `ws://localhost:${gameConfig.serverDevPort}` 
    : `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}:${gameConfig.serverDevPort}`;

// Create the Colyseus client instance
const client = new Colyseus.Client(endpoint);

export default class Game extends Phaser.Scene {
    constructor() {
        super("Game");
        // Add health bar config constants - positioned in top left corner
        this.HEALTH_BAR_CONFIG = {
            width: 200,
            height: 50,
            x: 20,
            y: 20,
            borderRadius: 8,
            borderThickness: 2,
            animationDuration: 400,
            damageFlashDuration: 100
        };
        
        // Add current sprite tracker
        this.currentSpriteKey = 'empty_hands';

        // Enhanced weapon configurations with shooting patterns
        this.weaponConfig = {
            'empty_hands': {
                speed: 450,
                canShoot: false,
                name: 'Unarmed',
                fireRate: 0,
                bulletCount: 0,
                spread: 0,
                damage: 0
            },
            'klakin': {
                speed: 400, // Increased from 300 to 400
                canShoot: true,
                name: 'Kalashnikov',
                fireRate: 150,        // Time between shots in ms
                bulletCount: 1,       // Single shot
                spread: 0.1,          // Small spread for accuracy
                damage: 25,
                bulletSpeed: 800,
                range: 1000
            },
            'shootgun': {
                speed: 350, // Increased from 250 to 350
                canShoot: true,
                name: 'Shotgun',
                fireRate: 800,        // Slower fire rate (pump action)
                bulletCount: 8,       // Multiple pellets
                spread: 0.5,          // Wide spread
                damage: 15,           // Lower per-pellet damage
                bulletSpeed: 600,
                range: 400
            },
            'grinad': {
                speed: 300, // Increased from 200 to 300
                canShoot: false,        // Changed to false - no shooting
                canThrowGrenade: true,   // New property
                name: 'Grenade Launcher',
                fireRate: 2000,         // 2 second reload time
                bulletCount: 1,
                spread: 0,
                damage: 100,            // High explosive damage
                bulletSpeed: 300,
                range: 600,             // Reasonable grenade throw range
                explosive: true
            },
            'no_grinad': {
                speed: 320, // New configuration for no_grinad sprite
                canShoot: false,
                name: 'Empty Grenade Launcher',
                fireRate: 0,
                bulletCount: 0,
                spread: 0,
                damage: 0
            }
        };

        // Add grenade state tracking
        this.isReloading = false;
        this.lastShotTime = 0;
    }

    init() {
        // Health bar config - positioned in top left corner
        this.HEALTH_BAR_CONFIG = {
            width: 250,
            height: 80,
            x: 20,
            y: 20,
            borderRadius: 8,
            borderThickness: 2,
            animationDuration: 400,
            damageFlashDuration: 100
        };
    
        // Add new health bar properties
        this.displayedHealth = 100;
        this.damageValue = 0;
        this.hasShield = false;
        this.shieldValue = 0;
        this.maxShield = 50;
        this.heartbeatSound = null;
        this.currentHealthBarImage = 1; // Track which health bar image to show

        this.room = null;
        this.roomJoined = false;
        this.cursors = null;
        this.players = {};
        this.player = null;
        this.bullets = {};
        this.map;
        this.bulletSound = null;
        this.backgroundMusic = null;

        this.closingMessage = "You have been disconnected from the server";
        // Player Health Bar
        this.healthBarBackground = null;
        this.healthBar = null;
        this.currentHealth = 100;
        this.maxHealth = 100;
        
        // Add sprite mapping
        this.spriteKeys = {
            1: 'empty_hands',
            2: 'klakin', 
            3: 'shootgun',
            4: 'grinad'
        };
    }

    preload() {
        this.load.audio('bulletSound', bulletSound);
        this.load.audio('backgroundMusic', [backgroundMusic1, backgroundMusic2]);
        this.load.image("tiles", outdoorImage);
        this.load.tilemapTiledJSON("map", outdoor);
        
        // Load all player sprites
        this.load.spritesheet('empty_hands', emptyHandsImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('klakin', klakinImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('shootgun', shootGunImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('grinad', grinadImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('no_grinad', noGrinadImage, {
            frameWidth: 120,
            frameHeight: 165
        });
        
        // Load explosion animation frames (fixed names)
        this.load.image('explosion1', explosion1Image);
        this.load.image('explosion2', explosion2Image);
        this.load.image('explosion3', explosion3Image);
        this.load.image('explosion4', explosion4Image);
        this.load.image('explosion5', explosion5Image);
        this.load.image('explosion6', explosion6Image);
        
        // Load grenade projectile image
        this.load.image('the_grinad', theGrinadImage);
        
        // Load health bar images
        this.load.image('healthBar1', healthBar1Image);
        this.load.image('healthBar2', healthBar2Image);
        this.load.image('healthBar3', healthBar3Image);
        this.load.image('healthBar4', healthBar4Image);
        this.load.image('healthBar5', healthBar5Image);
        
        this.load.image('bullet', bulletImage);
        this.load.image('cursor', cursorImage);
    }

    create() {
    // --- Music & Sounds ---
    this.backgroundMusic = this.sound.add('backgroundMusic');
    this.backgroundMusic.setLoop(true).play();

    this.bulletSound = this.sound.add('bulletSound');

    // --- Cursor & Map ---
    this.input.setDefaultCursor(`url('${cursorImage}'), crosshair`);
    this.map = this.make.tilemap({ key: "map" });

    const tileset = this.map.addTilesetImage("battle-royale", "tiles");
    const floorLayer = this.map.createStaticLayer("floor", tileset, 0, 0);
    this.map["blockLayer"] = this.map.createStaticLayer("block", tileset, 0, 0);
    this.map["blockLayer"].setCollisionByProperty({ collide: true });

    // --- Camera & Physics bounds ---
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // --- Connect to server ---
    this.connect();

    this.cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Add number key controls for sprite switching
    this.spriteKeys_input = this.input.keyboard.addKeys({
        one: Phaser.Input.Keyboard.KeyCodes.ONE,
        two: Phaser.Input.Keyboard.KeyCodes.TWO,
        three: Phaser.Input.Keyboard.KeyCodes.THREE,
        four: Phaser.Input.Keyboard.KeyCodes.FOUR
    });

    // Add H key for testing damage (remove this later)
    this.testDamageKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    // =============================
    // 🎮 Image-based Health Bar System
    // =============================
    
    // Create health bar sprite in top left corner
    this.healthBarSprite = this.add.image(
        this.HEALTH_BAR_CONFIG.x, 
        this.HEALTH_BAR_CONFIG.y, 
        'healthBar1'
    );
    this.healthBarSprite.setOrigin(0, 0); // Top-left origin
    this.healthBarSprite.setScrollFactor(0); // Fixed position on screen
    this.healthBarSprite.setDepth(100); // High depth to stay on top
    
    // Scale the health bar to the desired size (430x100)
    this.healthBarSprite.setDisplaySize(this.HEALTH_BAR_CONFIG.width, this.HEALTH_BAR_CONFIG.height);
    
    // Initialize health bar state
    this.currentHealthBarImage = 1;
    this.displayedHealth = this.currentHealth;
    this.damageValue = 0;
    
    // Update health bar display
    this.updateHealthBarImage();

    // Add weapon display text (positioned below health bar)
   

    // Move the pointer input handling here (remove from update method)
    this.input.on('pointermove', function (pointer) {
        if (this.player) {
            this.rotatePlayer(pointer);
        }
    }, this);

    this.input.on('pointerdown', function (pointer) {
        if (this.player) {
            const currentWeapon = this.weaponConfig[this.currentSpriteKey];
            const currentTime = this.time.now;
            
            // Handle grenade throwing
            if (this.currentSpriteKey === 'grinad' && currentWeapon.canThrowGrenade) {
                if (!this.isReloading && (currentTime - this.lastShotTime) >= currentWeapon.fireRate) {
                    this.throwGrenade(pointer);
                    this.lastShotTime = currentTime;
                }
            }
            // Handle regular shooting for other weapons
            else if (currentWeapon.canShoot && (currentTime - this.lastShotTime) >= currentWeapon.fireRate) {
                this.fireWeapon(currentWeapon, pointer);
                this.lastShotTime = currentTime;
                this.shot = true;
            } else if (!currentWeapon.canShoot && !currentWeapon.canThrowGrenade) {
                console.log("Cannot shoot without a weapon!");
            }
        }
    }, this);

    // Create explosion animation from individual images
    this.anims.create({
        key: 'explode',
        frames: [
            { key: 'explosion1' },
            { key: 'explosion2' },
            { key: 'explosion3' },
            { key: 'explosion4' },
            { key: 'explosion5' },
            { key: 'explosion6' }
        ],
        frameRate: 12,     // Frames per second (adjust for explosion speed)
        repeat: 0          // Play once
    });
}


    connect() {
        var self = this;
        this.room = client.join("outdoor", {});


        this.room.onJoin.add(() => {

            self.roomJoined = true;

            this.room.onStateChange.addOnce((state) => {
                // Loop over all the player data received
                for (let id in state.players) {
                    // If the player hasn't been created yet
                    if (self.players[id] == undefined && id != this.room.sessionId) { // Make sure you don't create yourself
                        let data = state.players[id];
                        self.addPlayer({
                            id: id,
                            x: data.x,
                            y: data.y,
                            rotation: data.rotation || 0
                        });
                        let player_sprite = self.players[id].sprite;
                        player_sprite.target_x = state.players[id].x; // Update target, not actual position, so we can interpolate
                        player_sprite.target_y = state.players[id].y;
                        player_sprite.target_rotation = (state.players[id].rotation || 0);
                    }

                }
            });

            this.room.state.players.onAdd = (player, sessionId) => {
                //to prevent the player from recieving a message when he is the new player added
                if (sessionId != this.room.sessionId) {
                    // If you want to track changes on a child object inside a map, this is a common pattern:
                    player.onChange = function (changes) {
                        changes.forEach(change => {
                            if (change.field == "rotation") {
                                self.players[sessionId].sprite.target_rotation = change.value;
                            } else if (change.field == "x") {
                                self.players[sessionId].sprite.target_x = change.value;
                            } else if (change.field == "y") {
                                self.players[sessionId].sprite.target_y = change.value;
                            }
                        });
                    };

                }
            }

            this.room.state.bullets.onAdd = (bullet, sessionId) => {
                self.bullets[bullet.index] = self.physics.add.sprite(bullet.x, bullet.y, 'bullet').setRotation(bullet.angle);

                // If you want to track changes on a child object inside a map, this is a common pattern:
                bullet.onChange = function (changes) {
                    changes.forEach(change => {
                        if (change.field == "x") {
                            self.bullets[bullet.index].x = change.value;
                        } else if (change.field == "y") {
                            self.bullets[bullet.index].y = change.value;
                        }
                    });
                };

            }

            this.room.state.bullets.onRemove = function (bullet, sessionId) {
                self.removeBullet(bullet.index);
            }



            this.room.state.players.onRemove = function (player, sessionId) {
                //if the player removed (maybe killed) is not this player
                if (sessionId !== self.room.sessionId) {
                    self.removePlayer(sessionId);
                }
            }
        });

        this.room.onMessage.add((message) => {
            if (message.event == "start_position") {
                let spawnPoint = this.map.findObject("player", obj => obj.name === `player${message.position}`);
                let position = {
                    x: spawnPoint.x,
                    y: spawnPoint.y
                }
                this.room.send({
                    action: "initial_position",
                    data: position
                });
                self.addPlayer({
                    id: this.room.sessionId,
                    x: spawnPoint.x,
                    y: spawnPoint.y
                });
            } else if (message.event == "new_player") {
                let spawnPoint = this.map.findObject("player", obj => obj.name === `player${message.position}`);
                let p = self.addPlayer({
                    x: spawnPoint.x,
                    y: spawnPoint.y,
                    id: message.id,
                    rotation: message.rotation || 0
                });
            } else if (message.event == "hit") {
    if (message.punished_id == self.room.sessionId) {
        // Use the new damage system instead of directly modifying health
        self.takeDamage(10); // Reduce health by 10 using the proper damage system
        
        // Check if player died from this hit
        if (self.currentHealth <= 0) {
            // Optional: Implement spectator mode instead of immediate disconnection
            self.handleDeath();
        }
    }

                 if (self.currentHealth <= 0) {
        self.closingMessage = "You have been killed.\nTo restart, reload the page";
        this.player.sprite.destroy();
        delete this.player;
        alert(self.closingMessage);
        client.close();
    }
            } else {
                console.log(`${message.event} is an unkown event`);
            }
        });

        this.room.onError.add(() => {
            alert(room.sessionId + " couldn't join " + room.name);
        });

    }

    update() {
        // Handle sprite switching
        if (this.player) {
            // Check for sprite change keys
            if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.one)) {
                this.changeSpriteTexture('empty_hands');
            } else if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.two)) {
                this.changeSpriteTexture('klakin');
            } else if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.three)) {
                this.changeSpriteTexture('shootgun');
            } else if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.four)) {
                this.changeSpriteTexture('grinad');
            }

            // Test damage with H key (for testing health bar changes)
            if (Phaser.Input.Keyboard.JustDown(this.testDamageKey)) {
                this.takeDamage(20); // Deal 20 damage for testing
                console.log(`Health after H key press: ${this.currentHealth}`);
            }
        }

        for (let id in this.players) {
            let p = this.players[id].sprite;
            p.x += ((p.target_x || p.x) - p.x) * 0.5;
            p.y += ((p.target_y || p.x) - p.y) * 0.5;
            // Intepolate angle while avoiding the positive/negative issue 
            let angle = p.target_rotation || p.rotation;
            let dir = (angle - p.rotation) / (Math.PI * 2);
            dir -= Math.round(dir);
            dir = dir * Math.PI * 2;
            p.rotation += dir;
        }

        if (this.player) {
            this.player.sprite.setVelocity(0);
            
            // Get current weapon configuration
            const currentWeapon = this.weaponConfig[this.currentSpriteKey];
            const moveSpeed = currentWeapon.speed;

            if (this.cursors.left.isDown) {
                this.rotatePlayer();
                this.player.sprite.setVelocityX(-moveSpeed);
            } else if (this.cursors.right.isDown) {
                this.rotatePlayer();
                this.player.sprite.setVelocityX(moveSpeed);
            }

            if (this.cursors.up.isDown) {
                this.rotatePlayer();
                this.player.sprite.setVelocityY(-moveSpeed);
            } else if (this.cursors.down.isDown) {
                this.rotatePlayer();
                this.player.sprite.setVelocityY(moveSpeed);
            }

            this.shot = false;

            if (this.roomJoined) {
                this.room.send({
                    action: "move",
                    data: {
                        x: this.player.sprite.x,
                        y: this.player.sprite.y,
                        rotation: this.player.sprite.rotation
                    }
                });
            }
        }

    }

    // Update health bar to use appropriate image based on health percentage
    updateHealthBarImage() {
        const healthPercentage = (this.currentHealth / this.maxHealth) * 100;
        let targetImageNumber;
        
        if (healthPercentage > 80) {
            targetImageNumber = 1; // HealthBar1.png - full health
        } else if (healthPercentage > 60) {
            targetImageNumber = 2; // HealthBar2.png
        } else if (healthPercentage > 40) {
            targetImageNumber = 3; // HealthBar3.png
        } else if (healthPercentage > 20) {
            targetImageNumber = 4; // HealthBar4.png
        } else {
            targetImageNumber = 5; // HealthBar5.png - critical health
        }
        
        // Only update if the image needs to change
        if (this.currentHealthBarImage !== targetImageNumber) {
            const oldImageNumber = this.currentHealthBarImage;
            this.currentHealthBarImage = targetImageNumber;
            this.healthBarSprite.setTexture(`healthBar${targetImageNumber}`);
            
            // Add damage flash effect when taking damage (image number increases = worse health)
            if (targetImageNumber > oldImageNumber) {
                this.animateHealthBarDamage();
            }
        }
    }

    // Animate health bar when taking damage
    animateHealthBarDamage() {
        // Flash effect
        this.healthBarSprite.setTint(0xff0000); // Red tint
        
        this.tweens.add({
            targets: this.healthBarSprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2,
            ease: "Power2",
            onComplete: () => {
                this.healthBarSprite.clearTint(); // Remove tint
                this.healthBarSprite.setAlpha(1); // Ensure alpha is reset
            }
        });
    }

  //Update the Health Bar
   updateHealthBar(damageTaken = 0) {
    const targetHealth = Phaser.Math.Clamp(this.currentHealth, 0, this.maxHealth);
    
    // Update the health bar image based on current health
    this.updateHealthBarImage();
    
    // Animate health decrease
    this.tweens.addCounter({
        from: this.displayedHealth,
        to: targetHealth,
        duration: this.HEALTH_BAR_CONFIG.animationDuration,
        ease: "Power2",
        onUpdate: (tween) => {
            this.displayedHealth = tween.getValue();
        },
        onComplete: () => {
            // Ensure final health bar image is correct
            this.updateHealthBarImage();
        }
    });
    
    // Show damage animation
    if (damageTaken > 0) {
        this.animateHealthBarDamage();
    }
    
    // Low health warning effect
    if (this.currentHealth <= this.maxHealth * 0.2) {
        this.animateLowHealthWarning();
    } else {
        this.stopLowHealthEffects();
    }
}


takeDamage(amount) {
    const oldHealth = this.currentHealth;
    
    // Apply damage to shield first (if you implement shields)
    if (this.hasShield && this.shieldValue > 0) {
        const shieldDamage = Math.min(amount, this.shieldValue);
        this.shieldValue -= shieldDamage;
        amount -= shieldDamage;
        this.updateShieldBar();
    }
    
    // Apply remaining damage to health
    if (amount > 0) {
        this.currentHealth = Phaser.Math.Clamp(this.currentHealth - amount, 0, this.maxHealth);
        this.updateHealthBar(oldHealth - this.currentHealth);
    }
    
    // Check for death
    if (this.currentHealth <= 0) {
        this.handleDeath();
    }
}

handleDeath() {
    this.closingMessage = "You have been killed.\nTo restart, reload the page";
    if (this.player && this.player.sprite) {
        this.player.sprite.destroy();
    }
    delete this.player;
    this.stopLowHealthEffects();
    alert(this.closingMessage);
    client.close();
}

animateLowHealthWarning() {
    // Pulsing effect for low health on the health bar image
    this.tweens.add({
        targets: this.healthBarSprite,
        alpha: 0.6,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });
    
    // Add heartbeat sound effect (you can add this later)
    // if (!this.heartbeatSound) {
    //     this.heartbeatSound = this.sound.add('heartbeat');
    //     this.heartbeatSound.setLoop(true).play();
    // }
}

stopLowHealthEffects() {
    this.tweens.killTweensOf(this.healthBarSprite);
    this.healthBarSprite.setAlpha(1);
    
    if (this.heartbeatSound) {
        this.heartbeatSound.stop();
        this.heartbeatSound = null;
    }
}

    addPlayer(data) {
        let id = data.id;
        // Use the current sprite key for new players, or default to empty_hands
        let spriteKey = (id == this.room.sessionId) ? this.currentSpriteKey : 'empty_hands';
        let sprite = this.physics.add.sprite(data.x, data.y, spriteKey).setSize(120, 165);

        if (id == this.room.sessionId) {
            this.player = {};
            this.player.sprite = sprite;
            this.player.sprite.setCollideWorldBounds(true);
            this.cameras.main.startFollow(this.player.sprite);
            this.physics.add.collider(this.player.sprite, this.map["blockLayer"]);

        } else {
            this.players[id] = {};
            this.players[id].sprite = sprite;
            this.players[id].sprite.setTint("0xff0000");
            this.players[id].sprite.setRotation(data.rotation);
        }
    }

    removePlayer(id) {
        this.players[id].sprite.destroy();
        delete this.players[id];
    }

    rotatePlayer(pointer = this.input.activePointer) {
        let player = this.player.sprite;
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY)
        player.setRotation(angle + Math.PI / 2);
    }

    removeBullet(index) {
        this.bullets[index].destroy();
        delete this.bullets[index];
    }

    changeSpriteTexture(spriteKey) {
        if (this.currentSpriteKey !== spriteKey && this.player && this.player.sprite) {
            // Stop any reload if switching away from grenade
            if (this.currentSpriteKey === 'grinad') {
                this.isReloading = false;
            }

            this.currentSpriteKey = spriteKey;
            this.player.sprite.setTexture(spriteKey);
            
            const weapon = this.weaponConfig[spriteKey];
            
            // Enhanced weapon display text
            let weaponInfo = `${weapon.name}`;
            if (weapon.canShoot) {
                weaponInfo += ` | DMG: ${weapon.damage} | RNG: ${weapon.range}m`;
            } else if (weapon.canThrowGrenade) {
                weaponInfo += ` | DMG: ${weapon.damage} | RNG: ${weapon.range}m | EXPLOSIVE`;
            }
            
            if (this.weaponText) {
                this.weaponText.setText(weaponInfo);
            }
            
            // Optional: Send sprite change to server
            if (this.roomJoined) {
                this.room.send({
                    action: "change_sprite",
                    data: {
                        spriteKey: spriteKey
                    }
                });
            }
        }
    }

    // Add new method for weapon-specific firing
fireWeapon(weapon, pointer) {
    this.bulletSound.play();
    
    // Calculate base angle towards mouse
    const baseAngle = this.player.sprite.rotation;
    
    // Fire multiple bullets based on weapon type
    for (let i = 0; i < weapon.bulletCount; i++) {
        let bulletAngle = baseAngle;
        
        // Apply spread for multiple bullets
        if (weapon.bulletCount > 1) {
            const spreadRange = weapon.spread;
            const spreadStep = (spreadRange * 2) / (weapon.bulletCount - 1);
            bulletAngle += -spreadRange + (i * spreadStep);
        } else if (weapon.spread > 0) {
            // Add small random spread for single shots
            bulletAngle += (Math.random() - 0.5) * weapon.spread;
        }
        
        // Calculate bullet velocity
        let speed_x = Math.cos(bulletAngle + Math.PI / 2) * (weapon.bulletSpeed / 16);
        let speed_y = Math.sin(bulletAngle + Math.PI / 2) * (weapon.bulletSpeed / 16);
        
        // Send bullet data to server with weapon info
        this.room.send({
            action: "shoot_bullet",
            data: {
                x: this.player.sprite.x,
                y: this.player.sprite.y,
                angle: bulletAngle,
                speed_x: speed_x,
                speed_y: speed_y,
                weaponType: this.currentSpriteKey,
                damage: weapon.damage,
                range: weapon.range,
                explosive: weapon.explosive || false
            }
        });
        
        // Add small delay between pellets for shotgun effect
        if (weapon.bulletCount > 1 && i > 0) {
            setTimeout(() => {
                // This creates a slight stagger effect for shotgun pellets
            }, i * 10);
        }
    }
    
    // Add weapon-specific visual effects
    this.addMuzzleFlash(weapon);
}

// Add muzzle flash effect
addMuzzleFlash(weapon) {
    const flash = this.add.graphics();
    
    // Calculate muzzle position at the tip of the weapon
    const muzzleDistance = 70; // Distance from player center to weapon tip
    const muzzleX = this.player.sprite.x + Math.cos(this.player.sprite.rotation + Math.PI / 2) * muzzleDistance;
    const muzzleY = this.player.sprite.y + Math.sin(this.player.sprite.rotation + Math.PI / 2) * muzzleDistance;
    
    // Create a more realistic muzzle flash shape
    const flashLength = weapon.bulletCount > 1 ? 25 : 20;
    const flashWidth = weapon.bulletCount > 1 ? 15 : 10;
    
    // Draw a flame-like shape instead of a circle
    flash.fillStyle(0xFFFFAA, 0.9);
    
    // Main flash (elongated ellipse)
    flash.fillEllipse(muzzleX, muzzleY, flashLength, flashWidth);
    
    // Add inner bright core
    flash.fillStyle(0xFFFFFF, 0.7);
    flash.fillEllipse(muzzleX, muzzleY, flashLength * 0.6, flashWidth * 0.6);
    
    // Rotate the flash to match weapon direction
    flash.setRotation(this.player.sprite.rotation);
    
    // Quick fade animation
    this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 0.3,
        duration: 80,
        ease: "Power3.easeOut",
        onComplete: () => flash.destroy()
    });
}

// Add new grenade throwing method
throwGrenade(pointer) {
    // Calculate mouse position in world coordinates
    const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // Calculate distance and limit range
    const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x, 
        this.player.sprite.y, 
        worldPointer.x, 
        worldPointer.y
    );
    
    const maxRange = this.weaponConfig['grinad'].range;
    let targetX = worldPointer.x;
    let targetY = worldPointer.y;
    
    // Limit throw distance
    if (distance > maxRange) {
        const angle = Phaser.Math.Angle.Between(
            this.player.sprite.x, 
            this.player.sprite.y, 
            worldPointer.x, 
            worldPointer.y
        );
        targetX = this.player.sprite.x + Math.cos(angle) * maxRange;
        targetY = this.player.sprite.y + Math.sin(angle) * maxRange;
    }

    // Start reload sequence
    this.startGrenadeReload();

    // Create and animate the grenade
    this.createGrenadeProjectile(targetX, targetY);

    // Send grenade data to server
    this.room.send({
        action: "throw_grenade",
        data: {
            startX: this.player.sprite.x,
            startY: this.player.sprite.y,
            targetX: targetX,
            targetY: targetY,
            damage: this.weaponConfig['grinad'].damage,
            explosive: true
        }
    });
}

// Create and animate the grenade projectile
createGrenadeProjectile(targetX, targetY) {
    // Create grenade sprite
    const grenade = this.add.image(this.player.sprite.x, this.player.sprite.y, 'the_grinad');
    grenade.setScale(0.8); // Make it smaller
    grenade.setDepth(15); // Above other objects
    
    // Calculate flight time based on distance
    const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x, 
        this.player.sprite.y, 
        targetX, 
        targetY
    );
    const flightTime = Math.min(1000 + (distance / 2), 2000); // 1-2 seconds flight time

    // Animate grenade movement with arc
    this.tweens.add({
        targets: grenade,
        x: targetX,
        y: targetY,
        duration: flightTime,
        ease: "Quad.easeOut",
        onComplete: () => {
            // Explosion effect at target location
            this.createExplosionEffect(targetX, targetY);
            grenade.destroy();
        }
    });

    // Add rotation animation
    this.tweens.add({
        targets: grenade,
        rotation: Math.PI * 4, // Spin 2 full rotations
        duration: flightTime,
        ease: "Linear"
    });

    // Add arc effect by animating scale to simulate height
    this.tweens.add({
        targets: grenade,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: flightTime / 2,
        yoyo: true,
        ease: "Sine.easeInOut"
    });
}

// Create explosion effect
createExplosionEffect(x, y) {
    // Create animated explosion sprite
    const explosion = this.add.sprite(x, y, 'explosion1');
    explosion.setScale(2); // Make it bigger - adjust size as needed
    explosion.setDepth(16);
    
    // Play the explosion animation
    explosion.play('explode');
    
    // Remove sprite when animation completes
    explosion.on('animationcomplete', () => {
        explosion.destroy();
    });
    
    // Optional: Add screen shake for impact (remove if you don't want it)
    // this.cameras.main.shake(200, 0.01);
}

// Start reload sequence
startGrenadeReload() {
    this.isReloading = true;
    
    // Switch to no_grinad sprite
    this.player.sprite.setTexture('no_grinad');
    
    // Update weapon text to show reloading
    if (this.weaponText) {
        this.weaponText.setText('Grenade Launcher | Reloading...');
    }

    // After reload time, switch back to grinad sprite
    this.time.delayedCall(this.weaponConfig['grinad'].fireRate, () => {
        if (this.currentSpriteKey === 'grinad' && this.player && this.player.sprite) {
            this.player.sprite.setTexture('grinad');
            this.isReloading = false;
            
            // Update weapon text
            if (this.weaponText) {
                const weapon = this.weaponConfig['grinad'];
                this.weaponText.setText(`${weapon.name} | DMG: ${weapon.damage} | RNG: ${weapon.range}m | EXPLOSIVE`);
            }
        }
    });
}
}


