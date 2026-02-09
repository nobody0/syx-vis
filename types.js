// JSDoc type definitions for Songs of Syx Visualizer
// This file is NOT imported at runtime — it exists purely for IDE/type-checker support.
// VS Code and tsc will pick up these types for autocomplete and hover docs.

// Empty export makes this a module (required for import() in JSDoc @type annotations)
export {};

/**
 * @typedef {Object} Resource
 * @property {string} id
 * @property {string} name
 * @property {"material"|"food"|"drink"|"military"} category
 * @property {string[]} tags
 * @property {number} degradeRate
 * @property {string} [desc]
 * @property {number} [priceCap]
 * @property {string} [icon]
 */

/**
 * @typedef {Object} RecipeItem
 * @property {string} resource - Resource ID
 * @property {number} amount - Per-worker-per-day rate
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {RecipeItem[]} inputs
 * @property {RecipeItem[]} outputs
 * @property {string} [source] - "curated" for World Map recipes
 * @property {boolean} [manual] - true for cannibal recipes
 */

/**
 * @typedef {Object} TechUnlock
 * @property {string} techTree
 * @property {string} techTreeName
 * @property {string} techId
 * @property {string} techName
 * @property {Object<string,number>} [costs]
 * @property {Object<string,number>} [requiresTechLevel]
 * @property {Object<string,number>} [requiresPopulation]
 */

/**
 * @typedef {Object} BuildingItem
 * @property {RecipeItem[]} costs - Resource costs per furniture piece
 * @property {number[]} stats - Stat contributions (variable length 0-5)
 */

/**
 * @typedef {Object} SpriteVariant
 * @property {boolean} [rotates] - Whether this furniture piece can be rotated
 * @property {number} [fps] - Animation frames per second (omitted if 0)
 * @property {number} [shadowLength] - Shadow projection length
 * @property {number} [shadowHeight] - Shadow height offset
 * @property {boolean} [tint] - Whether the sprite is tinted
 * @property {boolean} [circular] - Whether the animation loops circularly
 * @property {{r: number, g: number, b: number}} [color] - Override color
 * @property {string[]} [frames] - Sprite frame references (e.g. "CHAIRS: 0")
 * @property {*} [resources] - Resource references (rare)
 */

/**
 * @typedef {Object} Sprite
 * @property {string} type - Sprite type key (e.g. "CHAIR_1X1", "TABLE_COMBO")
 * @property {{w: number, h: number}} [size] - Tile size parsed from type name (e.g. {w:1,h:1} from "1X1")
 * @property {SpriteVariant[]} variants - Visual variants/upgrade tiers
 */

/**
 * @typedef {Object} Building
 * @property {string} id
 * @property {string} name
 * @property {"extraction"|"husbandry"|"refining"|"crafting"|"military"|"service"|"trade"|"infrastructure"} category
 * @property {string} [icon]
 * @property {Recipe[]} recipes
 * @property {RecipeItem[]} [constructionCosts]
 * @property {RecipeItem[][]} [upgradeCosts]
 * @property {BuildingItem[]} [items]
 * @property {RecipeItem[]} [areaCosts]
 * @property {number[]} [upgradeBoosts]
 * @property {string} [desc]
 * @property {number} [storage]
 * @property {number} [fulfillment]
 * @property {number} [accidentsPerYear]
 * @property {number} [healthFactor]
 * @property {boolean} [usesTool]
 * @property {boolean} [noise]
 * @property {string} [growable]
 * @property {string} [animal]
 * @property {boolean} [indoors]
 * @property {Object} [climateBonus]
 * @property {boolean} [nightShift]
 * @property {number} [employShiftOffset]
 * @property {number} [serviceRadius]
 * @property {string} [need]
 * @property {boolean|number} [serviceDefaultAccess]
 * @property {number} [serviceDefaultValue]
 * @property {Object<string,number>} [serviceStanding]
 * @property {string[]} [boosting]
 * @property {number} [boostFrom]
 * @property {number} [boostTo]
 * @property {number} [increasePow]
 * @property {number} [popMin]
 * @property {Object<string,number>} [requires]
 * @property {Object<string,number|boolean>} [standing]
 * @property {string|string[]} [floorType]
 * @property {string} [miniColor]
 * @property {TechUnlock} [unlockedBy]
 * @property {Array<TechUnlock & {tier: number}>} [upgradesUnlockedBy]
 * @property {number} [valueDegradePerYear]
 * @property {string} [race]
 * @property {string} [religion]
 * @property {number} [incubationDays]
 * @property {number} [learningSpeed]
 * @property {number|Object<string,number>} [fulfillmentBonus]
 * @property {number} [maxValue]
 * @property {number} [valuePerWorker]
 * @property {number|{BONUS?: number, MAX_EMPLOYEES?: number}} [experienceBonus]
 * @property {string} [projectileResource]
 * @property {string} [equipmentToUse]
 * @property {string} [sacrificeResource]
 * @property {string} [sacrificeType]
 * @property {number} [maxEmployed]
 * @property {number} [fullTrainingDays]
 * @property {number} [degradeRate]
 * @property {string} [extraResource]
 * @property {number} [extraResourceAmount]
 * @property {number} [daysTillGrowth]
 * @property {number} [ripeAtPartOfYear]
 * @property {string} [fence]
 * @property {number} [valueWorkSpeed]
 * @property {number} [sacrificeTime]
 * @property {number} [workTimeInDays]
 * @property {string} [buildingType]
 * @property {string} [racePreference]
 * @property {{fullDays?: number, boost?: number|Object<string,number>}} [training]
 * @property {string[]} [spriteTypes]
 * @property {Sprite[]} [sprites]
 */

