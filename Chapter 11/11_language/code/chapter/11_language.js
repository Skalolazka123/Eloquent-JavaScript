/*Пропустив начальные пробелы, parseExpression
использует три регулярки для распознавания трёх
простых (атомарных) элементов, поддерживаемых
языком: строк, чисел и слов. */
function parseExpression(program) {
    program = skipSpace(program);
    var match, expr;
    if (match = /^"([^"]*)"/.exec(program))
        expr = {
            type: "value",
            value: match[1]
        };
    else if (match = /^\d+\b/.exec(program))
        expr = {
            type: "value",
            value: Number(match[0])
        };
    else if (match = /^[^\s(),"]+/.exec(program))
        expr = {
            type: "word",
            name: match[0]
        };
    else
        throw new SyntaxError("Unexpected syntax: " + program);
    //Определяет не является ли выражение приложением. 
    return parseApply(expr, program.slice(match[0].length));
}

/*Поскольку Egg разрешает любое количество пробелов в
элементах, нам надо постоянно вырезать пробелы с
начала строки.*/
function skipSpace(string) {
    var spaceOrComment = string.match(/^(\s|#.*)*/);
    return string.slice(spaceOrComment[0].length);
}

/*Определяет, не является ли выражение приложением. 
Если так и есть - парсит список
аргументов в скобках.*/
function parseApply(expr, program) {
    program = skipSpace(program);
    if (program[0] != "(")
        return {
            expr: expr,
            rest: program
        };

    /*Если следующий символ программы – не открывающая
    скобка, то это не приложение, и parseApply просто
    возвращает данное ей выражение.*/
    program = skipSpace(program.slice(1));
    expr = {
        type: "apply",
        operator: expr,
        args: []
    };

    //Создаёт объект синтаксического дерева 
    while (program[0] != ")") {
        var arg = parseExpression(program);
        expr.args.push(arg.expr);
        program = skipSpace(arg.rest);
        if (program[0] == ",")
            program = skipSpace(program.slice(1));
        else if (program[0] != ")")
            throw new SyntaxError("Expected ',' or ')'");
    }
    return parseApply(expr, program.slice(1));
}

/*Проверяет, дошли ли мы до конца строки после разбора выражения*/
function parse(program) {
    var result = parseExpression(program);
    if (skipSpace(result.rest).length > 0)
        throw new SyntaxError("Unexpected text after program");
    return result.expr;
}
//    operator: {type: "word", name: "+"},
//    args: [{type: "word", name: "a"},
//           {type: "value", value: 10}]}

/*Вы даёте интерпретатару синтаксическое дерево и объект окружения, 
который связывает имена со значениями, 
а он интерпретирует
выражение, представляемое деревом, 
и возвращает результат.*/
function evaluate(expr, env) {
    switch (expr.type) {
        case "value":
            return expr.value;

        case "word":
            /*Определена ли переменная в окружении? 
            Если да - запрашиваем значение*/
            if (expr.name in env)
                return env[expr.name];
            else
                throw new ReferenceError("Undefined variable: " +
                    expr.name);
        case "apply":
            /*Если это особая форма типа if,
            мы ничего не интерпретируем, а просто передаём
            аргументы вместе с окружением в функцию,
            обрабатывающую форму*/
            if (expr.operator.type == "word" &&
                expr.operator.name in specialForms)
                return specialForms[expr.operator.name](expr.args,
                    env);
            var op = evaluate(expr.operator, env);
            /*Если это простой вызов, мы
            интерпретируем оператор, проверяем, что это функция и
            вызываем его с результатом интерпретации аргументов*/
            if (typeof op != "function")
                throw new TypeError("Applying a non-function.");
            return op.apply(null, expr.args.map(function(arg) {
                return evaluate(arg, env);
            }));
    }
}

/*Объект specialForms используется для определения
особого синтаксиса Egg. Он сопоставляет слова с
функциями, интерпретирующими эти специальные
формы.*/
var specialForms = Object.create(null);

/*Конструкция if языка Egg ждёт три аргумента. 
Она вычисляет первый, и если результат не false, 
вычисляет второй. 
В ином случае вычисляет третий*/
specialForms["if"] = function(args, env) {
    if (args.length != 3)
        throw new SyntaxError("Bad number of args to if");

    if (evaluate(args[0], env) !== false)
        return evaluate(args[1], env);
    else
        return evaluate(args[2], env);
};

/*While аналогично if*/
specialForms["while"] = function(args, env) {
    if (args.length != 2)
        throw new SyntaxError("Bad number of args to while");

    while (evaluate(args[0], env) !== false)
        evaluate(args[1], env);

    // Since undefined does not exist in Egg, we return false,
    // for lack of a meaningful result.
    return false;
};

/*do, выполняет все аргументы сверху вниз. 
Его значение – это значение,
выдаваемое последним аргументом.*/
specialForms["do"] = function(args, env) {
    var value = false;
    args.forEach(function(arg) {
        value = evaluate(arg, env);
    });
    return value;
};

/*Чтобы создавать переменные и давать им значения, мы
создаём форму define. Она ожидает word в качестве
первого аргумента, и выражение, производящее значение, 
которое надо присвоить этому слову в качестве второго.
Возвращает присвоенное значение.*/
specialForms["define"] = function(args, env) {
    if (args.length != 2 || args[0].type != "word")
        throw new SyntaxError("Bad use of define");
    var value = evaluate(args[1], env);
    env[args[0].name] = value;
    return value;
};

/*Для использования конструкции if мы должны создать
булевские значения.*/
var topEnv = Object.create(null);

topEnv["true"] = true;
topEnv["false"] = false;

/*Для упрощения кода мы будем использовать new Function
для создания набора функций-операторов в цикле, а не
определять их все по отдельности.*/
["+", "-", "*", "/", "==", "<", ">"].forEach(function(op) {
    topEnv[op] = new Function("a, b", "return a " + op + " b;");
});

/*Вывод значений*/
topEnv["print"] = function(value) {
    console.log(value);
    return value;
};

/*Run даёт удобный способ записи и запуска. 
Она создаёт свежее окружение, парсит и разбирает строчки, 
которые мы ей передаём, так, как будто они являются одной программой.*/
function run() {
    var env = Object.create(topEnv);
    /*Array.prototype.slice.call - уловка для
    превращения объекта, похожего на массив, такого как
    аргументы, в настоящий массив, чтобы мы могли
    применить к нему join.*/
    var program = Array.prototype.slice.call(arguments, 0).join("\n");
    return evaluate(parse(program), env);
}

/*Расценивает последний аргумент как тело функции, а все
предыдущие – имена аргументов функции.*/
specialForms["fun"] = function(args, env) {
    if (!args.length)
        throw new SyntaxError("Functions need a body");

    function name(expr) {
        if (expr.type != "word")
            throw new SyntaxError("Arg names must be words");
        return expr.name;
    }
    var argNames = args.slice(0, args.length - 1).map(name);
    var body = args[args.length - 1];

    return function() {
        if (arguments.length != argNames.length)
            throw new TypeError("Wrong number of arguments");
        var localEnv = Object.create(env);
        for (var i = 0; i < arguments.length; i++)
            localEnv[argNames[i]] = arguments[i];
        return evaluate(body, localEnv);
    };
};

//11.1 Arrays

topEnv["array"] = function() {
    return Array.prototype.slice.call(arguments, 0);
};

topEnv["length"] = function(arr) {
    return arr.length;
};

topEnv["element"] = function(arr, n) {
    return arr[n];
};

run("do(define(sum, fun(array,",
    "     do(define(i, 0),",
    "        define(sum, 0),",
    "        while(<(i, length(array)),",
    "          do(define(sum, +(sum, element(array, i))),",
    "             define(i, +(i, 1)))),",
    "        sum))),",
    "   print(sum(array(1, 2, 3))))");
// → 6

run("do(define(f, fun(a, fun(b, +(a, b)))),",
    " print(f(4)(5)))");
// → 9

//11.3 Comments

console.log(parse("# hello\nx"));
// → {type: "word", name: "x"}

console.log(parse("a # one\n   # two\n()"));
// → {type: "apply",
//    operator: {type: "word", name: "a"},
//    args: []}


//11.4 Fixing scope

specialForms["set"] = function(args, env) {
    var argName = args[0].name,
        envPrototype = Object.getPrototypeOf(env),
        value = evaluate(args[1], env);
    if (args.length != 2 || args[0].type != "word" ||  !(argName in env) || !(Object.prototype.hasOwnProperty.call(envPrototype, argName)))
        throw new ReferenceError("Bad use of set");
    if (Object.prototype.hasOwnProperty.call(envPrototype, argName))
        envPrototype[argName] = value;   
    else
        argName = value;
    return value;
};

run("do(define(x, 4),",
    "   define(setx, fun(val, set(x, val))),",
    "   setx(50),",
    "   print(x))");
// → 50
run("set(quux, true)");
// → Some kind of ReferenceError