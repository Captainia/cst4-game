class Storage {
    constructor() {
        this.values = {};
    }

    variable(key, typeIfCreate) {
        if (!(key in this.values)) {
            if (!(typeIfCreate in Storage.defaultValues))
                throw new Error("Unsupported variable type: " + typeIfCreate);
            this.values[key] = Storage.defaultValues[typeIfCreate];
        }
        return new Variable(this, key);
    }
}

Storage.defaultValues = {
    "string": "",
    "boolean": false,
    "number": 0
};

global = new Storage();
local = new Storage();

function isVariable(key) {
    return typeof key === "string" && (key.startsWith("$") || key.startsWith("#"));
}

function lookup(key, typeIfCreate) {
    if (!isVariable(key))
        throw new Error("Looked up key \"" + key + "\" is not a variable");
    if (key.startsWith("#")) {
        return global.variable(key.substr(1), typeIfCreate);
    } else if (key.startsWith("$")) {
        return local.variable(key.substr(1), typeIfCreate);
    }
}

function valueOf(expr) {
    if (typeof expr === "function") {
        return expr();
    } else if (expr instanceof Expression) {
        return expr.value();
    } else {
        if (isVariable(expr))
            return lookup(expr).value();
        return expr;
    }
}

class Expression {
    value() {
        return null;
    }
}

class Variable extends Expression {
    constructor(sto, key) {
        super();
        this.sto = sto;
        this.key = key;
    }

    value() {
        let varVal = this.sto.values[this.key];
        if (varVal === null)
            varVal = 0;
        return varVal;
    }

    set(value) {
        let varVal = this.sto.values[this.key];
        if (varVal !== null && typeof value !== typeof varVal)
            throw new Error("Type mismatch during assignment");
        this.sto.values[this.key] = value;
    }

    delta(value) {
        let varVal = this.sto.values[this.key];
        if (varVal === null) varVal = 0;
        if (typeof varVal !== "number")
            throw new Error("`increase`/`decrease` on non-number types");
        this.sto.values[this.key] = varVal + value;
    }
}

class Jump extends Expression {
    constructor(label) {
        super();
        this.label = label;
    }

    value() {
        // console.log("jump " + this.label);
        return this;
    }
}

class RelOp {
    static gt(a, b) {
        return a > b;
    }

    static lt(a, b) {
        return a < b;
    }

    static ge(a, b) {
        return a >= b;
    }

    static le(a, b) {
        return a <= b;
    }

    static eq(a, b) {
        return a === b;
    }

    static ne(a, b) {
        return a !== b;
    }

    static forward(func, a, b) {
        if (isVariable(a)) a = lookup(a, "number");
        if (isVariable(b)) b = lookup(b, "number");
        return function () {
            let valA = valueOf(a);
            let valB = valueOf(b);
            let retVal = func(valA, valB);
            // console.log(func, valA, valB, retVal);
            return retVal;
        }
    }
}

class Conditional extends Expression {
    constructor(cond) {
        super();
        this.cond = cond;
        this.thenClause = null;
        this.elseClause = null;
        this.andExprs = [];
        this.orExprs = [];
    }

    and(expr) {
        if (this.orExprs.length > 0)
            throw new Error("`or` is called on this conditional");
        this.andExprs.push(expr);
        return this;
    }

    or(expr) {
        if (this.andExprs.length > 0)
            throw new Error("`and` is called on this conditional");
        this.orExprs.push(expr);
        return this;
    }

    value() {
        let cond = valueOf(this.cond);
        if (typeof cond !== "boolean")
            throw new Error("Conditional not evaluated to boolean");
        for (let expr of this.andExprs) {
            let val = valueOf(expr);
            if (typeof val !== "boolean")
                throw new Error("Conditional in `and` not evaluated to boolean");
            cond = cond && val;
        }
        for (let expr of this.orExprs) {
            let val = valueOf(expr);
            if (typeof val !== "boolean")
                throw new Error("Conditional in `or` not evaluated to boolean");
            cond = cond || val;
        }
        if (this.thenClause == null && this.elseClause == null) {
            // console.log("cond: " + cond);
            return cond;
        } else {
            if (cond) {
                // console.log("cond then");
                return valueOf(this.thenClause);
            } else {
                // console.log("cond else");
                return valueOf(this.elseClause);
            }
        }
    }

    then(expr) {
        if (this.thenClause != null)
            throw new Error("`then` already called");
        this.thenClause = expr;
        return this;
    }

    else(expr) {
        if (this.elseClause != null)
            throw new Error("`else` already called");
        this.elseClause = expr;
        return this;
    }
}

class Assignment extends Expression {
    constructor(a, b) {
        super();
        this.a = a;
        this.b = b;
    }

    value() {
        let val = valueOf(this.b);
        this.a.set(val);
        // console.log("assign " + this.a.key + " " + val);
        return val;
    }
}

function ge(a, b) {
    return new Conditional(RelOp.forward(RelOp.ge, a, b));
}

function le(a, b) {
    return new Conditional(RelOp.forward(RelOp.le, a, b));
}

function gt(a, b) {
    return new Conditional(RelOp.forward(RelOp.gt, a, b));
}

function lt(a, b) {
    return new Conditional(RelOp.forward(RelOp.lt, a, b));
}

function eq(a, b) {
    return new Conditional(RelOp.forward(RelOp.eq, a, b));
}

function ne(a, b) {
    return new Conditional(RelOp.forward(RelOp.ne, a, b));
}

function flagged(key) {
    return new Conditional(lookup(key, "boolean"));
}

function not(a) {
    return new Conditional(function () {
        return !valueOf(a);
    });
}

function flag(key) {
    return new Assignment(lookup(key, "boolean"), true);
}

function unflag(key) {
    return new Assignment(lookup(key, "boolean"), false);
}

function set(key, value) {
    return new Assignment(lookup(key, typeof value), value);
}

function increase(key, delta) {
    let variable = lookup(key, "number");
    return new Assignment(variable, function () {
        return variable.value() + delta;
    });
}

function decrease(key, delta) {
    return increase(key, -delta);
}

function achieve() {
}

function jump(label) {
    return new Jump(label);
}