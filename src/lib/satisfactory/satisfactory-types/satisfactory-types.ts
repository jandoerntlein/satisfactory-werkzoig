// Resource: ["Iron", "Copper", "Limestone", "Coal", "Caterium", "Raw Quartz", "Sulfur", "Bauxite", "Uranium", "SAM"]

export type RecipeResource = {
    item: string;
    amount: number;
};

export type Recipe = {
    slug: string;
    name: string;
    className: string;
    alternate: boolean;
    time: number;
    inHand: boolean;
    forBuilding: boolean;
    inWorkshop: boolean;
    inMachine: boolean;
    manualTimeMultiplier: number;
    ingredients: RecipeResource[];
    products: RecipeResource[];
    isVariablePower: boolean;
    minPower: number;
    maxPower: number;
    producedIn: string[];
};

export type Recipes = {
    [key: string]: Recipe;
};

export type Building = {
    slug: string;
    name: string;
    description: string;
    className: string;
    categories: string[];
    buildMenuPriority: number;
    metadata: {
        powerConsumption: number;
        powerConsumptionExponent: number;
        manufacturingSpeed: number;
    };
    size: {
        width: number;
        height: number;
        length: number;
    }
};

export type Buildings = {
    [key: string]: Building;
};

export type Miner = {
    className: string;
    allowedResources: string[];
    allowLiquids: boolean;
    allowSolids: boolean;
    itemsPerCycle: number;
    extractCycleTime: number;
}

export type Miners = {
    [key: string]: Miner;
}

export type Resource = {
    item: string;
    pingColor: string;
    speed: number;
}

export type Resources = {
    [key: string]: Resource;
}

export type Item = {
    slug: string;
    name: string;
    description: string;
    sinkPoints: number;
    className: string;
    stackSize: number;
    energyValue: number;
    radioactiveDecay: number;
    liquid: boolean;
    // Add a call signature
    (): void;
}

export type Items = {
    [key: string]: Item;
}