var plan = ["############################",
    "#      #    #      o      ##",
    "#                          #",
    "#          #####           #",
    "##         #   #    ##     #",
    "###           ##     #     #",
    "#           ###      #     #",
    "#   ####                   #",
    "#   ##       o             #",
    "# o  #         o       ### #",
    "#    #                     #",
    "############################"
];

/*Координаты
    Object Vector
    methods:
        plus
*/
function Vector(x, y) {
    this.x = x;
    this.y = y;
}
Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
};


/*Сетка
    Object Grid(width, height)
    methods:
        isInside(vector)
        get(vector)
        set(vector, value)
        forEach(f, context)
*/
function Grid(width, height) {
    this.space = new Array(width * height);
    this.width = width;
    this.height = height;
}
Grid.prototype.isInside = function(vector) {
    return vector.x >= 0 && vector.x < this.width &&
        vector.y >= 0 && vector.y < this.height;
};
Grid.prototype.get = function(vector) {
    return this.space[vector.x + this.width * vector.y];
};
Grid.prototype.set = function(vector, value) {
    this.space[vector.x + this.width * vector.y] = value;
};


/* 
Oбъект будет использоваться для преобразования из
названий направлений в смещения по координатам
*/
var directions = {
    "n": new Vector(0, -1),
    "ne": new Vector(1, -1),
    "e": new Vector(1, 0),
    "se": new Vector(1, 1),
    "s": new Vector(0, 1),
    "sw": new Vector(-1, 1),
    "w": new Vector(-1, 0),
    "nw": new Vector(-1, -1)
};

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");


/*Простое существо, перемещащееся в случайном направлении.
Если натолкнется на стену - отскочит от нее и будет двигаться дальше
    Object BouncingCritter()
    methods:
        act(view)
*/
function BouncingCritter() {
    this.direction = randomElement(directionNames);
};

BouncingCritter.prototype.act = function(view) {
    if (view.look(this.direction) != " ")
        this.direction = view.find(" ") || "s";
    return {
        type: "move",
        direction: this.direction
    };
};


/*
 В elementFromChar мы сначала создаём экземпляр
нужного типа, находя конструктор символа и применяя к
нему new. 
Потом добавляем свойство originChar, чтобы
было просто выяснить, из какого символа элемент был
создан изначально.
*/
function elementFromChar(legend, ch) {
    if (ch == " ")
        return null;
    var element = new legend[ch]();
    element.originChar = ch;
    return element;
}


/*
Объект Мир
Object World(map, legend)
    methods:
        toString()
        turn()
        //внутренняя реализация (private)
        letAct(critter, vector)
        checkDestination(action, vector)
*/
function World(map, legend) {
    var grid = new Grid(map[0].length, map.length);
    this.grid = grid;
    this.legend = legend;

    map.forEach(function(line, y) {
        for (var x = 0; x < line.length; x++)
            grid.set(new Vector(x, y),
                elementFromChar(legend, line[x]));
    });
}

function charFromElement(element) {
    if (element == null)
        return " ";
    else
    //какого символа элемент был создан изначально?
        return element.originChar;
}


/*
Метод строит
карту в виде строки из текущего состояния мира, проходя
двумерным циклом по клеткам сетки
*/
var lastStateOfSpace = [];
World.prototype.toString = function() {
    lastStateOfSpace = this.grid.space;
    var output = "";
    for (var y = 0; y < this.grid.height; y++) {
        for (var x = 0; x < this.grid.width; x++) {
            var element = this.grid.get(new Vector(x, y));
            output += charFromElement(element);
        }
        output += "\n";
    }
    return output;
};


/*
Стена
Object Wall()
*/
function Wall() {}

var world = new World(plan, {
    "#": Wall,
    "o": BouncingCritter
});


//   #      #    #      o      ##
//   #                          #
//   #          #####           #
//   ##         #   #    ##     #
//   ###           ##     #     #
//   #           ###      #     #
//   #   ####                   #
//   #   ##       o             #
//   # o  #         o       ### #
//   #    #                     #
//   ############################

/*
Метод forEach для
нашего типа Grid, вызывающий заданную функцию для
каждого элемента сетки, который не равен null или
undefined:
*/
Grid.prototype.forEach = function(f, context) {
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            var value = this.space[x + y * this.width];
            if (value != null)
                f.call(context, value, new Vector(x, y));
        }
    }
};


