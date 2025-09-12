"use strict";

import Phaser from "phaser";

// Asset imports
import emptyHandsImage from "./../assets/Empty_hands.png";
import klakinImage from "./../assets/Klakin.png";
import shootGunImage from "./../assets/ShootGun.png";
import grinadImage from "./../assets/Grinad.png";
import noGrinadImage from "./../assets/No_grinad.png";
import blueEmptyHandsImage from "./../assets/Blue_Empty_hands.png";
import blueKlakinImage from "./../assets/Blue_Klakin.png";
import blueShootGunImage from "./../assets/Blue_ShootGun.png";
import blueGrinadImage from "./../assets/Blue_Grinad.png";
import theGrinadImage from "./../assets/The_grinad.png";

// Explosion effects
import explosion1Image from "./../assets/Explosion1.png";  
import explosion2Image from "./../assets/Explosion2.png";  
import explosion3Image from "./../assets/Explosion3.png";  
import explosion4Image from "./../assets/Explosion4.png";  
import explosion5Image from "./../assets/Explosion5.png";  
import explosion6Image from "./../assets/Explosion6.png";  

// UI Elements
import healthBar1Image from "./../assets/HealthBar1.png";
import healthBar2Image from "./../assets/HealthBar2.png";
import healthBar3Image from "./../assets/HealthBar3.png";
import healthBar4Image from "./../assets/HealthBar4.png";
import healthBar5Image from "./../assets/HealthBar5.png";
import gunBar1Image from "./../assets/GunBar1.png";
import gunBar2Image from "./../assets/GunBar2.png";
import gunBar3Image from "./../assets/GunBar3.png";
import gunBar4Image from "./../assets/GunBar4.png";

// Map assets
import outdoor from "./../assets/tilemaps/battle-royale1.json";
import outdoorImage from "./../assets/tilemaps/battle-royale.png";

// Game objects
import bulletImage from "./../assets/bullet.png";
import cursorImage from "./../assets/cursor.cur";

// Audio assets
import bulletSound from "./../assets/sound/bulletSound.mp3";
import backgroundMusic1 from "./../assets/sound/backgroundMusic1.mp3";
import backgroundMusic2 from "./../assets/sound/backgroundMusic2.mp3";

// Multiplayer
import * as Colyseus from "colyseus.js";

const gameConfig = require('./../../config.json');

/**
 * Game Configuration and Constants
 */
const GAME_CONSTANTS = {
    SERVER: {
        DEV_PORT: gameConfig.serverDevPort,
        ENDPOINT: (window.location.hostname === "localhost") 
            ? `ws://localhost:${gameConfig.serverDevPort}` 
            : `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}:${gameConfig.serverDevPort}`
    },
    
    HEALTH_BAR: {
        width: 200,
        height: 50,
        x: 20,
        y: 20,
        borderRadius: 8,
        borderThickness: 2,
        animationDuration: 400,
        damageFlashDuration: 100
    },
    
    ENEMY_HEALTH_BAR: {
        width: 60,
        height: 8,
        offsetY: -40,
        backgroundColor: 0x000000,
        borderColor: 0xffffff,
        healthColor: 0x00ff00,
        damageColor: 0xff0000,
        borderThickness: 1
    },
    
    GUN_BAR: {
        width: 260,
        height: 80,
        offsetX: 20,
        offsetY: 20
    },
    
    BULLET: {
        width: 30,
        height: 20,
        scale: 1.0,
        rotation: Math.PI/2,
        tint: 0xffffff,
        alpha: 1.0,
        depth: 10,
        trail: false,
        trailLength: 5
    },
    
    PERFORMANCE: {
        INTERPOLATION_RATE: 0.15,
        MAX_INTERPOLATION_DISTANCE: 100,
        REDUCED_INTERPOLATION_RATE: 0.05
    },
    
    WEAPON_SWITCHING: {
        COOLDOWN_MS: 200,
        SCROLL_THRESHOLD: 1.0,
        ACCUMULATOR_DECAY: 0.95
    },
    
    GAME_MODES: {
        TEAM: 'team',
        FFA: 'ffa'
    },
    
    TEAMS: {
        BLUE: 'blue',
        ORANGE: 'orange'
    }
};

