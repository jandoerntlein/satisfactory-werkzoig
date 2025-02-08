import { LiteGraph } from '../litegraph/litegraph.core.js';
import type { Recipe, RecipeResource, Building, Buildings, Miner, Resource, Resources, Item, Items, Recipes, Miners } from './satisfactory-types/satisfactory-types';

class TransferItem {
    constructor(name: string, amount: number) {
        this.name = name; // Iron, Copper, ...
        this.amount = amount; // unit is [items/min]
    }
    name: string;
    amount: number;
    toString() {
        return Math.floor(this.amount) + " " + sanitizeName(this.name)
    }
}

class TransferLiquid {
    constructor(name: string, amount: number) {
        this.name = name; // Water, Oil, ...
        this.amount = amount; // unit is [flow/min]
    }
    name: string;
    amount: number;
    toString() {
        return Math.floor(this.amount) + " " + sanitizeName(this.name)
    }
}

class Transfer {
    constructor(items: TransferItem[]) {
        this.items = items; // [new Item(), ...]
    }
    items: TransferItem[];
    toString() {
        let sep = ", ";
        let str = "[";
        this.items.forEach((e: TransferItem) => {
            str += e.toString() + sep;
        });

        if (str.length > 1) {
            str = str.substring(0, str.length - sep.length) + "]";
        } else {
            str = "[]";
        }
        return str;
    }
    merge() {
        // merge duplicates
        let itemMap: { [key: string]: number } = {};
        this.items.forEach((e: TransferItem) => {
            if (e.name in itemMap) {
                if (e.amount > 0) {
                    itemMap[e.name] += e.amount;
                }
            } else {
                if (e.amount > 0) {
                    itemMap[e.name] = e.amount;
                }
            }
        });
        // rebuild items
        this.items = [];
        for (const key in itemMap) {
            let item = new TransferItem(key, itemMap[key]);
            this.items.push(new TransferItem(item.name, item.amount));
        }
    }
    sum() {
        let sum = 0;
        this.items.forEach((e: TransferItem) => {
            sum += e.amount
        })
        return Math.floor(sum)
    }
}

const g_recipes: Recipes = require("../../data/data1.0.json").recipes;
const g_buildings: Buildings = require("../../data/data1.0.json").buildings;
const g_miners: Miners = require("../../data/data1.0.json").miners;
const g_resources: Resources = require("../../data/data1.0.json").resources;
const g_items: Items = require("../../data/data1.0.json").items;

const baseIngredients = ["Desc_OreIron_C", "Desc_OreCopper_C", "Desc_Stone_C", "Desc_Coal_C", "Desc_GoldIngot_C", "Desc_RawQuartz_C", "Desc_Sulfur_C", "Desc_OreBauxite_C", "Desc_OreUranium_C", "Desc_SAM_C", "Desc_NitrogenGas_C", "Desc_Water_C"]

function isBaseIngredient(item: Item | string) {
    if (typeof item === "string") {
        return baseIngredients.includes(item)
    } else {
        return baseIngredients.includes(item.className)
    }
}

function sanitizeName(name: string | string[]) {
    if (Array.isArray(name)) {
        return name.map((n) => n.replace("Desc_", "").replace("_C", ""));
    } else {
        return name.replace("Desc_", "").replace("_C", "");
    }
}

export function itemFromName(name: string): Item {
    let it: Item | undefined = Object.values(g_items).find((item: Item) => item.name === name);
    if (!it) {
        it = Object.values(g_items).find((item: Item) => item.className === name);
    }

    if (!it) {
        throw new Error("Item '" + name + "' not found");
    }
    return it
}

function ingredientList(item: Item, alt = false): Recipe | undefined {
    if (item === undefined) {
        console.log("-- ingredientList: item is undefined");
        return undefined;
    }
    return Object.values(g_recipes).find((recipe: Recipe) => recipe.products.length > 0 && recipe.alternate == alt && recipe.products[0].item === item.className);
}

type GraphNode = {
    item: Item;
    amount: number;
    children: GraphNode[];
    recipe?: Recipe;
};

function printGraph(node: GraphNode, indent = ""): string {
    let result = `${indent}${node.item.name} (${node.amount})\n`;
    for (let child of node.children) {
        result += printGraph(child, indent + "  ");
    }
    return result;
}

