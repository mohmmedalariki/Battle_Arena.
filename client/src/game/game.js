"use-strict"

import Phaser from "phaser";
import emptyHandsImage from "./../assets/Empty_hands.png"
import klakinImage from "./../assets/Klakin.png"
import shootGunImage from "./../assets/ShootGun.png"
import grinadImage from "./../assets/Grinad.png"
import noGrinadImage from "./../assets/No_grinad.png"
import blueEmptyHandsImage from "./../assets/Blue_Empty_hands.png"
import blueKlakinImage from "./../assets/Blue_Klakin.png"
import blueShootGunImage from "./../assets/Blue_ShootGun.png"
import blueGrinadImage from "./../assets/Blue_Grinad.png"
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
import gunBar1Image from "./../assets/GunBar1.png";
import gunBar2Image from "./../assets/GunBar2.png";
import gunBar3Image from "./../assets/GunBar3.png";
import gunBar4Image from "./../assets/GunBar4.png";
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
        
        // Gun bar config constants - positioned in bottom right corner
        this.GUN_BAR_CONFIG = {
            width: 260,
            height: 80,
            offsetX: 20,  // Distance from right edge
            offsetY: 20   // Distance from bottom edge
        };
        
        // Add current sprite tracker
        this.currentSpriteKey = 'empty_hands';

        // Performance Optimizations
        this.PERFORMANCE_CONFIG = {
            NETWORK_SEND_RATE: 60,           // Send updates 60 times per second max
            INTERPOLATION_RATE: 0.15,        // Smooth interpolation
            OBJECT_POOL_SIZE: 50,            // Pre-allocate objects
            POSITION_THRESHOLD: 2,           // Only send if moved more than 2 pixels
            ROTATION_THRESHOLD: 0.05         // Only send if rotated more than 0.05 radians
        };

        // Network optimization variables
        this.lastNetworkSend = 0;
        this.lastPosition = { x: 0, y: 0, rotation: 0 };
        this.networkBuffer = [];
        
        // Object pools for performance
        this.bulletPool = [];
        this.explosionPool = [];
        this.particlePool = [];

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
                fireRate: 2500,         // 2.5 second reload time
                bulletCount: 1,
                spread: 0,
                damage: 80,             // Reduced from 100 to 80 for better balance
                bulletSpeed: 300,
                range: 450,             // Reduced from 600 to 450 for more logical range
                explosive: true,
                explosionRadius: 120    // Add explosion radius property
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
        
                // Team Selection Logic - Initialize team-specific sprites
        this.selectedTeam = (window.gameConfig && window.gameConfig.selectedTeam) || 'orange';
        console.log(`🎮 Game initialized with team: ${this.selectedTeam}`);
        console.log('🔍 window.gameConfig:', window.gameConfig);
        
        // Team-specific sprite mapping
        if (this.selectedTeam === 'blue') {
            console.log('🔵 Loading BLUE team sprites');
            this.teamSprites = {
                'empty_hands': 'blue_empty_hands',
                'klakin': 'blue_klakin',
                'shootgun': 'blue_shootgun',
                'grinad': 'blue_grinad',
                'no_grinad': 'blue_empty_hands' // Use blue empty hands when grenade is loading
            };
        } else {
            console.log('🟠 Loading ORANGE team sprites');
            // Orange/default team
            this.teamSprites = {
                'empty_hands': 'empty_hands',
                'klakin': 'klakin',
                'shootgun': 'shootgun',
                'grinad': 'grinad',
                'no_grinad': 'no_grinad'
            };
        }
    }
    
    setupTeamSprites() {
        // Define sprite mappings based on team
        if (this.selectedTeam === 'blue') {
            this.teamSprites = {
                'empty_hands': 'blue_empty_hands',
                'klakin': 'blue_klakin',
                'shootgun': 'blue_shootgun',
                'grinad': 'blue_grinad',
                'no_grinad': 'blue_empty_hands' // Use blue empty hands when grenade is loading
            };
        } else {
            // Orange/default team
            this.teamSprites = {
                'empty_hands': 'empty_hands',
                'klakin': 'klakin',
                'shootgun': 'shootgun',
                'grinad': 'grinad',
                'no_grinad': 'no_grinad'
            };
        }
    }
    
    // Helper method to get team-specific sprite key
    getTeamSpriteKey(baseSpriteKey) {
        const teamSpriteKey = this.teamSprites[baseSpriteKey] || baseSpriteKey;
        console.log(`🎨 Sprite mapping: ${baseSpriteKey} → ${teamSpriteKey} (team: ${this.selectedTeam})`);
        return teamSpriteKey;
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
        this.currentGunBarImage = 1; // Track which gun bar image to show

        this.room = null;
        this.roomJoined = false;
        this.cursors = null;
        this.players = {};
        this.player = null;
        this.bullets = {};
        this.grenades = {};
        this.map;
        this.bulletSound = null;
        this.backgroundMusic = null;

        this.closingMessage = "You have been disconnected from the server";
        // Player Health Bar
        this.healthBarBackground = null;
        this.healthBar = null;
        this.currentHealth = 100;
        this.maxHealth = 100;
        
        // Performance monitoring
        this.fpsText = null;
        this.performanceStats = {
            frameCount: 0,
            lastTime: 0,
            fps: 60,
            avgFrameTime: 16.67,
            memoryUsage: 0
        };
        
        // Initialize object pools
        this.initializeObjectPools();
        
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
        
        // Load all player sprites - Orange team
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
        
        // Load all player sprites - Blue team
        this.load.spritesheet('blue_empty_hands', blueEmptyHandsImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('blue_klakin', blueKlakinImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('blue_shootgun', blueShootGunImage, { 
            frameWidth: 120,
            frameHeight: 165
        });
        this.load.spritesheet('blue_grinad', blueGrinadImage, { 
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
        
        // Load gun bar images
        this.load.image('gunBar1', gunBar1Image);
        this.load.image('gunBar2', gunBar2Image);
        this.load.image('gunBar3', gunBar3Image);
        this.load.image('gunBar4', gunBar4Image);
        
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
    // 🖱️ Mouse Wheel Weapon Switching
    // =============================
    
    // Define weapon order for cycling
    this.weaponOrder = ['empty_hands', 'shootgun', 'klakin', 'grinad'];
    this.currentWeaponIndex = 0; // Start with empty hands
    
    // Add mouse wheel event listener
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (this.player) {
            // Determine scroll direction
            if (deltaY > 0) {
                // Scroll down - next weapon
                this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponOrder.length;
            } else if (deltaY < 0) {
                // Scroll up - previous weapon
                this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weaponOrder.length) % this.weaponOrder.length;
            }
            
            // Switch to the selected weapon
            const newWeapon = this.weaponOrder[this.currentWeaponIndex];
            this.changeSpriteTexture(newWeapon);
            
            console.log(`🖱️ Mouse wheel weapon switch: ${newWeapon} (index: ${this.currentWeaponIndex})`);
        }
    });

    // =============================
    // 🎯 Performance Monitoring & FPS Counter
    // =============================
    this.fpsText = this.add.text(this.cameras.main.width - 120, 10, 'FPS: 60', {
        font: '16px monospace',
        fill: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // =============================
    // �🎮 Image-based Health Bar System
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

    // =============================
    // 🔫 Gun Bar System (Bottom Right Corner)
    // =============================
    
    // Calculate position for bottom right corner using right-bottom origin
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const gunBarX = screenWidth - this.GUN_BAR_CONFIG.offsetX;
    const gunBarY = screenHeight - this.GUN_BAR_CONFIG.offsetY;
    
    // Create gun bar sprite in bottom right corner
    this.gunBarSprite = this.add.image(gunBarX, gunBarY, 'gunBar1');
    this.gunBarSprite.setOrigin(1, 1); // Bottom-right origin for easier positioning
    this.gunBarSprite.setScrollFactor(0); // Fixed position on screen
    this.gunBarSprite.setDepth(100); // High depth to stay on top
    
    // Scale the gun bar to the desired size ONLY ONCE
    this.gunBarSprite.setDisplaySize(this.GUN_BAR_CONFIG.width, this.GUN_BAR_CONFIG.height);
    
    console.log(`Gun bar positioned at: X=${gunBarX}, Y=${gunBarY}, Screen: ${screenWidth}x${screenHeight}`);
    
    // Initialize gun bar state
    this.currentGunBarImage = 1;
    
    // Update gun bar display based on current weapon
    this.updateGunBarImage();

    // Add weapon display text (positioned at bottom of screen)
    this.weaponText = this.add.text(20, screenHeight - 40, `Weapon: ${this.weaponConfig[this.currentSpriteKey].name}`, {
        font: "16px monospace",
        fill: "#FFFFFF",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(100);

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

    // =============================
    // 🚀 Performance Optimization Methods
    // =============================

    initializeObjectPools() {
        // Pre-allocate bullet objects for performance
        this.bulletPool = [];
        for (let i = 0; i < this.PERFORMANCE_CONFIG.OBJECT_POOL_SIZE; i++) {
            this.bulletPool.push({
                sprite: null,
                active: false,
                startTime: 0,
                direction: { x: 0, y: 0 },
                speed: 0,
                lifespan: 3000
            });
        }

        // Pre-allocate explosion objects
        this.explosionPool = [];
        for (let i = 0; i < 20; i++) {
            this.explosionPool.push({
                sprite: null,
                active: false
            });
        }
    }

    getBulletFromPool() {
        for (let bullet of this.bulletPool) {
            if (!bullet.active) {
                bullet.active = true;
                return bullet;
            }
        }
        return null; // Pool exhausted
    }

    returnBulletToPool(bullet) {
        if (bullet.sprite) {
            bullet.sprite.setActive(false).setVisible(false);
        }
        bullet.active = false;
    }

    getExplosionFromPool() {
        for (let explosion of this.explosionPool) {
            if (!explosion.active) {
                explosion.active = true;
                return explosion;
            }
        }
        return null;
    }

    returnExplosionToPool(explosion) {
        if (explosion.sprite) {
            explosion.sprite.setActive(false).setVisible(false);
        }
        explosion.active = false;
    }

    // Enhanced smooth interpolation with performance optimization
    smoothLerp(current, target, factor) {
        return current + (target - current) * factor;
    }

    // Network throttling - only send if significant change
    shouldSendNetworkUpdate(newPos, newRot) {
        const now = Date.now();
        if (now - this.lastNetworkSend < (1000 / this.PERFORMANCE_CONFIG.NETWORK_SEND_RATE)) {
            return false;
        }

        const posChange = Math.abs(newPos.x - this.lastPosition.x) + Math.abs(newPos.y - this.lastPosition.y);
        const rotChange = Math.abs(newRot - this.lastPosition.rotation);

        return posChange > this.PERFORMANCE_CONFIG.POSITION_THRESHOLD || 
               rotChange > this.PERFORMANCE_CONFIG.ROTATION_THRESHOLD;
    }

    // Performance monitoring
    updatePerformanceStats() {
        this.performanceStats.frameCount++;
        const now = Date.now();
        
        if (now - this.performanceStats.lastTime >= 1000) {
            this.performanceStats.fps = this.performanceStats.frameCount;
            this.performanceStats.frameCount = 0;
            this.performanceStats.lastTime = now;
            
            // Update FPS display
            let color = '#00ff00'; // Green
            if (this.performanceStats.fps < 30) color = '#ff0000'; // Red
            else if (this.performanceStats.fps < 45) color = '#ffff00'; // Yellow
            
            this.fpsText.setText(`FPS: ${this.performanceStats.fps}`)
                       .setColor(color);
            
            // Memory usage (if available)
            if (performance.memory) {
                const memMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
                this.fpsText.setText(`FPS: ${this.performanceStats.fps} | MEM: ${memMB}MB`);
            }
        }
    }

    connect() {
        var self = this;
        // Send team information when joining the room
        console.log(`🎮 Connecting to server with team: ${this.selectedTeam}`);
        this.room = client.join("outdoor", {
            team: this.selectedTeam
        });


            this.room.onJoin.add(() => {

            self.roomJoined = true;

            this.room.onStateChange.addOnce((state) => {
                console.log('🎮 Initial state received:', {
                    players: Object.keys(state.players).length,
                    bullets: Object.keys(state.bullets).length,
                    grenades: Object.keys(state.grenades || {}).length
                });
                
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
            });            this.room.state.players.onAdd = (player, sessionId) => {
                console.log(`🎮 State: Player ${sessionId} added`);
                console.log(`🎨 Player data:`, {
                    team: player.team,
                    currentSprite: player.currentSprite,
                    x: player.x,
                    y: player.y
                });
                
                // Create the visual sprite for this player if it doesn't exist
                if (!self.players[sessionId]) {
                    // Get spawn position (use a default if no specific position)
                    let spawnX = player.x || 400;
                    let spawnY = player.y || 300;
                    
                    // Determine the correct sprite based on player's team
                    let spriteKey;
                    if (player.team === 'blue') {
                        spriteKey = player.currentSprite || 'blue_empty_hands';
                        console.log(`🔵 Blue team player: ${spriteKey}`);
                    } else {
                        spriteKey = player.currentSprite || 'empty_hands';
                        console.log(`🟠 Orange team player: ${spriteKey}`);
                    }
                    
                    console.log(`🎨 Creating player ${sessionId} with sprite: ${spriteKey}`);
                    
                    // Create the visual sprite
                    let sprite = self.physics.add.sprite(spawnX, spawnY, spriteKey).setSize(120, 165);
                    
                    // Store player reference
                    self.players[sessionId] = {};
                    self.players[sessionId].sprite = sprite;
                    self.players[sessionId].team = player.team;
                    
                    // If this is the current player, set up camera and controls
                    if (sessionId == self.room.sessionId) {
                        self.player = self.players[sessionId];
                        self.player.sprite.setCollideWorldBounds(true);
                        self.cameras.main.startFollow(self.player.sprite);
                        self.cameras.main.setLerp(0.1, 0.1);
                    }
                }
                
                // Set up change handler for this player
                if (sessionId != this.room.sessionId) {
                    player.onChange = function (changes) {
                        changes.forEach(change => {
                            if (change.field == "rotation") {
                                if (self.players[sessionId] && self.players[sessionId].sprite) {
                                    self.players[sessionId].sprite.target_rotation = change.value;
                                }
                            } else if (change.field == "x") {
                                if (self.players[sessionId] && self.players[sessionId].sprite) {
                                    self.players[sessionId].sprite.target_x = change.value;
                                }
                            } else if (change.field == "y") {
                                if (self.players[sessionId] && self.players[sessionId].sprite) {
                                    self.players[sessionId].sprite.target_y = change.value;
                                }
                            } else if (change.field == "currentSprite") {
                                // Handle sprite changes from server state
                                if (self.players[sessionId] && self.players[sessionId].sprite) {
                                    self.players[sessionId].sprite.setTexture(change.value);
                                    console.log(`🎨 State change: Player ${sessionId} sprite → ${change.value}`);
                                }
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

            this.room.state.grenades.onAdd = (grenade, sessionId) => {
                console.log(`💣 Grenade state received:`, {
                    index: grenade.index,
                    startX: grenade.startX,
                    startY: grenade.startY,
                    targetX: grenade.targetX,
                    targetY: grenade.targetY,
                    startTime: grenade.startTime
                });
                self.createGrenadeFromServer(grenade);
            }

            this.room.state.grenades.onRemove = function (grenade, sessionId) {
                console.log(`💥 Grenade ${grenade.index} exploded at (${grenade.targetX}, ${grenade.targetY})`);
                // Create explosion effect at target location
                if (self.grenades[grenade.index]) {
                    self.createExplosionEffect(grenade.targetX, grenade.targetY);
                    // Clean up grenade sprite
                    if (self.grenades[grenade.index].sprite) {
                        self.grenades[grenade.index].sprite.destroy();
                    }
                    delete self.grenades[grenade.index];
                } else {
                    // Even if we don't have the grenade sprite, still show explosion
                    self.createExplosionEffect(grenade.targetX, grenade.targetY);
                }
            }



            this.room.state.players.onRemove = function (player, sessionId) {
                console.log(`🗑️  Player ${sessionId} removed from server state`);
                
                // Remove the player visually for everyone (including if it's the current player who died)
                if (sessionId !== self.room.sessionId) {
                    // Remove other players
                    self.removePlayer(sessionId);
                } else {
                    // Current player died - handled by death message system
                    console.log(`☠️  Current player removed from server`);
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
                // Player creation is now handled by state system, not messages
                // self.addPlayer({
                //     id: this.room.sessionId,
                //     x: spawnPoint.x,
                //     y: spawnPoint.y
                // });
            } else if (message.event == "new_player") {
                // Player creation is now handled by state system, not messages
                // let spawnPoint = this.map.findObject("player", obj => obj.name === `player${message.position}`);
                // let p = self.addPlayer({
                //     x: spawnPoint.x,
                //     y: spawnPoint.y,
                //     id: message.id,
                //     team: message.team || 'orange',
                //     rotation: message.rotation || 0
                // });
                console.log('📨 new_player message received (handled by state system)');
            } else if (message.event == "hit") {
                if (message.punished_id == self.room.sessionId) {
                    // Get damage amount from server (or use default)
                    let damage = message.damage || 10;
                    
                    // Use the new damage system with proper damage amount
                    self.takeDamage(damage);
                    
                    // Check if player died from this hit
                    if (self.currentHealth <= 0) {
                        // Let handleDeath() manage the death process properly
                        self.handleDeath();
                    }
                    
                    // Show appropriate hit message
                    let weaponType = message.weaponType || 'bullet';
                    console.log(`💥 Hit by ${weaponType}! Damage: ${damage}, Health: ${self.currentHealth}`);
                }
            } else if (message.event == "player_sprite_changed") {
                // Sprite changes are now handled by state system
                console.log(`📨 Sprite change message (handled by state system): ${message.sprite}`);
            } else {
                console.log(`${message.event} is an unkown event`);
            }
        });

        this.room.onError.add(() => {
            alert(room.sessionId + " couldn't join " + room.name);
        });

    }

    update() {
        // Performance monitoring
        this.updatePerformanceStats();

        // Handle sprite switching
        if (this.player) {
            // Check for sprite change keys
            if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.one)) {
                this.currentWeaponIndex = 0; // Sync with mouse wheel
                this.changeSpriteTexture('empty_hands');
            } else if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.two)) {
                this.currentWeaponIndex = 1; // Sync with mouse wheel
                this.changeSpriteTexture('shootgun');  // Changed: Key 2 now switches to ShootGun
            } else if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.three)) {
                this.currentWeaponIndex = 2; // Sync with mouse wheel
                this.changeSpriteTexture('klakin');    // Changed: Key 3 now switches to Klakin
            } else if (Phaser.Input.Keyboard.JustDown(this.spriteKeys_input.four)) {
                this.currentWeaponIndex = 3; // Sync with mouse wheel
                this.changeSpriteTexture('grinad');
            }

            // Test damage with H key (for testing health bar changes)
            if (Phaser.Input.Keyboard.JustDown(this.testDamageKey)) {
                this.takeDamage(20); // Deal 20 damage for testing
                console.log(`Health after H key press: ${this.currentHealth}`);
            }
        }

        // Optimized smooth interpolation for other players
        for (let id in this.players) {
            let p = this.players[id].sprite;
            if (p.target_x !== undefined && p.target_y !== undefined) {
                // Use enhanced smooth lerp instead of basic interpolation
                p.x = this.smoothLerp(p.x, p.target_x, this.PERFORMANCE_CONFIG.INTERPOLATION_RATE);
                p.y = this.smoothLerp(p.y, p.target_y, this.PERFORMANCE_CONFIG.INTERPOLATION_RATE);
                
                // Optimized rotation interpolation
                if (p.target_rotation !== undefined) {
                    let angleDiff = p.target_rotation - p.rotation;
                    // Normalize angle difference to [-π, π]
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    p.rotation += angleDiff * this.PERFORMANCE_CONFIG.INTERPOLATION_RATE;
                }
            }
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

            // Optimized network sending with throttling
            if (this.roomJoined) {
                const currentPos = {
                    x: this.player.sprite.x,
                    y: this.player.sprite.y
                };
                const currentRot = this.player.sprite.rotation;

                // Only send network update if significant change occurred
                if (this.shouldSendNetworkUpdate(currentPos, currentRot)) {
                    this.room.send({
                        action: "move",
                        data: {
                            x: currentPos.x,
                            y: currentPos.y,
                            rotation: currentRot
                        }
                    });
                    
                    // Update last sent values and timestamp
                    this.lastPosition = { 
                        x: currentPos.x, 
                        y: currentPos.y, 
                        rotation: currentRot 
                    };
                    this.lastNetworkSend = Date.now();
                }
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
    console.log(`☠️  Player death - notifying server and cleaning up`);
    
    this.closingMessage = "You have been killed.\nTo restart, reload the page";
    
    // Notify server that this player has died
    if (this.roomJoined && this.room) {
        this.room.send({
            action: "player_died",
            data: {
                playerId: this.room.sessionId
            }
        });
    }
    
    if (this.player && this.player.sprite) {
        this.player.sprite.destroy();
    }
    delete this.player;
    this.stopLowHealthEffects();
    
    // Add a small delay before closing to allow server state synchronization
    setTimeout(() => {
        alert(this.closingMessage);
        client.close();
    }, 1000); // 1 second delay to allow other players to see the death
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

    // =============================
    // 🔫 Gun Bar System Methods
    // =============================

    updateGunBarImage() {
        let targetImageNumber;
        
        // Map weapon types to gun bar images
        switch(this.currentSpriteKey) {
            case 'empty_hands':
                targetImageNumber = 1; // GunBar1.png - No weapon
                break;
            case 'klakin':
                targetImageNumber = 3; // GunBar3.png - Kalashnikov (changed from 2)
                break;
            case 'shootgun':
                targetImageNumber = 2; // GunBar2.png - Shotgun (changed from 3)
                break;
            case 'grinad':
                targetImageNumber = 4; // GunBar4.png - Grenade Launcher
                break;
            case 'no_grinad':
                targetImageNumber = 1; // GunBar1.png - Empty launcher (treat as no weapon)
                break;
            default:
                targetImageNumber = 1; // Default to no weapon
        }
        
        // Only update if the image needs to change
        if (this.currentGunBarImage !== targetImageNumber) {
            this.currentGunBarImage = targetImageNumber;
            this.gunBarSprite.setTexture(`gunBar${targetImageNumber}`);
            
            // Add a subtle weapon change animation
            this.animateGunBarChange();
        }
    }

    // Animate gun bar when weapon changes
    animateGunBarChange() {
        // Calculate the correct position using the same logic as initialization
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const correctX = screenWidth - this.GUN_BAR_CONFIG.offsetX;
        const correctY = screenHeight - this.GUN_BAR_CONFIG.offsetY;
        
        // Simple 2-pixel shock animation only
        this.tweens.add({
            targets: this.gunBarSprite,
            x: correctX - 2,
            y: correctY - 2,
            duration: 50,
            yoyo: true,
            repeat: 1,
            ease: "Power2",
            onComplete: () => {
                // Ensure gun bar returns to exact correct position
                this.gunBarSprite.setPosition(correctX, correctY);
                console.log(`🎯 Gun bar position restored to: X=${correctX}, Y=${correctY}`);
            }
        });
    }

    addPlayer(data) {
        let id = data.id;
        let playerTeam = data.team || 'orange';
        
        // Use the current sprite key for own player, or default to empty_hands for others
        let baseSpriteKey = (id == this.room.sessionId) ? this.currentSpriteKey : 'empty_hands';
        
        // For other players, we need to create a temporary context to get their team sprite
        let spriteKey;
        if (id == this.room.sessionId) {
            // Use our own team sprite system
            spriteKey = this.getTeamSpriteKey(baseSpriteKey);
        } else {
            // For other players, manually determine team-specific sprite
            if (playerTeam === 'blue') {
                switch(baseSpriteKey) {
                    case 'empty_hands': spriteKey = 'blue_empty_hands'; break;
                    case 'klakin': spriteKey = 'blue_klakin'; break;
                    case 'shootgun': spriteKey = 'blue_shootgun'; break;
                    case 'grinad': spriteKey = 'blue_grinad'; break;
                    case 'no_grinad': spriteKey = 'blue_empty_hands'; break;
                    default: spriteKey = 'blue_empty_hands';
                }
            } else {
                spriteKey = baseSpriteKey;
            }
        }
        
        console.log(`🎮 Adding player ${id} with team: ${playerTeam}, sprite: ${spriteKey}`);
        
        let sprite = this.physics.add.sprite(data.x, data.y, spriteKey).setSize(120, 165);

        if (id == this.room.sessionId) {
            this.player = {};
            this.player.sprite = sprite;
            this.player.sprite.setCollideWorldBounds(true);
            
            // Enhanced smooth camera following with optimization
            this.cameras.main.startFollow(this.player.sprite);
            this.cameras.main.setLerp(0.1, 0.1); // Smooth camera movement
            this.cameras.main.setDeadzone(50, 50); // Don't move camera for small movements
            this.cameras.main.setZoom(1); // Ensure proper zoom level
            
            this.physics.add.collider(this.player.sprite, this.map["blockLayer"]);
            
            // Update gun bar to show current weapon when player spawns
            this.updateGunBarImage();

        } else {
            this.players[id] = {};
            this.players[id].sprite = sprite;
            this.players[id].sprite.setTint("0xff0000");
            this.players[id].sprite.setRotation(data.rotation);
        }
    }

    removePlayer(id) {
        console.log(`🗑️  Attempting to remove player: ${id}`);
        console.log(`🗑️  Player exists:`, !!this.players[id]);
        console.log(`🗑️  Sprite exists:`, !!(this.players[id] && this.players[id].sprite));
        
        if (this.players[id] && this.players[id].sprite) {
            this.players[id].sprite.destroy();
            delete this.players[id];
            console.log(`✅ Successfully removed player: ${id}`);
        } else {
            console.log(`⚠️  Player ${id} was already removed or doesn't exist`);
        }
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

    // Create grenade projectile from server state
    createGrenadeFromServer(grenadeData) {
        console.log(`🎯 Creating grenade visual for index ${grenadeData.index}`);
        
        // Create grenade sprite
        const grenade = this.add.image(grenadeData.startX, grenadeData.startY, 'the_grinad');
        grenade.setScale(0.8);
        grenade.setDepth(15);
        
        // Store grenade reference
        this.grenades[grenadeData.index] = {
            sprite: grenade,
            targetX: grenadeData.targetX,
            targetY: grenadeData.targetY
        };
        
        console.log(`🚀 Grenade ${grenadeData.index} sprite created at (${grenadeData.startX}, ${grenadeData.startY})`);
        
        // Calculate flight time
        const distance = Phaser.Math.Distance.Between(
            grenadeData.startX, grenadeData.startY,
            grenadeData.targetX, grenadeData.targetY
        );
        const flightTime = Math.min(1000 + (distance / 2), 2000);
        
        console.log(`⏱️ Grenade flight time: ${flightTime}ms, distance: ${Math.round(distance)}px`);

        // Animate grenade movement
        this.tweens.add({
            targets: grenade,
            x: grenadeData.targetX,
            y: grenadeData.targetY,
            duration: flightTime,
            ease: "Quad.easeOut",
            onComplete: () => {
                console.log(`🎯 Grenade ${grenadeData.index} reached target`);
            }
        });

        // Add rotation animation
        this.tweens.add({
            targets: grenade,
            rotation: Math.PI * 4,
            duration: flightTime,
            ease: "Linear"
        });

        // Add arc effect
        this.tweens.add({
            targets: grenade,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: flightTime / 2,
            yoyo: true,
            ease: "Sine.easeInOut"
        });
    }

    changeSpriteTexture(spriteKey) {
        if (this.currentSpriteKey !== spriteKey && this.player && this.player.sprite) {
            // Stop any reload if switching away from grenade
            if (this.currentSpriteKey === 'grinad') {
                this.isReloading = false;
            }

            this.currentSpriteKey = spriteKey;
            
            // Get team-specific sprite key
            const teamSpriteKey = this.getTeamSpriteKey(spriteKey);
            this.player.sprite.setTexture(teamSpriteKey);
            
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
            
            // Update gun bar to reflect current weapon
            this.updateGunBarImage();
            
            // Send sprite change to server for multiplayer sync
            if (this.roomJoined && this.room) {
                this.room.send({
                    action: "sprite_change",
                    data: {
                        sprite: teamSpriteKey
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

    console.log(`🎯 Sending grenade throw command:`, {
        startX: this.player.sprite.x,
        startY: this.player.sprite.y,
        targetX: targetX,
        targetY: targetY,
        distance: Math.round(distance),
        maxRange: maxRange
    });

    // Send grenade data to server (server will handle synchronization)
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

// Create explosion effect
createExplosionEffect(x, y) {
    // Create animated explosion sprite
    const explosion = this.add.sprite(x, y, 'explosion1');
    explosion.setScale(3); // Increased from 2 to 3 to better represent damage area
    explosion.setDepth(16);
    
    // Play the explosion animation
    explosion.play('explode');
    
    // Remove sprite when animation completes
    explosion.on('animationcomplete', () => {
        explosion.destroy();
    });
    
    // Add a temporary damage radius indicator (red circle)
    const damageRadius = this.add.graphics();
    damageRadius.lineStyle(3, 0xff0000, 0.6); // Red border
    damageRadius.fillStyle(0xff0000, 0.1); // Semi-transparent red fill
    damageRadius.fillCircle(x, y, 120); // Match server explosion radius
    damageRadius.strokeCircle(x, y, 120);
    damageRadius.setDepth(15); // Below explosion, above other objects
    
    // Fade out the damage radius indicator
    this.tweens.add({
        targets: damageRadius,
        alpha: 0,
        duration: 800,
        ease: "Power2.easeOut",
        onComplete: () => damageRadius.destroy()
    });
    
    // Optional: Add screen shake for impact (scaled based on distance)
    if (this.player) {
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y, x, y
        );
        if (distanceToPlayer < 300) {
            const shakeIntensity = Math.max(0.005, 0.02 * (300 - distanceToPlayer) / 300);
            this.cameras.main.shake(200, shakeIntensity);
        }
    }
}

// Start reload sequence
startGrenadeReload() {
    this.isReloading = true;
    
    // Switch to no_grinad sprite (team-specific)
    const noGrinadSprite = this.getTeamSpriteKey('no_grinad');
    this.player.sprite.setTexture(noGrinadSprite);
    
    // Update weapon text to show reloading
    if (this.weaponText) {
        this.weaponText.setText('Grenade Launcher | Reloading...');
    }

    // After reload time, switch back to grinad sprite
    this.time.delayedCall(this.weaponConfig['grinad'].fireRate, () => {
        if (this.currentSpriteKey === 'grinad' && this.player && this.player.sprite) {
            const grinadSprite = this.getTeamSpriteKey('grinad');
            this.player.sprite.setTexture(grinadSprite);
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


