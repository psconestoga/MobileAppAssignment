class Character{
    constructor(name, maxHP, strength, defense, speed, agility, accuracy, team, actionSelector){
        this.name = name;
        this.maxHP = maxHP;
        this.currentHP = maxHP;
        this.strength = strength;
        this.defense = defense;
        this.speed = speed;
        this.agility = agility;
        this.accuracy = accuracy;
        this.isPlayer = false;
        this.actionSelector = actionSelector;
        this.state = CharacterState.ACTIVE;
        this.team = team;
        this.isDefending = false;
        this.position = 0;
    }

    ModHP(amount) {
        this.currentHP += amount;
        if (this.currentHP  <= 0)
        {
            this.currentHP = 0;
            this.state = CharacterState.DOWNED;
        }
    }
};

const CharacterState = {
    ACTIVE: Symbol("active"),
    DOWNED: Symbol("downed")
}

const ActionRange = {
    // One enemy
    SINGLE: Symbol("single"),

    // All enemies
    ALL: Symbol("all"),

    // User
    SELF: Symbol("self"),

    // Ally
    ALLY: Symbol("ally"),

    // All allies
    TEAM: Symbol("team")
}

const ActionType = {
     ATTACK: Symbol("attack"),
     HEAL: Symbol("heal"),
     UNIQUE: Symbol("unique"),
}

class Skill{
    /**
    * @param {String} name 
    * @param {Number} power Power modifier
    * @param {Number} accuracy
    * @param {ActionRange} range
    * @param {ActionType} actionType
        
    }}
    */
    constructor(name, power, accuracy, range, actionType, uniqueEffect = null, logMessage = null)
    {
        this.name = name;
        this.power = power;
        this.accuracy = accuracy;
        this.range = range;
        this.actionType = actionType;
        this.uniqueEffect = uniqueEffect;
        this.logMessage = logMessage;
    }

    ApplyEffect(user, targets, log)
    {
        switch(this.actionType)
        {
            case ActionType.ATTACK:
                this.ApplyDamage(user, targets, log);
                break;
            case ActionType.HEAL:
                this.ApplyHeal(user, targets, log)
        }
        
    }

    ApplyDamage(user, targets, log)
    {
        if (this.logMessage != null){
            this.logMessage(user, targets, log);
        }
        else {
            log.write(user.name + " attacks " + targets[0].name);
        }

        for(var i = 0; i < targets.length; ++i)
        {
            var target = targets[i];

            var dodgeChance = RandomRange(0, target.agility);
            var hit = RandomRange(0, user.accuracy * this.accuracy) >= dodgeChance;
            if (hit)
            {
                var damage = user.strength * this.power * (target.isDefending ? 0.5 : 1.0);
                damage = Math.ceil(damage);
                target.ModHP(-damage);
                log.write(target.name + " was hit for " + damage + " damage!");
                if (target.state == CharacterState.DOWNED)
                {
                    log.write(target.name + " is incapacitated!");
                }
            }
            else
            {
                log.write("But " + target.name + " evades the attack.");
            }          
        }
    }

    ApplyHeal(user, targets, log)
    {
        for(var i = 0; i < targets.length; ++i)
        {
            var target = targets[i];
            var healAmount = Math.ceil(20 * this.power);
            target.ModHP(healAmount);
            log.write(target.name + " is healed by " + healAmount + "!");
            if (target.player)
            {
                log.write(target.name + "is at " + target.currentHP + " HP.");
            }
        }
    }

    ApplyUniqueEffect(user, targets, log){
        if (this.uniqueEffect != null){
            this.uniqueEffect(user, targets, log);
        }
    }
}

const SkillList = {
    Attack: new Skill("Attack", 1.0, 100, ActionRange.SINGLE, ActionType.ATTACK),
    Sweep: new Skill("Sweep", 0.5, 80, ActionRange.ALL, ActionType.ATTACK, null, 
        (user, targets, log) => {log.write(user.name + " slashes at all foes!")}),
    Defend: new Skill("Defend", 0, 0, ActionRange.SELF, ActionType.UNIQUE, (user, targets, log) => {
        user.isDefending = true;
        log.write(user.name + " is defending.");
    }),
    Backstab: new Skill("Backstab", 1.5, 60, ActionRange.SINGLE, ActionType.ATTACK, null,
        (user, targets, log) => {log.write(user.name + " launches a sneak attack on " + targets[0].name)}),
}

class ActionSelector{
    constructor(actions, chooseActionFunction = null){
        this.actions = actions;
        this.chooseAction = chooseActionFunction;
    }

    get(actionName){
        return this.actions.find(a => a.name.toLowerCase() == actionName.toLowerCase());
    }
}

function RandomRange(min, max){
    max = Math.max(max, min);
    var diff = max - min;
    return Math.floor(Math.random() * diff + min);
}

class ActionLog
{
    constructor()
    {
        this.output = [];
    }

    write(content)
    {
        this.output.push(content);
    }

    clear()
    {
        this.output = [];
    }
}


const PlayerList = {
    knight: function(){ return new Character("Knight", 100, 20, 20, 10, 10, 80, "Player", 
        new ActionSelector([SkillList.Attack, SkillList.Sweep, SkillList.Defend])) },
    rogue: function(){ return new Character("Rogue", 80, 15, 10, 20, 20, 90, "Player", 
        new ActionSelector([SkillList.Attack, SkillList.Backstab, SkillList.Defend])) },
};

const EnemyList = {
    goblin: function(){ return new Character("Goblin", 60, 10, 5, 10, 20, 80, "Enemy",
    new ActionSelector([SkillList.Attack], (user, enemies, allies, log) => {
        var enemy = enemies[RandomRange(0, enemies.length)];
        SkillList.Attack.ApplyEffect(user, [enemy], log);
    })) }
}

module.exports = {Character, PlayerList, EnemyList, CharacterState, ActionRange, ActionType, ActionSelector, Skill, SkillList, ActionLog};