// Create the Colyseus client instance
const client = new Colyseus.Client(GAME_CONSTANTS.SERVER.ENDPOINT);

/**
 * Professional Logger System
 */
class GameLogger {
    static logLevel = 'INFO'; // 'DEBUG', 'INFO', 'WARN', 'ERROR'
    
    static debug(message, data = null) {
        if (this.logLevel === 'DEBUG') {
            console.log(`🔍 [DEBUG] ${message}`, data || '');
        }
    }
    
    static info(message, data = null) {
        if (['DEBUG', 'INFO'].includes(this.logLevel)) {
            console.log(`ℹ️ [INFO] ${message}`, data || '');
        }
    }
    
    static warn(message, data = null) {
        if (['DEBUG', 'INFO', 'WARN'].includes(this.logLevel)) {
            console.warn(`⚠️ [WARN] ${message}`, data || '');
        }
    }
    
    static error(message, data = null) {
        console.error(`❌ [ERROR] ${message}`, data || '');
    }
}

/**
 * Main Game Scene for Battle Arena
 * Handles multiplayer gameplay, weapon systems, and UI
 */
export default class Game extends Phaser.Scene {
    constructor() {
        super("Game");
        
        // Initialize configuration constants
        this.HEALTH_BAR_CONFIG = GAME_CONSTANTS.HEALTH_BAR;
        this.ENEMY_HEALTH_BAR_CONFIG = GAME_CONSTANTS.ENEMY_HEALTH_BAR;
        this.GUN_BAR_CONFIG = GAME_CONSTANTS.GUN_BAR;
        this.BULLET_CONFIG = GAME_CONSTANTS.BULLET;
        this.PERFORMANCE_CONFIG = GAME_CONSTANTS.PERFORMANCE;
        
        // Game state
        this.currentSpriteKey = 'empty_hands';
        this.gameMode = null;
        this.selectedTeam = null;
        
        // Weapon switching system
        this.weaponSwitchCooldown = 0;
        this.scrollAccumulator = 0;
        this.lastWeaponSwitchTime = 0;
        this.currentWeaponIndex = 0;
        this.weapons = ['empty_hands', 'klakin', 'shootgun', 'grinad'];
        
        // Game objects
        this.players = {};
        this.bullets = {};
        this.grenades = {};
        this.room = null;
        this.player = null;
        
        // UI Elements
        this.healthBarBackground = null;
        this.healthBar = null;
        this.gunBarBackground = null;
        this.gunBar = null;
        this.restartOverlay = null;
        
        // Game stats
        this.currentHealth = 100;
        this.currentHealthBarImage = 1;
        
        // Initialize input systems
        this.initializeInputSystems();
        
        // Load game configuration
        this.loadGameConfiguration();
    }
    
    /**
     * Initialize input key mappings
     */
    initializeInputSystems() {
        // These will be properly set up in create()
        this.moveKeys = null;
        this.shootKey = null;
        this.testDamageKey = null;
        this.restartKey = null;
    }
    
