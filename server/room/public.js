const colyseus = require('colyseus')
const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const MapSchema = schema.MapSchema;
//const ArraySchema = schema.ArraySchema;
const type = schema.type;

class Player extends Schema {}
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "rotation");
type("string")(Player.prototype, "team"); // Add team information
type("string")(Player.prototype, "currentSprite"); // Add current sprite/weapon state
type("number")(Player.prototype, "health"); // Add health tracking

class Bullet extends Schema {}
type("number")(Bullet.prototype, "x");
type("number")(Bullet.prototype, "y");
type("number")(Bullet.prototype, "angle");
type("number")(Bullet.prototype, "speed_x");
type("number")(Bullet.prototype, "speed_y");
type("number")(Bullet.prototype, "index");

class Grenade extends Schema {}
type("number")(Grenade.prototype, "startX");
type("number")(Grenade.prototype, "startY");
type("number")(Grenade.prototype, "targetX");
type("number")(Grenade.prototype, "targetY");
type("number")(Grenade.prototype, "index");
type("number")(Grenade.prototype, "startTime");



class State extends Schema {
    constructor() {
        super();

        this.players = new MapSchema();
        this.bullets = new MapSchema();
        this.grenades = new MapSchema();
        this.nextPosition = 0;
        this.bullet_index = 0;
        this.grenade_index = 0;
    }

    getNextPosition() {
        let position = (this.nextPosition % 4) + 1;
        ++this.nextPosition;
        return position;
    }

    createBullet(id, data) {
        let bullet = new Bullet();
        bullet.index = this.bullet_index;
        bullet.x = data.x;
        bullet.y = data.y;
        bullet.angle = data.angle;
        bullet.speed_x = data.speed_x;
        bullet.speed_y = data.speed_y;
        bullet.distanceTravelled = 0;
        bullet.owner_id = id;
        this.bullets[this.bullet_index++] = bullet;
    }

    createGrenade(id, data) {
        let grenade = new Grenade();
        grenade.index = this.grenade_index;
        grenade.startX = data.startX;
        grenade.startY = data.startY;
        grenade.targetX = data.targetX;
        grenade.targetY = data.targetY;
        grenade.startTime = Date.now();
        grenade.owner_id = id;
        this.grenades[this.grenade_index++] = grenade;
        return grenade;
    }

    moveBullet(index) {
        let old_x = this.bullets[index].x;
        let old_y = this.bullets[index].y;

        this.bullets[index].x -= this.bullets[index].speed_x;
        this.bullets[index].y -= this.bullets[index].speed_y;

        let dx = this.bullets[index].x - old_x;
        let dy = this.bullets[index].y - old_y;

        this.bullets[index].distanceTravelled += Math.sqrt(dx * dx + dy * dy);
    }

    removeBullet(index) {
        delete this.bullets[index];
    }

    removeGrenade(index) {
        delete this.grenades[index];
    }



    createPlayer(id, team = 'orange', position = null) {
        this.players[id] = new Player();
        this.players[id].team = team;
        this.players[id].currentSprite = team === 'blue' ? 'blue_empty_hands' : 'empty_hands';
        this.players[id].health = 100; // Initialize with full health
        
        // Set initial position if provided
        if (position) {
            this.players[id].x = position.x || 400;
            this.players[id].y = position.y || 300;
        } else {
            // Default position
            this.players[id].x = 400;
            this.players[id].y = 300;
        }
    }

    getPlayer(id) {
        return this.players[id];
    }

    newPlayer(id) {
        return this.players[id];
    }

    removePlayer(id) {
        delete this.players[id];
    }

    setPlayerPosition(id, position) {
        this.players[id].x = position.x;
        this.players[id].y = position.y;
    }

    movePlayer(id, movement) {
        let player = this.players[id];
        player.x = movement.x;
        player.y = movement.y;
        player.rotation = movement.rotation
    }

}
type({
    map: Player
})(State.prototype, "players");
type({
    map: Bullet
})(State.prototype, "bullets");
type({
    map: Grenade
})(State.prototype, "grenades");