/*
Он будет обходить сетку методом forEach, и
искать объекты, у которых есть метод act. Найдя объект,
turn вызывает этот метод, получая объект action и
производит это действие, если оно допустимо. Пока мы
понимаем только действие “move”.
Так же нам надо хранить массив существ,
которые уже сделали свой шаг, и игнорировать их при
повторном проходе.
*/

World.prototype.turn = function() {
    var acted = [];
    this.grid.forEach(function(critter, vector) {
        if (critter.act && acted.indexOf(critter) == -1) {
            acted.push(critter);
            this.letAct(critter, vector);
        }
    }, this);
    return acted;
};


/*
Метод letAct содержит логику, которая
позволяет существам двигаться.
*/
World.prototype.letAct = function(critter, vector) {
    var action = critter.act(new View(this, vector));
    if (action && action.type == "move") {
        var dest = this.checkDestination(action, vector);
        if (dest && this.grid.get(dest) == null) {
            this.grid.set(vector, null);
            this.grid.set(dest, critter);
        }
    }
};

World.prototype.checkDestination = function(action, vector) {
    if (directions.hasOwnProperty(action.direction)) {
        var dest = vector.plus(directions[action.direction]);
        if (this.grid.isInside(dest))
            return dest;
    }
};


/*Окружение
Object View(world, vector)
    methods:
        look()
        findAll(ch)
        find(ch)
*/
function View(world, vector) {
    this.world = world;
    this.vector = vector;
}
View.prototype.look = function(dir) {
    var target = this.vector.plus(directions[dir]);
    if (this.world.grid.isInside(target))
        return charFromElement(this.world.grid.get(target));
    else
        return "#";
};

/*
Возвращает массив со всеми возможными
направлениями, где найден такой предмет.
*/
View.prototype.findAll = function(ch) {
    var found = [];
    for (var dir in directions)
        if (this.look(dir) == ch)
            found.push(dir);
    return found;
};

/*
Возвращает направление, в
котором этот предмет можно найти рядом с существом,
или же null, если такого предмета рядом нет.
*/
View.prototype.find = function(ch) {
    var found = this.findAll(ch);
    if (found.length == 0) return null;
    return randomElement(found);
};


/*
Метод для WallFollower
Так как направления заданы набором
строк, нам надо задать свою операцию dirPlus для
подсчёта относительных направлений. 
dirPlus("n", 1) означает поворот по часовой на 45 градусов на север, что
приводит к “ne”. 
dirPlus("s", -2) означает поворот против
часовой с юга, то есть на восток
*/
function dirPlus(dir, n) {
    var index = directionNames.indexOf(dir);
    return directionNames[(index + n + 8) % 8];
}


/*
Cущество, двигающееся по стенке. 
Object WallFollower()
    methods:
        act(view)
*/
function WallFollower() {
    this.dir = "s";
}

WallFollower.prototype.act = function(view) {
    var start = this.dir;
    if (view.look(dirPlus(this.dir, -3)) != " ")
        start = this.dir = dirPlus(this.dir, -2);
    while (view.look(this.dir) != " ") {
        this.dir = dirPlus(this.dir, 1);
        if (this.dir == start) break;
    }
    return {
        type: "move",
        direction: this.dir
    };
};


/*
LifelikeWorld, чей прототип основан на прототипе World, 
но переопределяет метод letAct.
+ добавлен метод isGoodTime. Возвращающий true, если critters 
могут есть и размножаться
*/
function LifelikeWorld(map, legend) {
    World.call(this, map, legend);
}
LifelikeWorld.prototype = Object.create(World.prototype);

var actionTypes = Object.create(null);

LifelikeWorld.prototype.letAct = function(critter, vector) {
    var isGoodTime = this.isGoodTime(critter);
    var action = critter.act(new View(this, vector), isGoodTime);
    var handled = action &&
        action.type in actionTypes &&
        actionTypes[action.type].call(this, critter,
            vector, action);
    if (!handled) {
        critter.energy -= 0.2;
        if (critter.energy <= 0)
            this.grid.set(vector, null);
    }
};


World.prototype.isGoodTime = function(critter) {
    var isGoodTime = true;
    if (lastStateOfSpace.length != 0 && lastStateOfSpace != undefined) {
        var actedSmartCritterEater = 0,
            actedSmartPlantEater = 0,
            actedPlant = 0;
        lastStateOfSpace.forEach(function(item, i, lastStateOfSpace) {
            if (item instanceof SmartCritterEater)
                actedSmartCritterEater++;
            if (item instanceof SmartPlantEater)
                actedSmartPlantEater++;
            else if (item instanceof Plant)
                actedPlant++;
        });
        if (critter instanceof SmartCritterEater && actedSmartCritterEater * 4 > actedSmartPlantEater) {
            isGoodTime = false;
        } else if (critter instanceof SmartPlantEater && actedSmartPlantEater * 3 > actedPlant)
            isGoodTime = false;
    }
    return isGoodTime;
};