export function ingredientGraph(item: Item, amount = 1): GraphNode {
    let graph: GraphNode = { item, amount, children: [] };
    let stack: { node: GraphNode, alt: boolean }[] = [{ node: graph, alt: false }];
    let iterations = 0;
    const maxIterations = 100;

    while (stack.length > 0 && iterations < maxIterations) {
        let { node, alt } = stack.pop()!;
        let recipe = ingredientList(node.item, alt);
        if (recipe) {
            node.recipe = recipe;
            for (let ingredient of recipe.ingredients) {
                let ingredientAmount = (ingredient.amount / recipe.products[0].amount) * node.amount;
                let ingredientNode: GraphNode = { item: itemFromName(ingredient.item), amount: ingredientAmount, children: [] };
                node.children.push(ingredientNode);
                if (!isBaseIngredient(ingredientNode.item)) {
                    stack.push({ node: ingredientNode, alt: false });
                }
            }
        }
        iterations++;
    }

    console.log("-- graph to produce " + item.name + ":\n" + printGraph(graph));
    return graph;
}

export function createPipeline(graph: any, _graph: GraphNode) {
    let node: GraphNode = _graph;
    let stack: { node: GraphNode, parentNode: GraphNode | null, parentRecipe: any | null }[] = [{ node, parentNode: null, parentRecipe: null }];
    let iterations = 0;
    const maxIterations = 100;

    // Initialize positions
    let positions: { [key: string]: { x: number, y: number } } = {};
    let forces: { [key: string]: { x: number, y: number } } = {};

    while (stack.length > 0 && iterations < maxIterations) {
        let { node, parentNode, parentRecipe } = stack.pop()!;
        if (node.recipe) {
            let recipe = node.recipe;
            let building = g_buildings[recipe.producedIn[0]];
            if (building) {
                let node_name = "Building/" + building.name;
                console.log("-- createPipeline: adding node for building: ", node_name);
                let newNode = LiteGraph.createNode(node_name) as any;
                newNode.properties.recipe = recipe.name;
                newNode.widgets[1].value = recipe.name;
                newNode.properties.speed = 100;
                graph.add(newNode);

                positions[newNode.id] = { x: Math.random() * 1000, y: Math.random() * 1000 };
                forces[newNode.id] = { x: 0, y: 0 };

                if (parentNode && parentRecipe) {
                    for (let i = 0; i < recipe.products.length; i++) {
                        let p = recipe.products[i];
                        console.log("-- ", node_name, ": connection for ", p.item, " - ", parentRecipe);
                        for (let j = 0; j < parentRecipe?.ingredients.length; j++) {
                            console.log("-- ", node_name, ": connecting inner...");
                            let product = parentRecipe.ingredients[j];
                            if (p.item === product.item) {
                                console.log("-- ", node_name, ": connecting ", p.item, " with ", product.item);
                                newNode.connect(i, parentNode, j);
                            } else {
                                console.log("-- ", node_name, ": no connection found for ", p.item, " and ", product.item);
                            }
                        }
                    }
                }

                for (let child of node.children) {
                    stack.push({ node: child, parentNode: newNode, parentRecipe: recipe });
                }
            }
        } else if (isBaseIngredient(node.item)) {
            let miner = Object.values(g_miners).find((miner: Miner) => miner.allowedResources.includes(node.item.className));
            if (miner) {
                let newNode: any;
                if (!node.item.liquid) {
                    let node_name = "Miner/Miner";
                    console.log("-- createPipeline: adding solid node for miner: ", node_name);
                    newNode = LiteGraph.createNode(node_name) as any;
                    newNode.properties.recipe = sanitizeName(node.item.className);
                    newNode.widgets[2].value = sanitizeName(node.item.className);
                    newNode.properties.speed = 100;
                    graph.add(newNode);
                } else {
                    let node_name = "Miner/FrackingExtractor";
                    console.log("-- createPipeline: adding liquid node for miner: ", node_name);
                    newNode = LiteGraph.createNode(node_name) as any;
                    newNode.properties.recipe = sanitizeName(node.item.className);
                    newNode.widgets[1].value = sanitizeName(node.item.className);
                    newNode.properties.speed = 100
                    graph.add(newNode);
                }

                positions[newNode.id] = { x: Math.random() * 1000, y: Math.random() * 1000 };
                forces[newNode.id] = { x: 0, y: 0 };

                if (parentNode) {
                    let newNodeIdx = 0;
                    let parentNodeIdx = 0;
                    newNode.connect(newNodeIdx, parentNode, parentNodeIdx);
                }

                for (let child of node.children) {
                    stack.push({ node: child, parentNode: newNode, parentRecipe: node.recipe });
                }
            }
        }
        iterations++;
    }

    /** LAYOUTING **/
    
    // Apply spring-force directed algorithm
    const repulsionForce = 1000;
    const springLength = 400;
    const springForce = 0.1;
    const damping = 0.9;
    const iterationsCount = 1000;

    for (let i = 0; i < iterationsCount; i++) {
        // Calculate repulsion forces
        for (let id1 in positions) {
            for (let id2 in positions) {
                if (id1 !== id2) {
                    let dx = positions[id1].x - positions[id2].x;
                    let dy = positions[id1].y - positions[id2].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0) {
                        let force = repulsionForce / (distance * distance);
                        forces[id1].x += (dx / distance) * force;
                        forces[id1].y += (dy / distance) * force;
                    }
                }
            }
        }

        // Calculate spring forces
        console.log("-- graph.links: ", graph.links);
        for (let link of Object.values(graph.links) as { origin_id: string, target_id: string }[]) { // fix: iterate over the values of graph.links
            let source = positions[link.origin_id];
            let target = positions[link.target_id];
            let dx = target.x - source.x;
            let dy = target.y - source.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let force = springForce * (distance - springLength);
            let fx = (dx / distance) * force;
            let fy = (dy / distance) * force;
            forces[link.origin_id].x += fx;
            forces[link.origin_id].y += fy;
            forces[link.target_id].x -= fx;
            forces[link.target_id].y -= fy;
        }

        // Update positions
        for (let id in positions) {
            positions[id].x += forces[id].x;
            positions[id].y += forces[id].y;
            forces[id].x *= damping;
            forces[id].y *= damping;
        }
    }

    // Apply positions to nodes
    for (let node of graph._nodes) {
        if (positions[node.id]) {
            node.pos[0] = positions[node.id].x;
            node.pos[1] = positions[node.id].y;
        }
    }
}