    /**
     * Load configuration from window object
     */
    loadGameConfiguration() {
        const config = window.gameConfig || {};
        this.gameMode = config.gameMode || GAME_CONSTANTS.GAME_MODES.TEAM;
        this.selectedTeam = config.selectedTeam || GAME_CONSTANTS.TEAMS.ORANGE;
        
        GameLogger.info(`Game initialized`, { 
            mode: this.gameMode, 
            team: this.selectedTeam 
        });
        
        // Initialize weapon switching system
        this.weaponSwitchCooldown = 0;
        this.scrollAccumulator = 0;
        this.lastWeaponSwitchTime = 0;
        this.currentWeaponIndex = 0;
        this.weapons = ['empty_hands', 'klakin', 'shootgun', 'grinad'];
        
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
                bulletSpeed: 1500,
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
                bulletSpeed: 1000,
                range: 400
            },
            'grinad': {
                speed: 300, // Increased from 200 to 300
                canShoot: false,        // Changed to false - no shooting
                canThrowGrenade: true,   // New property
                name: 'Grenade Launcher',
                fireRate: 1500,         // 1.5 second reload time
                bulletCount: 1,
                spread: 0,
                damage: 80,             // Reduced from 100 to 80 for better balance
                bulletSpeed: 500,
                range: 500,             // Reduced from 600 to 450 for more logical range
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
        this.gameMode = (window.gameConfig && window.gameConfig.gameMode) || 'team';
        
        console.log(`🎮 Game initialized with mode: ${this.gameMode}, team/color: ${this.selectedTeam}`);
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
    // Use CSS cursor for better cross-browser compatibility
    this.game.canvas.style.cursor = `url('assets/cursor.cur') 16 16, crosshair`;
    
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
    
    // Weapon switching control variables
    this.lastWeaponSwitchTime = 0;
    this.weaponSwitchCooldown = 150; // Minimum 150ms between switches
    this.scrollAccumulator = 0; // Accumulate scroll events
    this.scrollThreshold = 100; // Minimum scroll amount to trigger switch
    
    // Add mouse wheel event listener with controlled switching
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (this.player) {
            const currentTime = this.time.now;
            
            // Check if we're still in cooldown period
            if (currentTime - this.lastWeaponSwitchTime < this.weaponSwitchCooldown) {
                return; // Ignore rapid scroll events
            }
            
            // Accumulate scroll delta
            this.scrollAccumulator += deltaY;
            
            // Check if accumulated scroll exceeds threshold
            if (Math.abs(this.scrollAccumulator) >= this.scrollThreshold) {
                let weaponChanged = false;
                
                if (this.scrollAccumulator > 0) {
                    // Scroll down - next weapon
                    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponOrder.length;
                    weaponChanged = true;
                } else if (this.scrollAccumulator < 0) {
                    // Scroll up - previous weapon
                    this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weaponOrder.length) % this.weaponOrder.length;
                    weaponChanged = true;
                }
                
                if (weaponChanged) {
                    // Switch to the selected weapon
                    const newWeapon = this.weaponOrder[this.currentWeaponIndex];
                    this.changeSpriteTexture(newWeapon);
                    
                    // Update timing and reset accumulator
                    this.lastWeaponSwitchTime = currentTime;
                    this.scrollAccumulator = 0;
                    
                    GameLogger.debug(`Weapon switched to: ${newWeapon}`);
                }
            }
        }
    });

    // =============================
    // 🎯 Performance Monitoring & FPS Counter
    // =============================
    this.fpsText = this.add.text(10, 10, 'FPS: 60', {
        font: 'bold 14px Arial, sans-serif',
        fill: '#00ff00',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 6 },
        stroke: '#000000',
        strokeThickness: 2
    }).setScrollFactor(0).setDepth(1000);
    
    // Position FPS counter in top-right for Chrome compatibility
    this.fpsText.setPosition(this.cameras.main.width - this.fpsText.width - 10, 10);
    
    // Add window resize handler for FPS counter repositioning
    this.scale.on('resize', (gameSize, baseSize, displaySize, resolution) => {
        if (this.fpsText) {
            this.fpsText.setPosition(gameSize.width - this.fpsText.width - 10, 10);
        }
    });

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
    
    // Position gun bar in bottom right corner
    
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
                GameLogger.warn("Cannot shoot without a weapon!");
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
            
            // Update FPS display with color coding
            let color = '#00ff00'; // Green for good FPS (45+)
            let bgColor = 'rgba(0, 50, 0, 0.8)'; // Dark green background
            
            if (this.performanceStats.fps < 30) {
                color = '#ff4444'; // Red for poor FPS
                bgColor = 'rgba(50, 0, 0, 0.8)'; // Dark red background
            } else if (this.performanceStats.fps < 45) {
                color = '#ffdd44'; // Yellow for medium FPS
                bgColor = 'rgba(50, 50, 0, 0.8)'; // Dark yellow background
            }
            
            // Create display text
            let displayText = `FPS: ${this.performanceStats.fps}`;
            
            // Add memory usage if available (Chrome supports this)
            if (performance.memory) {
                const memMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
                displayText += ` | RAM: ${memMB}MB`;
            }
            
            // Update text and styling
            this.fpsText.setText(displayText)
                       .setColor(color)
                       .setStyle({ backgroundColor: bgColor });
            
            // Reposition to ensure it stays in the top-right corner
            this.fpsText.setPosition(this.cameras.main.width - this.fpsText.width - 10, 10);
        }
    }

    connect() {
        var self = this;
        // Send team and game mode information when joining the room
        GameLogger.info(`Connecting to server`, { 
            mode: this.gameMode, 
            team: this.selectedTeam 
        });
        
        // Join different room types based on game mode to completely separate them
        const roomType = this.gameMode === 'ffa' ? 'ffa_mode' : 'team_mode';
        GameLogger.info(`Joining room type: ${roomType}`);
        
        this.room = client.join(roomType, {
            team: this.selectedTeam,
            gameMode: this.gameMode
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
                        console.log(`🎮 Creating player from initial state: ${id}`, data);
                        self.addPlayer({
                            id: id,
                            x: data.x,
                            y: data.y,
                            rotation: data.rotation || 0,
                            team: data.team || 'orange' // Include team data
                        });
                        let player_sprite = self.players[id].sprite;
                        player_sprite.target_x = state.players[id].x; // Update target, not actual position, so we can interpolate
                        player_sprite.target_y = state.players[id].y;
                        player_sprite.target_rotation = (state.players[id].rotation || 0);
                    }

                }
            });            this.room.state.players.onAdd = (player, sessionId) => {
                GameLogger.debug(`Player ${sessionId} added`, {
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
                    } else {
                        // THIS IS AN ENEMY PLAYER - CREATE HEALTH BAR!
                        sprite.setTint("0xff0000"); // Red tint for enemies
                        console.log(`🏥 CREATING HEALTH BAR for new enemy ${sessionId}`);
                        self.createEnemyHealthBar(sessionId, sprite);
                        console.log(`🎮 Enemy player ${sessionId} added with health bar via onAdd`);
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
                            } else if (change.field == "health") {
                                // Handle health changes for enemy players
                                if (self.players[sessionId] && self.players[sessionId].healthBar) {
                                    self.updateEnemyHealthBar(sessionId, change.value);
                                    console.log(`❤️ Player ${sessionId} health → ${change.value}`);
                                }
                            }
                        });
                    };
                }
            }

            this.room.state.bullets.onAdd = (bullet, sessionId) => {
                // Create bullet sprite with configured properties
                GameLogger.debug(`Creating bullet ${bullet.index}`);
                
                const bulletSprite = self.physics.add.sprite(bullet.x, bullet.y, 'bullet')
                    .setRotation(bullet.angle + self.BULLET_CONFIG.rotation);
                
                // Set size using displaySize first, then apply scale multiplier
                bulletSprite.setDisplaySize(self.BULLET_CONFIG.width, self.BULLET_CONFIG.height);
                if (self.BULLET_CONFIG.scale !== 1.0) {
                    bulletSprite.setScale(bulletSprite.scaleX * self.BULLET_CONFIG.scale, 
                                         bulletSprite.scaleY * self.BULLET_CONFIG.scale);
                }
                
                bulletSprite
                    .setTint(self.BULLET_CONFIG.tint)
                    .setAlpha(self.BULLET_CONFIG.alpha)
                    .setDepth(self.BULLET_CONFIG.depth);
                
                self.bullets[bullet.index] = bulletSprite;
                
                GameLogger.debug(`Created bullet ${bullet.index}`);

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
                GameLogger.debug(`Grenade state received`, { 
                    grenadeIndex: grenade.index,
                    start: `(${grenade.startX}, ${grenade.startY})`,
                    target: `(${grenade.targetX}, ${grenade.targetY})`
                });
                self.createGrenadeFromServer(grenade);
            }

            this.room.state.grenades.onRemove = function (grenade, sessionId) {
                GameLogger.debug(`Grenade ${grenade.index} exploded`);
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
                    // Current player died - show restart UI
                    console.log(`☠️  Current player removed from server - triggering death handler`);
                    self.handleDeath();
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
                    
                    // Log different messages for self-damage vs other damage
                    if (message.selfDamage) {
                        console.log(`💥 You damaged yourself with your own ${message.weaponType || 'weapon'} for ${damage} damage!`);
                    } else {
                        console.log(`💥 You took ${damage} damage from ${message.weaponType || 'weapon'}!`);
                    }
                    
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
            console.error("❌ Connection error: Couldn't join room");
        });

    }

    update() {
        // Mouse wheel scroll accumulator decay - reset if no scrolling for a while
        if (this.scrollAccumulator !== 0) {
            const timeSinceLastSwitch = this.time.now - this.lastWeaponSwitchTime;
            if (timeSinceLastSwitch > 500) { // Reset after 500ms of no switching
                this.scrollAccumulator = 0;
            }
        }
        
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
                
                // Also test enemy health bars
                for (let id in this.players) {
                    if (this.players[id].healthBar) {
                        const currentHealth = this.players[id].healthBar.currentHealth;
                        const newHealth = Math.max(0, currentHealth - 15);
                        this.updateEnemyHealthBar(id, newHealth);
                        console.log(`🧪 Testing enemy ${id} health: ${currentHealth} → ${newHealth}`);
                    }
                }
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
            
            // Update enemy health bar position to follow the player
            this.updateEnemyHealthBarPosition(id);
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
    GameLogger.info("Player death - showing restart UI");
    
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
    
    // Add a small delay before showing restart UI
    setTimeout(() => {
        this.showRestartUI();
    }, 1000); // 1 second delay to allow other players to see the death
}