/*
Типы действий существа:
    grow(critter)
    move(critter, vector, action)
    eat(critter, vector, action)
    reproduce(critter, vector, action)
*/
actionTypes.grow = function(critter) {
    critter.energy += 0.5;
    return true;
};

actionTypes.move = function(critter, vector, action) {
    var dest = this.checkDestination(action, vector);
    if (dest == null ||
        critter.energy <= 1 ||
        this.grid.get(dest) != null)
        return false;
    critter.energy -= 1;
    this.grid.set(vector, null);
    this.grid.set(dest, critter);
    return true;
};

actionTypes.eat = function(critter, vector, action) {
    var dest = this.checkDestination(action, vector);
    var atDest = dest != null && this.grid.get(dest);
    if (!atDest || atDest.energy == null)
        return false;
    critter.energy += atDest.energy;
    this.grid.set(dest, null);
    return true;
};

actionTypes.reproduce = function(critter, vector, action) {
    var baby = elementFromChar(this.legend,
        critter.originChar);
    var dest = this.checkDestination(action, vector);
    if (dest == null ||
        critter.energy <= 2 * baby.energy ||
        this.grid.get(dest) != null)
        return false;
    critter.energy -= 2 * baby.energy;
    this.grid.set(dest, baby);
    return true;
};


/*
Растение. 
Object Plant()
    methods:
        act(view)
*/
function Plant() {
    this.energy = 3 + Math.random() * 4;
}
Plant.prototype.act = function(view) {
    if (this.energy > 15) {
        var space = view.find(" ");
        if (space)
            return {
                type: "reproduce",
                direction: space
            };
    }
    if (this.energy < 20)
        return {
            type: "grow"
        };
};

/*
Cущество, поедающее растение. 
Object PlantEater()
    methods:
        act(view)
*/
function PlantEater() {
    this.energy = 20;
}
PlantEater.prototype.act = function(view) {
    var space = view.find(" ");
    if (this.energy > 60 && space)
        return {
            type: "reproduce",
            direction: space
        };
    var plant = view.find("*");
    if (plant)
        return {
            type: "eat",
            direction: plant
        };
    if (space)
        return {
            type: "move",
            direction: space
        };
};

// Ваш код
function SmartPlantEater() {
    this.energy = 30;
    this.direction = "n";
}
SmartPlantEater.prototype = Object.create(PlantEater.prototype);
SmartPlantEater.prototype.act = function(view, isGoodTime) {
    var space = view.find(" ");

    if (this.energy > 90 && space && isGoodTime)
        return {
            type: "reproduce",
            direction: space
        };
    var plant = view.find("*");
    if (plant && isGoodTime)
        return {
            type: "eat",
            direction: plant
        };
    if (view.look(this.direction) != " " && space)
        this.direction = space;
    return {
        type: "move",
        direction: this.direction
    };
};


/*
Cущество, поедающее умные существа, поедающие растения. 
Object SmartCritterEater()
    methods:
        act(view)
*/
function SmartCritterEater() {
    this.energy = 100;
    this.direction = "n";
}

SmartCritterEater.prototype.act = function(view, isGoodTime) {
    var space = view.find(" ");

    if (this.energy > 150 && space && isGoodTime)
        return {
            type: "reproduce",
            direction: space
        };
    var critter = view.find("O");
    if (critter && isGoodTime)
        return {
            type: "eat",
            direction: critter
        };
    if (view.look(this.direction) != " " && space)
        this.direction = space;
    return {
        type: "move",
        direction: this.direction
    };
};



var valley = new LifelikeWorld(
    ["############################",
        "#####       ~         ######",
        "##   ***      ~         **##",
        "#   *##**         **  O  *##",
        "#    ***     O    ##**    *#",
        "#       O         ##***    #",
        "#                 ##**     #",
        "#   O       #*             #",
        "#*     ~    #**       O    #",
        "#***        ##**    O    **#",
        "##****     ###***       *###",
        "############################"
    ], {
        "#": Wall,
        "O": PlantEater,
        "~": WallFollower,
        "*": Plant
    }
);