/**
 * @typedef {Object} FurnitureTileType
 * @property {boolean} [mustBeReachable] - Tile needs an adjacent walkable tile
 * @property {string} availability - Walkability: ROOM_SOLID, AVOID_PASS, ROOM, SOLID, ENEMY, etc.
 * @property {boolean} [canGoCandle] - Whether a candle/decoration can be placed on this tile
 * @property {number} [data] - Usage tag (e.g. 2=storage, 3=fetch, 4=work for workshops)
 * @property {string} [sprite] - SPRITES key name (e.g. "CHAIR_1X1", "TABLE_COMBO") linking to building sprite data
 */

/**
 * @typedef {Object} FurnitureItem
 * @property {(string|null)[][]} tiles - 2D grid of tile type names (null = empty space)
 * @property {number} multiplier - Cost/stat multiplier for this item variant
 * @property {number} [multiplierStats] - Separate stat multiplier (if different from cost multiplier)
 */

/**
 * @typedef {Object} FurnitureGroup
 * @property {number} min - Minimum items from this group that must be placed
 * @property {number} [max] - Maximum items from this group (null = unlimited)
 * @property {number} rotations - Rotation mode: 0=none, 1=one axis, 3=full (4-way)
 * @property {FurnitureItem[]} items - Available furniture piece variants
 */

/**
 * @typedef {Object} FurnitureStat
 * @property {string} name - Field name from Java constructor (e.g. "priests", "workers", "coziness")
 * @property {"employees"|"services"|"efficiency"|"relative"|"production"|"integer"|"irrigation"|"employeesRelative"|"custom"} type - Stat type category
 */

/**
 * @typedef {Object} FurnitureSet
 * @property {string} id - Constructor type identifier (e.g. "workshop", "canteen")
 * @property {string[]} buildingIds - Building IDs that use this furniture layout
 * @property {boolean} [usesArea] - Whether the room uses area-based placement
 * @property {boolean} [mustBeIndoors] - Whether the room must be indoors
 * @property {boolean} [mustBeOutdoors] - Whether the room must be outdoors
 * @property {FurnitureStat[]} [stats] - Stat definitions in index order (maps to Building items[].stats arrays)
 * @property {Object<string, FurnitureTileType|null>} tileTypes - Tile type definitions (null = empty space)
 * @property {FurnitureGroup[]} groups - Furniture groups (each group is placed independently)
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {"resource"|"building"} type
 * @property {string} name
 * @property {string} category
 * @property {string} [band]
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} from
 * @property {string} to
 * @property {string} recipe
 * @property {string} [recipeId]
 * @property {number} amount
 * @property {"input"|"output"|"construction"|"upgrade"|"equipment"|"ammo"|"sacrifice"|"area"|"synthetic"} direction
 */

/**
 * @typedef {Object} Need
 * @property {string} id
 * @property {string} [name]
 * @property {number} rate
 * @property {number} [event]
 * @property {string} [rateName]
 */

/**
 * @typedef {Object} TechColor
 * @property {number} R
 * @property {number} G
 * @property {number} B
 */

/**
 * @typedef {Object} Tech
 * @property {string} name
 * @property {Object<string,number>} [costs]
 * @property {Object<string,number>} [requires]
 * @property {number} [requiresPopulation]
 * @property {string[]} [unlocksFaction]
 * @property {Object<string,number>} [boosts]
 */

/**
 * @typedef {Object} TechTree
 * @property {string} id
 * @property {string} name
 * @property {TechColor} color
 * @property {Object<string,Tech>} techs
 */

/**
 * @typedef {Object} Equipment
 * @property {string} id
 * @property {"civic"|"battle"|"ranged"} type
 * @property {string} resource
 * @property {number} wearRate
 * @property {number} maxAmount
 * @property {number} arrivalAmount
 * @property {number} defaultTarget
 * @property {number} [amountInGarrison]
 * @property {number} [equipGuards]
 * @property {Object<string,number>} [boost]
 * @property {Object<string,number>} [standing]
 */

/**
 * @typedef {Object} Structure
 * @property {string} id
 * @property {string} [name]
 * @property {string} [resource]
 * @property {number} [resourceAmount]
 * @property {number} [durability]
 * @property {number} [buildTime]
 * @property {number} [preference]
 */

/**
 * @typedef {Object} Floor
 * @property {string} id
 * @property {string} [name]
 * @property {boolean} [isGrass]
 * @property {string} [resource]
 * @property {number} [resourceAmount]
 * @property {number} [speed]
 * @property {number} [durability]
 */

/**
 * @typedef {Object} Fence
 * @property {string} id
 * @property {string} [name]
 * @property {string} [resource]
 * @property {number} [resourceAmount]
 */

/**
 * @typedef {Object} Fortification
 * @property {string} id
 * @property {string} [name]
 * @property {string} [resource]
 * @property {number} [resourceAmount]
 * @property {number} [durability]
 * @property {number} [height]
 */

/**
 * @typedef {Object} Settlement
 * @property {Structure[]} structures
 * @property {Floor[]} floors
 * @property {Fence[]} fences
 * @property {Fortification[]} fortifications
 */

/**
 * @typedef {Object} CityData
 * @property {string} id - Unique city ID ("city_<timestamp>")
 * @property {string} name - User-given city name
 * @property {Object<string, string>} buildingStates - buildingId → "built"|"ignored"
 * @property {Object<string, number>} recipeStates - recipeId → weight
 * @property {Object<string, string>} resourceStates - resourceId → "bought"|"ignored"
 */