function drawBadge(node: any, ctx: any, text: string) {
    if (!node.flags.collapsed && node.constructor.title_mode != LiteGraph.NO_TITLE) {
        if (text != undefined && text != "") {
            let fgColor = "white";
            let bgColor = "#0F1F0F";
            if (text != "100%") {
                bgColor = "#3F0F0F"
            }
            let visible = true;

            ctx.save();
            ctx.font = "12px Roboto Condensed";
            const sz = ctx.measureText(text);
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.roundRect(node.size[0] - sz.width - 12, -LiteGraph.NODE_TITLE_HEIGHT - 20, sz.width + 12, 20, 5);
            ctx.fill();

            ctx.fillStyle = fgColor;
            ctx.fillText(text, node.size[0] - sz.width - 6, -LiteGraph.NODE_TITLE_HEIGHT - 6);
            ctx.restore();

            if (node.has_errors) {
                ctx.save();
                ctx.font = "bold 14px Roboto Condensed";
                const sz2 = ctx.measureText(node.type);
                ctx.fillStyle = 'white';
                ctx.fillText(node.type, node.size[0] / 2 - sz2.width / 2, node.size[1] / 2);
                ctx.restore();
            }
        }
    }
}

function indexOfSmallest(arr: number[]) {
    return arr.reduce((lowestIndex, currentElement, currentIndex, array) =>
        currentElement < array[lowestIndex] ? currentIndex : lowestIndex, 0);
}