showRestartUI() {
    GameLogger.debug("Showing restart UI");
    
    // Check if restart UI already exists
    
    // Remove existing overlay if it exists
    const existingOverlay = document.getElementById('restartOverlay');
    if (existingOverlay) {
        GameLogger.warn("Removing existing restart overlay");
        existingOverlay.remove();
    }
    
    // Create HTML overlay with the same styling as login/team selection
    const restartOverlay = document.createElement('div');
    restartOverlay.id = 'restartOverlay';
    restartOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Press Start 2P', monospace;
    `;
    
    // Create the restart form using your exact CSS specifications
    const restartForm = document.createElement('div');
    restartForm.style.cssText = `
        background-color: rgb(26, 26, 26);
        padding: 50px;
        border: 2px solid rgb(153, 187, 153);
        border-radius: 20px;
        width: 500px;
        height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 50px;
        font-family: "Press Start 2P", monospace;
    `;
    
    // Create death message
    const deathTitle = document.createElement('h2');
    deathTitle.textContent = 'GAME OVER';
    deathTitle.style.cssText = `
        color: #ff0000;
        font-size: 32px;
        text-align: center;
        margin: 0;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        animation: pulse 2s infinite;
    `;
    
    // Create subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'You have been eliminated';
    subtitle.style.cssText = `
        color: #cceedd;
        font-size: 16px;
        text-align: center;
        margin: 0;
    `;
    
    // Create restart button using enhanced styling for the larger container
    const restartButton = document.createElement('button');
    restartButton.textContent = 'RESTART GAME';
    restartButton.style.cssText = `
        padding: 18px 36px;
        background-color: rgb(153, 187, 153);
        color: #0f0f0f;
        border: none;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        text-transform: uppercase;
        border-radius: 20px;
        transition: background 0.2s ease;
        font-family: inherit;
        width: 70%;
        text-align: center;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;
    
    // Add hover effects matching login buttons
    restartButton.addEventListener('mouseenter', () => {
        restartButton.style.backgroundColor = '#cceedd';
    });
    restartButton.addEventListener('mouseleave', () => {
        restartButton.style.backgroundColor = '#99bb99';
    });
    
    // Add click handler with proper context binding
    const self = this; // Store reference to game instance
    restartButton.addEventListener('click', () => {
        GameLogger.info("Restart button clicked");
        self.restartGame();
    });
    
    console.log("✅ Restart button click handler added successfully");
    console.log("🔍 Button element:", restartButton);
    console.log("🔍 Game instance reference:", self);
    
    // Create keyboard instruction
    const instruction = document.createElement('p');
    instruction.textContent = 'Press R key to restart quickly';
    instruction.style.cssText = `
        color: #cceedd;
        font-size: 12px;
        text-align: center;
        margin: 0;
        opacity: 0.8;
    `;
    
    // Add CSS animation for pulse effect
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Assemble the form
    restartForm.appendChild(deathTitle);
    restartForm.appendChild(subtitle);
    restartForm.appendChild(restartButton);
    restartForm.appendChild(instruction);
    
    restartOverlay.appendChild(restartForm);
    document.body.appendChild(restartOverlay);
    
    // Add keyboard shortcut (R key to restart) with proper context binding
    const keyHandler = (event) => {
        if (event.key.toLowerCase() === 'r') {
            console.log("🔄 R key pressed for restart!");
            self.restartGame();
        }
    };
    document.addEventListener('keydown', keyHandler);
    
    // Store references for cleanup
    this.restartOverlay = restartOverlay;
    this.keyHandler = keyHandler;
    
    console.log("✅ Restart UI fully created and added to page");
    console.log("🔍 Final overlay element:", this.restartOverlay);
    console.log("🔍 Button should be clickable now");
}

