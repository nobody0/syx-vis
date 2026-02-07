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
