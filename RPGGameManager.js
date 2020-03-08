const RPG = require("./RPG");

const GameState = Object.freeze({
    STARTUP:   Symbol("startup"),
    LOBBY:   Symbol("lobby"),
    BATTLE:  Symbol("battle")
});

class GameSettings{
    constructor(){
        this.players = new Array();
        this.difficulty = 1;
    }

    isValid(){
        return (this.players.length > 0);
    }

    addPlayer(player){
        this.players.push(player);
        player.isPlayer = true;
    }
}


module.exports = class Game{
    constructor(){
        this.gameState = GameState.STARTUP;
        this.settings = new GameSettings();
        this.log = new RPG.ActionLog();
        this.players = new Array();
        this.enemies = new Array();
        this.characters = new Array();
        this.currentCharacter = null;
        this.currentIndex = 0;
    }

    StartGame(){
        this.players = new Array();
        this.enemies = new Array();

        for(var i = 0; i < this.settings.players.length; ++i){
            this.players.push(this.settings.players[i]);
            this.players[i].name += (i + 1);
            this.players[i].position = i + 1;
        }

        for(var i = 0; i < this.players.length; ++i){
            this.enemies.push(RPG.EnemyList['goblin']());
            this.enemies[i].position = i + 1;
            this.enemies[i].name += (i + 1);
        }

        this.characters = this.players.concat(this.enemies);
        this.characters.sort((a, b) => {return b.speed - a.speed});

        this.currentCharacter = this.characters[this.currentIndex];

        var output = "A battle begins.\nPlayers:\n";
        for(var i = 0; i < this.players.length; ++i){
            output += (i + 1) + " - " + this.players[i].name + "\n";
        }

        output += "\nEnemies:\n";
        for(var i = 0; i < this.enemies.length; ++i){
            output += (i + 1) + " - " + this.enemies[i].name + "\n";
        }
        this.log.write(output);

        this.log.write("Type 'help' for more commands");

        this.gameState = GameState.BATTLE;

        console.log(this.characters);

        this.HandleGame();
    }

    HandleGame(){
        while(this.gameState == GameState.BATTLE){
            this.currentCharacter.isDefending = false;

            this.log.write(this.currentCharacter.name + "'s turn");

            if (this.currentCharacter.isPlayer){
                var output = "Actions available:\n";
                for (var i = 0; i < this.currentCharacter.actionSelector.actions.length; ++i){
                    output += this.currentCharacter.actionSelector.actions[i].name + "\n";
                }
                this.log.write(output);
                break;
            }
            else{
                this.currentCharacter.actionSelector.chooseAction(this.currentCharacter,
                    this.players, this.enemies, this.log);
                    this.EndCurrentTurn();
            }
        }
    }
    
    HandleInput(input) {
        this.log.clear();

        input = String(input);

        var params = input.trim().toLowerCase().split(' ');
        if (params.length < 2){
            params[1] = "-";
        }

        switch(this.gameState){
            case GameState.STARTUP:
                this.log.write(`Welcome!
                Please select a character by typing 'add' + the character.
                ex. 'add knight'
                Type 'clear' to reset the player list.

                Type 'start' to begin.
                `);
                this.gameState = GameState.LOBBY;
                this.settings = new GameSettings();
                break;
            case GameState.LOBBY:
                this.HandleLobbyInput(params[0], params[1]);
                break;
            case GameState.BATTLE:
                this.HandleBattleInput(params[0], params[1]);

                this.HandleGame();
                break;
            default:
                console.log('Invalid GameState');
                break;
        }

        return this.log.output;
    }

    HandleLobbyInput(param, value){
        switch(param){
            case "add":
                if (this.settings.players.length >= 4){
                    this.log.write("Can't add any more players.");
                }
                else if (RPG.PlayerList[value] != undefined){
                    var player = RPG.PlayerList[value]();
                    this.settings.addPlayer(player);
                    this.log.write("Adding " + player.name);
                }
                else{
                    var output = "Invalid character\nValid characters are:\n";
                    for (var key in RPG.PlayerList){
                        output += key.toString() + '\n';
                    }
                    this.log.write(output);
                }
                break;
            case "start":
                if (this.settings.isValid()){
                    this.log.write("Starting game...");
                    this.StartGame();
                }
                else{
                    this.log.write("Please select a character first.");
                }
                break;
            case "clear":
                this.settings.players = new Array();
                this.log.write("Cleared player list.");
                this.log.write("Please select a character.");
                break;
            default:
                this.log.write(
                `Select a character by typing 'add' + the character.
                ex. 'add knight'
                Type 'clear' to reset the player list.

                Type 'start' to begin.`);
                break;
        }
    }

    HandleBattleInput(param, value){
        var action = this.currentCharacter.actionSelector.get(param);
        if (action != undefined){
            switch(action.range){
                case RPG.ActionRange.SINGLE:
                    var target = this.SelectTarget(value, this.enemies);
                    if (target != null){
                        action.ApplyEffect(this.currentCharacter, [target], this.log);
                        this.EndCurrentTurn();
                    }
                    else{
                        var output = "Invalid target.\nCurrent Enemies:\n";
                        for(var i = 0; i < this.enemies.length; ++i){
                            output += this.enemies[i].name + "\n";
                        }
                        this.log.write(output);
                    }
                    break;
                case RPG.ActionRange.ALL:
                    var targets = new Array();
                    action.ApplyEffect(this.currentCharacter, this.enemies, this.log);
                    this.EndCurrentTurn();
                    break;
                case RPG.ActionRange.SELF:
                    action.ApplyEffect(this.currentCharacter, this.currentCharacter, this.log);
                    this.EndCurrentTurn();
                    break;
                case RPG.ActionRange.ALLY:
                    var target = this.SelectTarget(value, this.players);
                    if (target != null){
                        action.ApplyEffect(this.currentCharacter, [target], this.log);
                        this.EndCurrentTurn();
                    }
                    else{
                        var output = "Invalid target.\nCurrent Allies:\n";
                        for(var i = 0; i < this.players.length; ++i){
                            output += this.players[i].name + "\n";
                        }
                        this.log.write(output);
                    }         
                    break;
                case RPG.ActionRange.TEAM:
                    var targets = new Array();
                    action.ApplyEffect(this.currentCharacter, this.players, this.log);
                    this.EndCurrentTurn();
                    break;
                default:
                    this.log.write("Unknown attack range");
                    break;
            }
        }
        else{
            switch(param){
                case "help":
                    this.LogHelpText();
                    break;
                case "stats":
                    for(var i = 0; i < this.players.length; ++i){
                        var output = `${this.players[i].name}
                        HP: ${this.players[i].currentHP} / ${this.players[i].maxHP}                        
                        `;
                        this.log.write(output);
                    }
                    break;
                case "enemy":
                case "enemies":
                    var output = "Current Enemies:\n";
                    for(var i = 0; i < this.enemies.length; ++i){
                        output += this.enemies[i].name + "\n";
                    }
                    this.log.write(output);
                break;
                case "team":
                    var output = "Current Allies:\n";
                    for(var i = 0; i < this.players.length; ++i){
                        output += this.players[i].name + "\n";
                    }
                    this.log.write(output);
                    break;
                default:
                    this.log.write("Invalid action");
                    break;
            }
        }
    }

    SelectTarget(value, targetList){
        var target = targetList.find(e => e.name.toLowerCase() == value || e.position == value);
        if (target != undefined){
            return target;
        }
        else{
            return null;        
        }
    }

    EndCurrentTurn(){

        if (this.players.find(p => p.state != RPG.CharacterState.DOWNED) == undefined){
            this.log.write("You were defeated.");
            this.log.write("Type anything to start again.");
            this.gameState = GameState.STARTUP;

            return;
        }
        if (this.enemies.find(e => e.state != RPG.CharacterState.DOWNED) == undefined){
            this.log.write("You win!");
            this.log.write("Type anything to start again.");
            this.gameState = GameState.STARTUP;

            return;
        }

        for(var i = 0; i < this.players.length; ++i){
            if (this.players[i].state == RPG.CharacterState.DOWNED){
                this.players.splice(i, 1);
                --i;
            }
        }

        for(var i = 0; i < this.enemies.length; ++i){
            if (this.enemies[i].state == RPG.CharacterState.DOWNED){
                this.enemies.splice(i, 1);
                --i;
            }
        }

        do{
            this.currentIndex = (++this.currentIndex) % this.characters.length;
            this.currentCharacter = this.characters[this.currentIndex];
        } while(this.currentCharacter.state == RPG.CharacterState.DOWNED);
    }

    LogHelpText(){
        if (this.gameState == GameState.BATTLE){
            var output = `Defeat all enemies to win.
            Type an action + the target's name or position to attack
            ex. 'attack goblin1' or 'attack 1'

            Not all actions require a target
            ex. 'defend' (doubles defense for 1 turn)

            Addition commands:
            'stats' - list ally stats
            'team' - list current allies
            'enemies' - list current enemies
            `;

            this.log.write(output);
        }
    }
}