restartGame() {
    console.log("🔄 Restarting game - going to team selection...");
    console.log("🔍 Current overlay element:", this.restartOverlay);
    console.log("🔍 Current room:", this.room);
    console.log("🔍 Current game instance:", this.game);
    
    // Clean up HTML overlay
    if (this.restartOverlay) {
        console.log("✅ Removing restart overlay");
        this.restartOverlay.remove();
        this.restartOverlay = null;
    } else {
        console.log("⚠️ No restart overlay to remove");
    }
    
    // Clean up keyboard listener
    if (this.keyHandler) {
        console.log("✅ Removing keyboard handler");
        document.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
    } else {
        console.log("⚠️ No keyboard handler to remove");
    }
    
    // Close current connection
    if (this.room) {
        console.log("✅ Closing room connection");
        this.room.removeAllListeners();
        this.room.leave();
    } else {
        console.log("⚠️ No room connection to close");
    }
    
    // Destroy the current Phaser game
    if (this.game) {
        console.log("✅ Destroying Phaser game instance");
        this.game.destroy(true);
    } else {
        console.log("⚠️ No Phaser game instance to destroy");
    }
    
    // Show the main overlay (login/team selection container)
    console.log("🔍 Looking for overlay element...");
    const overlay = document.getElementById('overlay');
    if (overlay) {
        console.log("✅ Found overlay, making it visible");
        overlay.style.display = 'flex';
    } else {
        console.log("❌ Could not find overlay element with ID 'overlay'");
    }
    
    // Hide login form and show game mode selection directly
    console.log("🔍 Looking for login and game mode forms...");
    const loginForm = document.getElementById('loginForm');
    const gameModeForm = document.getElementById('gameModeForm');
    const teamSelectionForm = document.getElementById('teamSelectionForm');
    
    if (loginForm) {
        console.log("✅ Found loginForm, hiding it");
        loginForm.style.display = 'none';
    } else {
        console.log("⚠️ Could not find loginForm element");
    }
    
    if (teamSelectionForm) {
        console.log("✅ Found teamSelectionForm, hiding it");
        teamSelectionForm.style.display = 'none';
    }
    
    if (gameModeForm) {
        console.log("✅ Found gameModeForm, showing it");
        gameModeForm.style.display = 'flex';
    } else {
        console.log("❌ Could not find gameModeForm element");
    }
    
    // Reset game config for fresh selection
    window.gameConfig = window.gameConfig || {};
    // Don't reset selectedTeam and gameMode so user can keep their previous choice if desired
    
    console.log("✅ Restart process completed - should be on game mode selection screen");
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
    // 👥 Enemy Health Bar System
    // =============================

    createEnemyHealthBar(playerId, playerSprite) {
        console.log(`🏥 CREATING HEALTH BAR for player ${playerId} at:`, playerSprite.x, playerSprite.y);
        
        // Create a simple, very visible health bar using graphics
        const healthBar = this.add.graphics();
        
        // Draw background (black rectangle)
        healthBar.fillStyle(0x000000);
        healthBar.fillRect(-30, -50, 60, 10);
        
        // Draw border (white outline)
        healthBar.lineStyle(2, 0xffffff);
        healthBar.strokeRect(-30, -50, 60, 10);
        
        // Draw health fill (green rectangle)
        healthBar.fillStyle(0x00ff00);
        healthBar.fillRect(-29, -49, 58, 8);
        
        // Position the health bar
        healthBar.x = playerSprite.x;
        healthBar.y = playerSprite.y;
        healthBar.setDepth(100);
        
        // Store health bar
        this.players[playerId].healthBar = {
            graphics: healthBar,
            maxHealth: 100,
            currentHealth: 100,
            width: 58 // Inner width for health fill
        };
        
        console.log(`✅ HEALTH BAR CREATED for player ${playerId}!`);
    }

    updateEnemyHealthBar(playerId, newHealth) {
        const player = this.players[playerId];
        if (!player || !player.healthBar) {
            console.log(`⚠️ No health bar found for player ${playerId}`);
            return;
        }
        
        const healthBar = player.healthBar;
        
        // Update current health
        const oldHealth = healthBar.currentHealth;
        healthBar.currentHealth = Math.max(0, newHealth);
        
        console.log(`❤️ Updating health for ${playerId}: ${oldHealth} → ${healthBar.currentHealth}`);
        
        // Calculate health percentage
        const healthPercentage = healthBar.currentHealth / healthBar.maxHealth;
        
        // Clear and redraw the health bar
        healthBar.graphics.clear();
        
        // Draw background (black rectangle)
        healthBar.graphics.fillStyle(0x000000);
        healthBar.graphics.fillRect(-30, -50, 60, 10);
        
        // Draw border (white outline)
        healthBar.graphics.lineStyle(2, 0xffffff);
        healthBar.graphics.strokeRect(-30, -50, 60, 10);
        
        // Determine health color
        let healthColor;
        if (healthPercentage > 0.6) {
            healthColor = 0x00ff00; // Green
        } else if (healthPercentage > 0.3) {
            healthColor = 0xffff00; // Yellow
        } else {
            healthColor = 0xff0000; // Red
        }
        
        // Draw health fill based on current health
        const fillWidth = healthBar.width * healthPercentage;
        if (fillWidth > 0) {
            healthBar.graphics.fillStyle(healthColor);
            healthBar.graphics.fillRect(-29, -49, fillWidth, 8);
        }
        
        console.log(`🎨 Health bar updated for ${playerId} - ${(healthPercentage * 100).toFixed(1)}% health`);
    }

    updateEnemyHealthBarPosition(playerId) {
        const player = this.players[playerId];
        if (!player || !player.healthBar || !player.sprite) return;
        
        const sprite = player.sprite;
        const healthBar = player.healthBar;
        
        // Update position to follow the player sprite
        healthBar.graphics.x = sprite.x;
        healthBar.graphics.y = sprite.y;
        
        // Ensure health bar is visible
        healthBar.graphics.setVisible(true);
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

    // =============================
    // 🔫 Bullet Configuration System
    // =============================

    updateBulletConfig(newConfig) {
        // Merge new config with existing config
        this.BULLET_CONFIG = { ...this.BULLET_CONFIG, ...newConfig };
        console.log(`🔫 Updated bullet config:`, this.BULLET_CONFIG);
        
        // Apply changes to existing bullets if any
        for (let index in this.bullets) {
            if (this.bullets[index] && this.bullets[index].setDisplaySize) {
                this.applyBulletConfig(this.bullets[index]);
            }
        }
    }

    applyBulletConfig(bulletSprite) {
        // Set size using displaySize first, then apply scale multiplier
        bulletSprite.setDisplaySize(this.BULLET_CONFIG.width, this.BULLET_CONFIG.height);
        if (this.BULLET_CONFIG.scale !== 1.0) {
            bulletSprite.setScale(bulletSprite.scaleX * this.BULLET_CONFIG.scale, 
                                 bulletSprite.scaleY * this.BULLET_CONFIG.scale);
        }
        
        bulletSprite
            .setTint(this.BULLET_CONFIG.tint)
            .setAlpha(this.BULLET_CONFIG.alpha)
            .setDepth(this.BULLET_CONFIG.depth);
    }

    // Bullet preset configurations for different bullet types
    setBulletPreset(presetName) {
        const presets = {
            'small': { width: 6, height: 12, scale: 1.0, tint: 0xffffff },
            'normal': { width: 8, height: 16, scale: 1.0, tint: 0xffffff },
            'large': { width: 12, height: 20, scale: 1.0, tint: 0xffffff }
        };
        
        if (presets[presetName]) {
            this.updateBulletConfig(presets[presetName]);
            console.log(`🎯 Applied bullet preset: ${presetName}`);
        } else {
            console.warn(`❌ Unknown bullet preset: ${presetName}. Available: ${Object.keys(presets).join(', ')}`);
        }
    }

    addPlayer(data) {
        let id = data.id;
        let playerTeam = data.team || 'orange';
        
        console.log(`🎮 ADDING PLAYER: ${id}, team: ${playerTeam}, isMe: ${id == this.room.sessionId}`);
        
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
            console.log(`👤 THIS IS ME - Setting up my player`);
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
            console.log(`👥 THIS IS ENEMY - Setting up enemy player`);
            this.players[id] = {};
            this.players[id].sprite = sprite;
            this.players[id].sprite.setTint("0xff0000");
            this.players[id].sprite.setRotation(data.rotation);
            
            // Create health bar for enemy player
            console.log(`🏥 ABOUT TO CREATE HEALTH BAR for enemy ${id}`);
            this.createEnemyHealthBar(id, sprite);
            console.log(`🎮 Enemy player ${id} added with health bar`);
        }
    }

    removePlayer(id) {
        console.log(`🗑️  Attempting to remove player: ${id}`);
        console.log(`🗑️  Player exists:`, !!this.players[id]);
        console.log(`🗑️  Sprite exists:`, !!(this.players[id] && this.players[id].sprite));
        
        if (this.players[id] && this.players[id].sprite) {
            this.players[id].sprite.destroy();
            
            // Clean up enemy health bar
            if (this.players[id].healthBar && this.players[id].healthBar.graphics) {
                this.players[id].healthBar.graphics.destroy();
            }
            
            delete this.players[id];
            console.log(`✅ Successfully removed player: ${id}`);
        } else {
            console.log(`⚠️  Player ${id} was already removed or doesn't exist`);
        }
    }

    rotatePlayer(pointer = this.input.activePointer) {
        if (!this.player || !this.player.sprite) return;
        
        let player = this.player.sprite;
        // Calculate world coordinates considering camera position
        let worldX = pointer.x + this.cameras.main.scrollX;
        let worldY = pointer.y + this.cameras.main.scrollY;
        
        // Calculate angle from player to cursor
        let angle = Phaser.Math.Angle.Between(player.x, player.y, worldX, worldY);
        
        // Fix for Chrome cursor reversal issue - use negative PI/2 offset
        player.setRotation(angle - Math.PI / 2);
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
            
            // Add visual feedback for weapon switching - brief scale animation
            if (this.player.sprite.scene) {
                this.player.sprite.setScale(1.1);
                this.tweens.add({
                    targets: this.player.sprite,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 100,
                    ease: 'Back.easeOut'
                });
            }
            
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
        
        // Calculate bullet velocity with corrected angle
        let speed_x = Math.cos(bulletAngle - Math.PI / 2) * (weapon.bulletSpeed / 16);
        let speed_y = Math.sin(bulletAngle - Math.PI / 2) * (weapon.bulletSpeed / 16);
        
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