exports.outdoor = class extends colyseus.Room {

    onInit() {
        this.setState(new State());
        this.clock.setInterval(this.ServerGameLoop.bind(this), 16);
    }

    onJoin(client, options) {
        console.log(`🎮 Server: Client ${client.sessionId} joining with options:`, options);
        
        let nextPosition = this.state.getNextPosition();
        let playerTeam = options.team || 'orange'; // Get team from client options
        
        console.log(`🎯 Server: Creating player with team: ${playerTeam}`);
        
        // Calculate spawn position based on player number
        let spawnX = 200 + (nextPosition * 100); // Spread players out
        let spawnY = 200 + (nextPosition * 50);
        
        this.state.createPlayer(client.sessionId, playerTeam, {x: spawnX, y: spawnY});
        
        // Send spawn position only (state system handles player creation)
        this.send(client, {
            event: "start_position",
            position: nextPosition
        });

        console.log(`🎮 Server: Player ${client.sessionId} joined as ${playerTeam} team at (${spawnX}, ${spawnY})`);

        // Remove conflicting new_player broadcast - state system handles this
        // this.broadcast({
        //     event: "new_player",
        //     position: nextPosition,
        //     id: client.sessionId,
        //     team: playerTeam
        // }, {
        //     except: client
        // });

    }

    onMessage(client, message) {
        switch (message.action) {

            case "initial_position":
                if (this.state.getPlayer(client.sessionId) == undefined) return; // Happens if the server restarts and a client is still connected
                this.state.setPlayerPosition(client.sessionId, message.data);
                break;

            case "move":
                if (this.state.getPlayer(client.sessionId) == undefined) return;
                this.state.movePlayer(client.sessionId, message.data);
                break;

            case "sprite_change":
                if (this.state.getPlayer(client.sessionId) == undefined) return;
                this.state.players[client.sessionId].currentSprite = message.data.sprite;
                // State system automatically syncs this change to all clients
                console.log(`🎨 Server: Player ${client.sessionId} changed sprite to ${message.data.sprite}`);
                break;

            case "shoot_bullet":
                if (this.state.getPlayer(client.sessionId) == undefined) return;
                if (Math.abs(message.data.speed_x) <= 100 && Math.abs(message.data.speed_y) <= 100) {
                    this.state.createBullet(client.sessionId, message.data);
                }
                break;

            case "throw_grenade":
                if (this.state.getPlayer(client.sessionId) == undefined) return;
                // Create grenade in state for all clients to see
                let grenade = this.state.createGrenade(client.sessionId, message.data);
                
                // Schedule explosion after flight time
                const flightTime = this.calculateGrenadeFlightTime(message.data.startX, message.data.startY, message.data.targetX, message.data.targetY);
                setTimeout(() => {
                    this.handleGrenadeExplosion(client.sessionId, message.data);
                    this.state.removeGrenade(grenade.index);
                }, flightTime);
                break;

            case "player_died":
                if (this.state.getPlayer(client.sessionId) == undefined) return;
                console.log(`☠️  Server: Player ${client.sessionId} died, removing from game state`);
                this.state.removePlayer(client.sessionId);
                break;

            default:
                break;
        }
    }
    onLeave(client, consented) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {}

    // Calculate grenade flight time based on distance
    calculateGrenadeFlightTime(startX, startY, targetX, targetY) {
        const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
        return Math.min(1000 + (distance / 2), 2000); // 1-2 seconds flight time
    }

    // Handle grenade explosions with area-of-effect damage
    handleGrenadeExplosion(shooterId, grenadeData) {
        const explosionRadius = 120; // 120 pixels explosion radius (about 3-4 player widths)
        const maxDamage = grenadeData.damage || 80; // Maximum damage at center
        const minDamage = 15; // Minimum damage at edge of explosion
        
        console.log(`💥 Server: Grenade explosion at (${grenadeData.targetX}, ${grenadeData.targetY}) by ${shooterId}`);
        
        // Check damage to all players in explosion radius (including the thrower)
        for (let playerId in this.state.players) {
            let player = this.state.players[playerId];
            let distance = Math.sqrt(
                Math.pow(player.x - grenadeData.targetX, 2) + 
                Math.pow(player.y - grenadeData.targetY, 2)
            );
            
            // If player is within explosion radius
            if (distance <= explosionRadius) {
                // Calculate damage based on distance (closer = more damage)
                let damagePercent = Math.max(0, (explosionRadius - distance) / explosionRadius);
                let actualDamage = Math.round(minDamage + (maxDamage - minDamage) * damagePercent);
                
                // Apply damage to player health
                player.health -= actualDamage;
                
                // Log different messages for self-damage vs other players
                if (playerId === shooterId) {
                    console.log(`💥 Player ${playerId} hit by their own grenade: distance=${Math.round(distance)}, damage=${actualDamage}, health=${player.health}`);
                } else {
                    console.log(`💥 Player ${playerId} hit by grenade from ${shooterId}: distance=${Math.round(distance)}, damage=${actualDamage}, health=${player.health}`);
                }
                
                // Send hit message for each affected player
                this.broadcast({
                    event: "hit",
                    punished_id: playerId,
                    punisher_id: shooterId,
                    damage: actualDamage,
                    weaponType: "grenade",
                    selfDamage: playerId === shooterId // Flag to indicate self-damage
                });
                
                // Remove player if health reaches 0 or below
                if (player.health <= 0) {
                    console.log(`☠️  Server: Player ${playerId} killed by grenade, removing from game state`);
                    this.state.removePlayer(playerId);
                }
            }
        }
    }

    // Update the bullets 60 times per frame and send updates 
    ServerGameLoop() {
                            
        for (let i in this.state.bullets) {
            this.state.moveBullet(i);
            //remove the bullet if it goes too far
            if (this.state.bullets[i].x < -10 || this.state.bullets[i].x > 3200 || this.state.bullets[i].y < -10 || this.state.bullets[i].y > 3200 || this.state.bullets[i].distanceTravelled >= 800) {
                this.state.removeBullet(i);
            } else {
                //check if this bullet is close enough to hit a player
                for (let id in this.state.players) {
                    if (this.state.bullets[i].owner_id != id) {
                        //because your own bullet shouldn't hit you
                        
                        // Optional: Add friendly fire prevention
                        let shooterTeam = this.state.players[this.state.bullets[i].owner_id]?.team;
                        let targetTeam = this.state.players[id]?.team;
                        
                        // Uncomment the next 3 lines to enable friendly fire prevention
                        // if (shooterTeam && targetTeam && shooterTeam === targetTeam) {
                        //     continue; // Skip friendly fire
                        // }
                        
                        let dx = this.state.players[id].x - this.state.bullets[i].x;
                        let dy = this.state.players[id].y - this.state.bullets[i].y;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 30) {
                            // Apply bullet damage to player health
                            const bulletDamage = 25; // Standard bullet damage
                            this.state.players[id].health -= bulletDamage;
                            
                            this.broadcast( {
                                event: "hit",
                                punished_id: id,
                                punisher_id: this.state.bullets[i].owner_id,
                                damage: bulletDamage,
                                weaponType: "bullet"
                            });
                            this.state.removeBullet(i);
                            
                            // Remove player if health reaches 0 or below
                            if (this.state.players[id].health <= 0) {
                                console.log(`☠️  Server: Player ${id} killed by bullets, removing from game state`);
                                this.state.removePlayer(id);
                            }
                            return;
                        }
                    }
                }
            }
        }
    }
}