const createSatisfactoryNodes = (graph: any) => {
    /**
     * Buildings
     */
    // create all required building nodes
    for (let recipe_name in g_recipes) {
        let recipe: Recipe = g_recipes[recipe_name];

        // for this particular recipe, collect all buildings required to get it up and running
        let required_buildings: Set<string> = new Set([...recipe.producedIn]);
        for (let ingredient of recipe.ingredients) {
            let ingredient_recipe: Recipe = g_recipes[ingredient.item];
            if (ingredient_recipe && ingredient_recipe.forBuilding) {
                for (let building of ingredient_recipe.producedIn) {
                    required_buildings.add(building);
                }
            }
        }
        for (let products of recipe.products) {
            let product_recipe: Recipe = g_recipes[products.item];
            if (product_recipe && product_recipe.forBuilding) {
                for (let building of product_recipe.producedIn) {
                    required_buildings.add(building);
                }
            }
        }

        // console.log("-- Found required buildings for recipe: ", recipe.slug, " -> ", Array.from(required_buildings).join(", "));

        // iterate over all required buildings and create a node for each in litegraph
        for (let required_building of required_buildings) {
            if (required_building === "none") {
                continue;
            }
            let building: Building = g_buildings[required_building];

            // ensure to only add buildings once, not multiple times
            if (building) {
                let node_name = "Building/" + building.name
                // check that this nodetype has not been registered yet 
                if (LiteGraph.getNodeType(node_name)) {
                    // console.log(`Node type already registered for building: ${building.name}`);
                    continue;
                }
                // find all recipes, which can be crafted by this node
                let _recipes: Recipe[] = [];
                for (let recipe_name in g_recipes) {
                    let recipe: Recipe = g_recipes[recipe_name];
                    if (recipe.producedIn.includes(building.className)) {
                        _recipes.push(recipe);
                    }
                }
                console.log("-- adding node for building: ", node_name, " with recipes: ", _recipes.map((recipe: Recipe) => recipe.slug));
                // add this node
                function node(this: any) {
                    this.size = [200, 200];
                    this.properties = {
                        speed: 100,
                        recipe: "",
                        efficiency: 0,
                    }
                    this.addWidget("number", "Speed", 100.0, (v: number) => {
                        if (v != undefined) {
                            this.properties.speed = Number(v);
                        }
                    }, { min: 0, max: 250, step: 250, precision: 0 })
                    this.addWidget("combo", "Recipe", "undefined", (v: string) => {
                        this.properties.recipe = v
                        let selected_recipe: Recipe | undefined = Object.values(g_recipes).find((recipe: Recipe) => recipe.name === v);

                        // once a recipe is selected, update the input/output names of our current node
                        if (selected_recipe) {
                            for (let i = 0; i < selected_recipe.ingredients.length; i++) {
                                this.inputs[i].name = sanitizeName(selected_recipe.ingredients[i].item)
                            }
                            for (let i = 0; i < selected_recipe.products.length; i++) {
                                this.outputs[i].name = sanitizeName(selected_recipe.products[i].item)
                            }
                        }
                    },
                        {
                            values: Object.values(_recipes).map((recipe: Recipe) => {
                                return recipe.name;
                            })
                        })
                    this.onDrawForeground = function (ctx: any) {
                        drawBadge(this, ctx, (this.properties.efficiency * 100.0).toFixed(0) + "%")
                    }

                    // add the correct amount of inputs, depending on the building type
                    switch (building.slug) {
                        case "constructor":
                            this.addInput("", "Items");

                            this.addOutput("", "Items");
                            break;
                        case "smelter":
                            this.addInput("", "Items");

                            this.addOutput("", "Items");
                            break;
                        case "blender":
                            this.addInput("", "Items");
                            this.addInput("", "Items");
                            this.addInput("", "Liquids");
                            this.addInput("", "Liquids");

                            this.addOutput("", "Items");
                            this.addOutput("", "Liquids");
                            break;
                        case "packager":
                            this.addInput("", "Items");
                            this.addInput("", "Liquids");

                            this.addOutput("", "Items");
                            this.addOutput("", "Liquids");
                            break;
                        case "foundry":
                            this.addInput("", "Items");
                            this.addInput("", "Items");

                            this.addOutput("", "Items");
                            break;
                        case "refinery":
                            this.addInput("", "Items");
                            this.addInput("", "Liquids");

                            this.addOutput("", "Items");
                            this.addOutput("", "Liquids");
                            break;
                        case "assembler":
                            this.addInput("", "Items");
                            this.addInput("", "Items");

                            this.addOutput("", "Items");
                            break;
                        case "manufacturer":
                            this.addInput("", "Items");
                            this.addInput("", "Items");
                            this.addInput("", "Items");
                            this.addInput("", "Items");

                            this.addOutput("", "Items");
                            break;
                        case "converter":
                            this.addInput("", "Items");
                            this.addInput("", "Items");

                            this.addOutput("", "Liquids");
                            this.addOutput("", "Items");
                            break;
                        case "quantum-encoder":
                            this.addInput("", "Items");
                            this.addInput("", "Items");
                            this.addInput("", "Items");
                            this.addInput("", "Liquids");

                            this.addOutput("", "Items");
                            this.addOutput("", "Liquids");
                            break;
                        case "particle-accelerator":
                            this.addInput("", "Items");
                            this.addInput("", "Items");

                            this.addOutput("", "Liquids");
                            this.addOutput("", "Items");
                            break;
                    }
                }
                node.title = building.name
                node.description = node.title
                node.prototype.onExecute = function () {
                    // check which recipe is selected
                    let selected_recipe: Recipe | undefined = Object.values(g_recipes).find((recipe: Recipe) => recipe.name === this.properties.recipe);

                    if (selected_recipe === undefined) {
                        return
                    }

                    // calculate the output items and liquids, as well as the effiency. 
                    // Example: "Aluminum Casing": needs 3 "Aluminum Ingot" to produce 2 "Aluminum Casing" in 2 sec (30/min)
                    // this can be accelerated by this.properties.speed (default 100%)

                    let input_items: Transfer[] = [];
                    let input_liquids: TransferLiquid[] = [];

                    // there are up to 4 input slots
                    const max_input_slots = 4
                    for (let i = 0; i < max_input_slots; i++) {
                        if (this.isInputConnected(i)) {
                            // check input type
                            if (this.getInputDataType(i) == "Items") {
                                console.log(`-- ${this.title} has Items input ${this.getInputData(i)}`)
                                input_items.push(this.getInputData(i));
                            }
                            else if (this.getInputDataType(i) == "Liquids") {
                                console.log(`-- ${this.title} has liquid input ${this.getInputData(i)}`)
                                input_liquids.push(this.getInputData(i));
                            } else {
                                console.warn("Unknown input type: " + this.getInputDataType(i))
                            }
                        }
                    }

                    // calculate the required number of input items in case of 100% efficiency
                    let wanted: number[] = selected_recipe.ingredients.map((ingredient: RecipeResource, idx) => {
                        if (selected_recipe === undefined) return 0 // this can never happen
                        return ingredient.amount * (60 / selected_recipe.products[0].amount) * (this.properties.speed / 100.0)
                    })

                    // now we need to collect all inputs for a certain recipe, and check if we can produce the required amount
                    let available: number[] = []
                    for (let i = 0; i < wanted.length; i++) {
                        let ingredient = selected_recipe.ingredients[i]
                        console.log(`-- recipe ${selected_recipe.slug} requires ${ingredient.amount} ${ingredient.item}`)
                        let available_amount = 0
                        for (let items of input_items) {
                            if (items) {
                                if (items.items) {
                                    for (let item of items.items) {
                                        // input name should be unsanitized, but just to be sure...
                                        if (item.name === sanitizeName(ingredient.item) || item.name == ingredient.item) {
                                            available_amount += item.amount
                                        }
                                    }
                                }
                            }
                        }
                        for (let liquid of input_liquids) {
                            if (liquid) {
                                // input name should be unsanitized, but just to be sure...
                                if (liquid.name === sanitizeName(ingredient.item) || liquid.name == ingredient.item) {
                                    available_amount += liquid.amount
                                }
                            }
                        }
                        available.push(available_amount)
                    }

                    // add "(X/Y)" to the input nodes, where X is the available amount, and Y is the wanted amount of items
                    for (let i = 0; i < wanted.length; i++) {
                        this.inputs[i].name = sanitizeName(selected_recipe.ingredients[i].item) + " (" + Math.floor(available[i]) + "/" + Math.floor(wanted[i]) + ")"
                    }

                    // calculate the efficiency, which is determined by the input product which is available in the lowest amount
                    let efficiency = 1.0
                    if (available.length > 0) {
                        let idx = indexOfSmallest(available)
                        // make sure that we do not exceed 100%
                        efficiency = Math.min(1.0, available[idx] / wanted[idx])
                    }
                    this.properties.efficiency = efficiency

                    // each recipe creates a number of products, which is determined by the number of recipe products
                    let output_items: Transfer[] = [];
                    let output_liquids: TransferLiquid[] = [];
                    for (let product of selected_recipe.products) {
                        // check if liquid==true
                        if (g_items[product.item].liquid) {
                            output_liquids.push(new TransferLiquid(product.item, (60 / product.amount) * efficiency))
                        } else {
                            output_items.push(new Transfer([new TransferItem(product.item, (60 / product.amount) * efficiency)]))
                        }
                    }

                    // output the calculated items
                    let output_idx = 0
                    for (let item in output_items) {
                        if (output_items[output_idx]) {
                            console.log(`-- ${this.title} has output items ${output_items[output_idx]} for output index ${output_idx}`)
                            this.outputs[output_idx].name = sanitizeName(output_items[output_idx].toString())
                            this.setOutputData(output_idx, output_items[output_idx])
                        }
                        output_idx++
                    }
                    for (let liquid in output_liquids) {
                        if (output_items[output_idx]) {
                            console.log(`-- ${this.title} has output liquids ${output_items[output_idx]} for output index ${output_idx}`)
                            this.outputs[output_idx].name = sanitizeName(output_liquids[output_idx].toString())
                            this.setOutputData(output_idx, output_liquids[output_idx])
                        }
                        output_idx++
                    }
                }
                LiteGraph.registerNodeType(node_name, node)
            } else {
                console.warn(`Building not found for key: ${required_building}`);
            }
        }
    }

    // create special nodes for splitters/mergers

    /** Splitter
        * 
        */
    function Splitter(this: any) {
        this.title = "Splitter"
        this.desc = this.title
        this.size = [200, 200]

        this.properties = {
        }

        this.addInput("in", "Items")
        this.properties.out1 = this.addOutput("out", "Items")
        this.properties.out2 = this.addOutput("out", "Items")
        this.properties.out3 = this.addOutput("out", "Items")
    }

    Splitter.prototype.onExecute = function () {
        console.log("Splitter: onExecute()")
        let inputs = null
        if (this.isInputConnected(0) && this.getInputData(0)) {
            inputs = this.getInputData(0).items
        }
        let outputs = new Transfer([])

        this.inputs[0].name = this.getInputData(0)?.toString()
        this.outputs[0].name = this.getOutputData(0)?.toString()
        this.outputs[1].name = this.getOutputData(1)?.toString()
        this.outputs[2].name = this.getOutputData(2)?.toString()

        let N = 0
        if (this.isOutputConnected(0)) {
            N++
        }
        if (this.isOutputConnected(1)) {
            N++
        }
        if (this.isOutputConnected(2)) {
            N++
        }

        if (inputs) {
            inputs.forEach((e: { name: string; amount: number; }) => {
                outputs.items.push(new TransferItem(e.name, Math.round(e.amount / N)))
            })

            console.log("Splitter: splitting to " + N + " connections")

            if (this.isOutputConnected(0)) {
                this.setOutputData(0, outputs)
            }
            if (this.isOutputConnected(1)) {
                this.setOutputData(1, outputs)
            }
            if (this.isOutputConnected(2)) {
                this.setOutputData(2, outputs)
            }
        }
    }

    LiteGraph.registerNodeType("Logistics/Splitter", Splitter)

    /** Merger
        * 
        */
    function Merger(this: any) {
        this.title = "Merger"
        this.desc = this.title
        this.size = [200, 200]

        this.properties = {
        }

        this.addInput("in", "Items")
        this.addInput("in", "Items")
        this.addInput("in", "Items")
        this.addOutput("out", "Items")

    }

    Merger.prototype.onExecute = function () {
        console.log("Merger: onExecute()")

        let outputs = new Transfer([])

        this.inputs[0].name = this.getInputData(0)?.toString()
        this.inputs[1].name = this.getInputData(1)?.toString()
        this.inputs[2].name = this.getInputData(2)?.toString()
        this.outputs[0].name = this.getOutputData(0)?.toString()

        if (this.isInputConnected(0)) {
            let input = this.getInputData(0).items[0]
            if (input != undefined) {
                let output = new TransferItem(input.name, Math.round(input.amount))
                outputs.items.push(output)
            }
        }

        if (this.isInputConnected(1)) {
            let input = this.getInputData(1).items[0]
            if (input != undefined) {
                let output = new TransferItem(input.name, Math.round(input.amount))
                outputs.items.push(output)
            }
        }

        if (this.isInputConnected(2)) {
            let input = this.getInputData(2).items[0]
            if (input != undefined) {
                let output = new TransferItem(input.name, Math.round(input.amount))
                outputs.items.push(output)
            }
        }

        console.log("Merger: splitting " + outputs)

        outputs.merge()
        this.setOutputData(0, outputs)
    }

    LiteGraph.registerNodeType("Logistics/Merger", Merger)

    /**
     * Miners
     */
    for (let miner in g_miners) {
        let miner_data: Miner = g_miners[miner]
        // miner_data.className could be "Desc_FrackingExtractor_C", e.g.
        // remove the "Desc_" and "_C" part
        let node_name = "Miner/" + sanitizeName(miner_data.className)

        // add Mk1/Mk2/Mk3 miner as a single node
        if (miner_data.className.includes("MinerMk1") || miner_data.className.includes("MinerMk2") || miner_data.className.includes("MinerMk3")) {
            node_name = "Miner/Miner"
        }

        if (LiteGraph.getNodeType(node_name)) {
            console.log(`Node type already registered for miner: ${miner_data.className}`);
            continue;
        }

        function node(this: any) {
            this.size = [200, 200];
            this.properties = {
                speed: 100,
                mark: 60,
                recipe: "undefined"
            }
            this.addWidget("number", "Speed", 100.0, (v: number) => {
                if (v != undefined) {
                    this.properties.speed = Number(v);
                }
            }, { min: 0, max: 250, step: 250, precision: 0 })

            if (node_name == "Miner/Miner") {
                this.addWidget("combo", "Mark", "Mk.1", (v: string) => {
                    switch (v) {
                        case "Mk.1": this.properties.mark = 60; break;
                        case "Mk.2": this.properties.mark = 120; break;
                        case "Mk.3": this.properties.mark = 240; break;
                        default: this.properties.mark = 60;
                    }
                },
                    { values: ["Mk.1", "Mk.2", "Mk.3"] }
                )
            }

            // push all allowedResources to the inputs
            this.addWidget("combo", "Recipe", "undefined", (v: string) => {
                this.properties.recipe = v
            },
                {
                    values: Object.values(miner_data.allowedResources).map((resource) => {
                        return sanitizeName(resource)
                    })
                })

            // check if this miner can extract liquids
            if (miner_data.allowLiquids) {
                console.log(`-- ${miner_data.className} can extract liquids`)
                this.addOutput("out", "Liquids");
            } else {
                console.log(`-- ${miner_data.className} can extract solids`)
                this.addOutput("out", "Items");
            }
        }
        node.title = node_name == "Miner/Miner" ? "Miner" : sanitizeName(miner_data.className)
        node.description = node.title
        node.prototype.onExecute = function () {
            let selected_resource = this.properties.recipe
            if (selected_resource === "undefined") {
                return
            }
            let output_mk_modifier = this.properties.mark
            if (miner_data.allowLiquids) {
                console.log(`-- ${this.title} has output liquids ${selected_resource} for output index 0`)
                let output_liquid: TransferLiquid = new TransferLiquid(selected_resource, (this.properties.speed / 100.0) * output_mk_modifier)
                this.outputs[0].name = output_liquid.toString()
                this.setOutputData(0, output_liquid)
            } else {
                console.log(`-- ${this.title} has output items ${selected_resource} for output index 0`)
                let output_item: Transfer = new Transfer([new TransferItem(selected_resource, (this.properties.speed / 100.0) * output_mk_modifier)])
                this.outputs[0].name = output_item.toString()
                this.setOutputData(0, output_item)
            }
        }
        LiteGraph.registerNodeType(node_name, node)
    }
}

export default createSatisfactoryNodes;