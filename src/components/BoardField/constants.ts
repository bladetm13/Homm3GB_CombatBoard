/**
 * Unit card assets, generated from the `assets/units/<type>/` folders.
 *
 * An enum value is the file's path relative to `assets/units/`, extension
 * included, so it doubles as the asset lookup key — see `unitAssets.ts`. Keys
 * drop the `units-<type>-<tier>-` prefix, since the type is already the enum
 * name and the tier is implied by the file it points at.
 *
 * Names on disk are not uniform: the prefix inside a file does not always match
 * its folder (`neutral_azure` holds `units-neutral-azure-*`), the size suffix is
 * `_`-separated everywhere except `necropolis`, and that folder is the only one
 * shipping `.png`. Keys are therefore derived from the file names, never
 * composed from the folder.
 *
 * Three folders are not units at all and say so in their own prefix: `walls`
 * holds the siege obstacles (`obstacles-walls-*`), `backs` holds one card back
 * per deck (`backs-deck-*`), and `war_machines` holds the siege machines
 * (`war_machines-machine-*`). `unitLabel` drops the first two dash-separated segments
 * whatever they are, so both prefixes need no special handling — but a name has
 * to have a third segment to be left with anything, which is why the backs are
 * `backs-deck-neutral_azure` and not `units-neutral-azure-back`.
 */

export enum UNIT_TYPE {
  BACKS = 'backs',
  CASTLE = 'castle',
  CONFLUX = 'conflux',
  COVE = 'cove',
  CREATURE_BANKS = 'creature_banks',
  DUNGEON = 'dungeon',
  FORTRESS = 'fortress',
  INFERNO = 'inferno',
  NECROPOLIS = 'necropolis',
  NEUTRAL_AZURE = 'neutral_azure',
  NEUTRAL_BRONZE = 'neutral_bronze',
  NEUTRAL_GOLDEN = 'neutral_golden',
  NEUTRAL_SILVER = 'neutral_silver',
  RAMPART = 'rampart',
  STRONGHOLD = 'stronghold',
  SUMMONED = 'summoned',
  TOWER = 'tower',
  WALLS = 'walls',
  WAR_MACHINES = 'war_machines',
}

/** Group headings, for the unit picker. */
export const UNIT_TYPE_LABEL: Record<UNIT_TYPE, string> = {
  [UNIT_TYPE.BACKS]: 'Card Backs',
  [UNIT_TYPE.CASTLE]: 'Castle',
  [UNIT_TYPE.CONFLUX]: 'Conflux',
  [UNIT_TYPE.COVE]: 'Cove',
  [UNIT_TYPE.CREATURE_BANKS]: 'Creature Banks',
  [UNIT_TYPE.DUNGEON]: 'Dungeon',
  [UNIT_TYPE.FORTRESS]: 'Fortress',
  [UNIT_TYPE.INFERNO]: 'Inferno',
  [UNIT_TYPE.NECROPOLIS]: 'Necropolis',
  [UNIT_TYPE.NEUTRAL_AZURE]: 'Neutral — Azure',
  [UNIT_TYPE.NEUTRAL_BRONZE]: 'Neutral — Bronze',
  [UNIT_TYPE.NEUTRAL_GOLDEN]: 'Neutral — Golden',
  [UNIT_TYPE.NEUTRAL_SILVER]: 'Neutral — Silver',
  [UNIT_TYPE.RAMPART]: 'Rampart',
  [UNIT_TYPE.STRONGHOLD]: 'Stronghold',
  [UNIT_TYPE.SUMMONED]: 'Summoned',
  [UNIT_TYPE.TOWER]: 'Tower',
  [UNIT_TYPE.WALLS]: 'Obstacles',
  [UNIT_TYPE.WAR_MACHINES]: 'War Machines',
}

/** Card backs, one per deck. Not placeable pieces — the reverse side. */
export enum UNITS_BACKS {
  NEUTRAL_AZURE = 'backs/backs-deck-neutral_azure.webp',
  NEUTRAL_BRONZE = 'backs/backs-deck-neutral_bronze.webp',
  NEUTRAL_GOLDEN = 'backs/backs-deck-neutral_golden.webp',
  NEUTRAL_SILVER = 'backs/backs-deck-neutral_silver.webp',
  CREATURE_BANKS = 'backs/backs-deck-creature_banks.webp',
  MIGHT_AND_MAGIC = 'backs/backs-deck-might_and_magic.webp',
  TOWER_BACK = 'backs/backs-deck-tower_back.webp',
}

export enum UNITS_CASTLE {
  HALBERDIERS_FEW = 'castle/units-castle-bronze-halberdiers_few.webp',
  HALBERDIERS_PACK = 'castle/units-castle-bronze-halberdiers_pack.webp',
  MARKSMEN_FEW = 'castle/units-castle-bronze-marksmen_few.webp',
  MARKSMEN_PACK = 'castle/units-castle-bronze-marksmen_pack.webp',
  GRIFFINS_FEW = 'castle/units-castle-bronze-griffins_few.webp',
  GRIFFINS_PACK = 'castle/units-castle-bronze-griffins_pack.webp',
  CRUSADERS_FEW = 'castle/units-castle-silver-crusaders_few.webp',
  CRUSADERS_PACK = 'castle/units-castle-silver-crusaders_pack.webp',
  ZEALOTS_FEW = 'castle/units-castle-silver-zealots_few.webp',
  ZEALOTS_PACK = 'castle/units-castle-silver-zealots_pack.webp',
  CHAMPIONS_FEW = 'castle/units-castle-golden-champions_few.webp',
  CHAMPIONS_PACK = 'castle/units-castle-golden-champions_pack.webp',
  ARCHANGELS_FEW = 'castle/units-castle-golden-archangels_few.webp',
  ARCHANGELS_PACK = 'castle/units-castle-golden-archangels_pack.webp',
}

export enum UNITS_CONFLUX {
  SPRITES_FEW = 'conflux/units-conflux-bronze-sprites_few.webp',
  SPRITES_PACK = 'conflux/units-conflux-bronze-sprites_pack.webp',
  STORM_ELEMENTALS_FEW = 'conflux/units-conflux-bronze-storm_elementals_few.webp',
  STORM_ELEMENTALS_PACK = 'conflux/units-conflux-bronze-storm_elementals_pack.webp',
  ICE_ELEMENTALS_FEW = 'conflux/units-conflux-bronze-ice_elementals_few.webp',
  ICE_ELEMENTALS_PACK = 'conflux/units-conflux-bronze-ice_elementals_pack.webp',
  ENERGY_ELEMENTALS_FEW = 'conflux/units-conflux-silver-energy_elementals_few.webp',
  ENERGY_ELEMENTALS_PACK = 'conflux/units-conflux-silver-energy_elementals_pack.webp',
  MAGMA_ELEMENTALS_FEW = 'conflux/units-conflux-silver-magma_elementals_few.webp',
  MAGMA_ELEMENTALS_PACK = 'conflux/units-conflux-silver-magma_elementals_pack.webp',
  MAGIC_ELEMENTALS_FEW = 'conflux/units-conflux-golden-magic_elementals_few.webp',
  MAGIC_ELEMENTALS_PACK = 'conflux/units-conflux-golden-magic_elementals_pack.webp',
  PHOENIXES_FEW = 'conflux/units-conflux-golden-phoenixes_few.webp',
  PHOENIXES_PACK = 'conflux/units-conflux-golden-phoenixes_pack.webp',
}

export enum UNITS_COVE {
  OCEANIDS_FEW = 'cove/units-cove-bronze-oceanids_few.webp',
  OCEANIDS_PACK = 'cove/units-cove-bronze-oceanids_pack.webp',
  SEAMEN_FEW = 'cove/units-cove-bronze-seamen_few.webp',
  SEAMEN_PACK = 'cove/units-cove-bronze-seamen_pack.webp',
  SEA_DOGS_FEW = 'cove/units-cove-bronze-sea_dogs_few.webp',
  SEA_DOGS_PACK = 'cove/units-cove-bronze-sea_dogs_pack.webp',
  AYSSIDS_FEW = 'cove/units-cove-silver-ayssids_few.webp',
  AYSSIDS_PACK = 'cove/units-cove-silver-ayssids_pack.webp',
  SORCERESSES_FEW = 'cove/units-cove-silver-sorceresses_few.webp',
  SORCERESSES_PACK = 'cove/units-cove-silver-sorceresses_pack.webp',
  NIX_FEW = 'cove/units-cove-golden-nix_few.webp',
  NIX_PACK = 'cove/units-cove-golden-nix_pack.webp',
  HASPIDS_FEW = 'cove/units-cove-golden-haspids_few.webp',
  HASPIDS_PACK = 'cove/units-cove-golden-haspids_pack.webp',
}

export enum UNITS_CREATURE_BANKS {
  IMP_CACHE_FAMILIARS = 'creature_banks/creature_banks-imp_cache-familiars.webp',
  CRYPT_SKELETONS = 'creature_banks/creature_banks-crypt-skeletons.webp',
  CRYPT_ZOMBIES = 'creature_banks/creature_banks-crypt-zombies.webp',
  CRYPT_WRAITHS = 'creature_banks/creature_banks-crypt-wraiths.webp',
  CRYPT_VAMPIRES = 'creature_banks/creature_banks-crypt-vampires.webp',
  DWARVEN_TREASURY_DWARVES = 'creature_banks/creature_banks-dwarven_treasury-dwarves.webp',
  MEDUSA_STORES_MEDUSAS = 'creature_banks/creature_banks-medusa_stores-medusas.webp',
  DRAGON_FLY_HIVE_DRAGON_FLIES = 'creature_banks/creature_banks-dragon_fly_hive-dragon_flies.webp',
  DERELICT_SHIP_WATER_ELEMENTALS = 'creature_banks/creature_banks-derelict_ship-water_elementals.webp',
  PYRAMID_GOLD_GOLEMS = 'creature_banks/creature_banks-pyramid-gold_golems.webp',
  PYRAMID_DIAMOND_GOLEMS = 'creature_banks/creature_banks-pyramid-diamond_golems.webp',
  GRIFFIN_CONSERVATORY_GRIFFINS = 'creature_banks/creature_banks-griffin_conservatory-griffins.webp',
  NAGA_BANK_NAGAS = 'creature_banks/creature_banks-naga_bank-nagas.webp',
  CYCLOPS_STOCKPILE_CYCLOPES = 'creature_banks/creature_banks-cyclops_stockpile-cyclopes.webp',
  DRAGON_UTOPIA_BLACK_DRAGONS = 'creature_banks/creature_banks-dragon_utopia-black_dragons.webp',
  DRAGON_UTOPIA_GOLD_DRAGONS = 'creature_banks/creature_banks-dragon_utopia-gold_dragons.webp',
  DRAGON_UTOPIA_FAERIE_DRAGONS = 'creature_banks/creature_banks-dragon_utopia-faerie_dragons.webp',
  DRAGON_UTOPIA_CRYSTAL_DRAGONS = 'creature_banks/creature_banks-dragon_utopia-crystal_dragons.webp',
}

export enum UNITS_DUNGEON {
  TROGLODYTES_FEW = 'dungeon/units-dungeon-bronze-troglodytes_few.webp',
  TROGLODYTES_PACK = 'dungeon/units-dungeon-bronze-troglodytes_pack.webp',
  HARPIES_FEW = 'dungeon/units-dungeon-bronze-harpies_few.webp',
  HARPIES_PACK = 'dungeon/units-dungeon-bronze-harpies_pack.webp',
  EVIL_EYES_FEW = 'dungeon/units-dungeon-bronze-evil_eyes_few.webp',
  EVIL_EYES_PACK = 'dungeon/units-dungeon-bronze-evil_eyes_pack.webp',
  MEDUSAS_FEW = 'dungeon/units-dungeon-silver-medusas_few.webp',
  MEDUSAS_PACK = 'dungeon/units-dungeon-silver-medusas_pack.webp',
  MINOTAURS_FEW = 'dungeon/units-dungeon-silver-minotaurs_few.webp',
  MINOTAURS_PACK = 'dungeon/units-dungeon-silver-minotaurs_pack.webp',
  MANTICORES_FEW = 'dungeon/units-dungeon-golden-manticores_few.webp',
  MANTICORES_PACK = 'dungeon/units-dungeon-golden-manticores_pack.webp',
  MANTICORES_ALTERNATIVE_FEW = 'dungeon/units-dungeon-golden-manticores-alternative_few.webp',
  MANTICORES_ALTERNATIVE_PACK = 'dungeon/units-dungeon-golden-manticores-alternative_pack.webp',
  BLACK_DRAGONS_FEW = 'dungeon/units-dungeon-golden-black_dragons_few.webp',
  BLACK_DRAGONS_PACK = 'dungeon/units-dungeon-golden-black_dragons_pack.webp',
}

export enum UNITS_FORTRESS {
  GNOLLS_FEW = 'fortress/units-fortress-bronze-gnolls_few.webp',
  GNOLLS_PACK = 'fortress/units-fortress-bronze-gnolls_pack.webp',
  LIZARDMEN_FEW = 'fortress/units-fortress-bronze-lizardmen_few.webp',
  LIZARDMEN_PACK = 'fortress/units-fortress-bronze-lizardmen_pack.webp',
  DRAGON_FLIES_FEW = 'fortress/units-fortress-bronze-dragon-flies_few.webp',
  DRAGON_FLIES_PACK = 'fortress/units-fortress-bronze-dragon-flies_pack.webp',
  BASILISKS_FEW = 'fortress/units-fortress-silver-basilisks_few.webp',
  BASILISKS_PACK = 'fortress/units-fortress-silver-basilisks_pack.webp',
  GORGONS_FEW = 'fortress/units-fortress-silver-gorgons_few.webp',
  GORGONS_PACK = 'fortress/units-fortress-silver-gorgons_pack.webp',
  WYVERNS_FEW = 'fortress/units-fortress-golden-wyverns_few.webp',
  WYVERNS_PACK = 'fortress/units-fortress-golden-wyverns_pack.webp',
  HYDRAS_FEW = 'fortress/units-fortress-golden-hydras_few.webp',
  HYDRAS_PACK = 'fortress/units-fortress-golden-hydras_pack.webp',
}

export enum UNITS_INFERNO {
  FAMILIARS_FEW = 'inferno/units-inferno-bronze-familiars_few.webp',
  FAMILIARS_PACK = 'inferno/units-inferno-bronze-familiars_pack.webp',
  MAGOGS_FEW = 'inferno/units-inferno-bronze-magogs_few.webp',
  MAGOGS_PACK = 'inferno/units-inferno-bronze-magogs_pack.webp',
  CERBERI_FEW = 'inferno/units-inferno-bronze-cerberi_few.webp',
  CERBERI_PACK = 'inferno/units-inferno-bronze-cerberi_pack.webp',
  DEMONS_FEW = 'inferno/units-inferno-silver-demons_few.webp',
  DEMONS_PACK = 'inferno/units-inferno-silver-demons_pack.webp',
  PIT_LORDS_FEW = 'inferno/units-inferno-silver-pit_lords_few.webp',
  PIT_LORDS_PACK = 'inferno/units-inferno-silver-pit_lords_pack.webp',
  EFREET_FEW = 'inferno/units-inferno-golden-efreet_few.webp',
  EFREET_PACK = 'inferno/units-inferno-golden-efreet_pack.webp',
  ARCH_DEVILS_FEW = 'inferno/units-inferno-golden-arch_devils_few.webp',
  ARCH_DEVILS_PACK = 'inferno/units-inferno-golden-arch_devils_pack.webp',
}

export enum UNITS_NECROPOLIS {
  SKELETONS_FEW = 'necropolis/units-necropolis-bronze-skeletons_few.webp',
  SKELETONS_PACK = 'necropolis/units-necropolis-bronze-skeletons_pack.webp',
  ZOMBIES_FEW = 'necropolis/units-necropolis-bronze-zombies_few.webp',
  ZOMBIES_PACK = 'necropolis/units-necropolis-bronze-zombies_pack.webp',
  WRAITHS_FEW = 'necropolis/units-necropolis-bronze-wraiths_few.webp',
  WRAITHS_PACK = 'necropolis/units-necropolis-bronze-wraiths_pack.webp',
  VAMPIRES_FEW = 'necropolis/units-necropolis-silver-vampires_few.webp',
  VAMPIRES_PACK = 'necropolis/units-necropolis-silver-vampires_pack.webp',
  LICHES_FEW = 'necropolis/units-necropolis-silver-liches_few.webp',
  LICHES_PACK = 'necropolis/units-necropolis-silver-liches_pack.webp',
  DREAD_KNIGHTS_FEW = 'necropolis/units-necropolis-golden-dread_knights_few.webp',
  DREAD_KNIGHTS_PACK = 'necropolis/units-necropolis-golden-dread_knights_pack.webp',
  GHOST_DRAGONS_FEW = 'necropolis/units-necropolis-golden-ghost_dragons_few.webp',
  GHOST_DRAGONS_PACK = 'necropolis/units-necropolis-golden-ghost_dragons_pack.webp',
}

export enum UNITS_NEUTRAL_AZURE {
  GOLD_DRAGONS = 'neutral_azure/units-neutral-azure-gold_dragons.webp',
  HYDRAS = 'neutral_azure/units-neutral-azure-hydras.webp',
  TITANS = 'neutral_azure/units-neutral-azure-titans.webp',
  PHOENIXES = 'neutral_azure/units-neutral-azure-phoenixes.webp',
  FAERIE_DRAGONS = 'neutral_azure/units-neutral-azure-faerie_dragons.webp',
  CRYSTAL_DRAGONS = 'neutral_azure/units-neutral-azure-crystal_dragons.webp',
  RUST_DRAGONS = 'neutral_azure/units-neutral-azure-rust_dragons.webp',
  AZURE_DRAGONS = 'neutral_azure/units-neutral-azure-azure_dragons.webp',
}

export enum UNITS_NEUTRAL_BRONZE {
  HALBERDIERS = 'neutral_bronze/units-neutral-bronze-halberdiers.webp',
  MARKSMEN = 'neutral_bronze/units-neutral-bronze-marksmen.webp',
  GRIFFINS = 'neutral_bronze/units-neutral-bronze-griffins.webp',
  SKELETONS = 'neutral_bronze/units-neutral-bronze-skeletons.webp',
  ZOMBIES = 'neutral_bronze/units-neutral-bronze-zombies.webp',
  WRAITHS = 'neutral_bronze/units-neutral-bronze-wraiths.webp',
  TROGLODYTES = 'neutral_bronze/units-neutral-bronze-troglodytes.webp',
  HARPIES = 'neutral_bronze/units-neutral-bronze-harpies.webp',
  EVIL_EYES = 'neutral_bronze/units-neutral-bronze-evil_eyes.webp',
  CENTAURS = 'neutral_bronze/units-neutral-bronze-centaurs.webp',
  DWARVES = 'neutral_bronze/units-neutral-bronze-dwarves.webp',
  ELVES = 'neutral_bronze/units-neutral-bronze-elves.webp',
  FAMILIARS = 'neutral_bronze/units-neutral-bronze-familiars.webp',
  MAGOGS = 'neutral_bronze/units-neutral-bronze-magogs.webp',
  CERBERI = 'neutral_bronze/units-neutral-bronze-cerberi.webp',
  GNOLLS = 'neutral_bronze/units-neutral-bronze-gnolls.webp',
  LIZARDMEN = 'neutral_bronze/units-neutral-bronze-lizardmen.webp',
  DRAGON_FLIES = 'neutral_bronze/units-neutral-bronze-dragon_flies.webp',
  GREMLINS = 'neutral_bronze/units-neutral-bronze-gremlins.webp',
  GARGOYLES = 'neutral_bronze/units-neutral-bronze-gargoyles.webp',
  IRON_GOLEMS = 'neutral_bronze/units-neutral-bronze-iron_golems.webp',
  OCEANIDS = 'neutral_bronze/units-neutral-bronze-oceanids.webp',
  SEAMEN = 'neutral_bronze/units-neutral-bronze-seamen.webp',
  SEA_DOGS = 'neutral_bronze/units-neutral-bronze-sea_dogs.webp',
  SPRITES = 'neutral_bronze/units-neutral-bronze-sprites.webp',
  AIR_ELEMENTAL = 'neutral_bronze/units-neutral-bronze-air_elemental.webp',
  STORM_ELEMENTALS = 'neutral_bronze/units-neutral-bronze-storm_elementals.webp',
  ICE_ELEMENTALS = 'neutral_bronze/units-neutral-bronze-ice_elementals.webp',
  GOBLINS = 'neutral_bronze/units-neutral-bronze-goblins.webp',
  WOLF_RAIDERS = 'neutral_bronze/units-neutral-bronze-wolf_raiders.webp',
  ORCS = 'neutral_bronze/units-neutral-bronze-orcs.webp',
  PEASANTS = 'neutral_bronze/units-neutral-bronze-peasants.webp',
  HALFLINGS = 'neutral_bronze/units-neutral-bronze-halflings.webp',
  BOARS = 'neutral_bronze/units-neutral-bronze-boars.webp',
  LEPRECHAUN = 'neutral_bronze/units-neutral-bronze-leprechaun.webp',
  ROGUES = 'neutral_bronze/units-neutral-bronze-rogues.webp',
}

export enum UNITS_NEUTRAL_GOLDEN {
  CHAMPIONS = 'neutral_golden/units-neutral-golden-champions.webp',
  ARCHANGELS = 'neutral_golden/units-neutral-golden-archangels.webp',
  DREAD_KNIGHTS = 'neutral_golden/units-neutral-golden-dread_knights.webp',
  GHOST_DRAGONS = 'neutral_golden/units-neutral-golden-ghost_dragons.webp',
  MANTICORES = 'neutral_golden/units-neutral-golden-manticores.webp',
  BLACK_DRAGONS = 'neutral_golden/units-neutral-golden-black_dragons.webp',
  UNICORNS = 'neutral_golden/units-neutral-golden-unicorns.webp',
  EFREET = 'neutral_golden/units-neutral-golden-efreet.webp',
  ARCH_DEVILS = 'neutral_golden/units-neutral-golden-arch_devils.webp',
  WYVERNS = 'neutral_golden/units-neutral-golden-wyverns.webp',
  NAGAS = 'neutral_golden/units-neutral-golden-nagas.webp',
  NIX = 'neutral_golden/units-neutral-golden-nix.webp',
  HASPIDS = 'neutral_golden/units-neutral-golden-haspids.webp',
  EARTH_ELEMENTAL = 'neutral_golden/units-neutral-golden-earth_elemental.webp',
  MAGIC_ELEMENTALS = 'neutral_golden/units-neutral-golden-magic_elementals.webp',
  CYCLOPES = 'neutral_golden/units-neutral-golden-cyclopes.webp',
  BEHEMOTHS = 'neutral_golden/units-neutral-golden-behemoths.webp',
  TROLLS = 'neutral_golden/units-neutral-golden-trolls.webp',
  GOLD_GOLEMS = 'neutral_golden/units-neutral-golden-gold_golems.webp',
  DIAMOND_GOLEMS = 'neutral_golden/units-neutral-golden-diamond_golems.webp',
  ENCHANTERS = 'neutral_golden/units-neutral-golden-enchanters.webp',
}

export enum UNITS_NEUTRAL_SILVER {
  CRUSADERS = 'neutral_silver/units-neutral-silver-crusaders.webp',
  ZEALOTS = 'neutral_silver/units-neutral-silver-zealots.webp',
  VAMPIRES = 'neutral_silver/units-neutral-silver-vampires.webp',
  LICHES = 'neutral_silver/units-neutral-silver-liches.webp',
  MEDUSAS = 'neutral_silver/units-neutral-silver-medusas.webp',
  MINOTAURS = 'neutral_silver/units-neutral-silver-minotaurs.webp',
  DENDROIDS = 'neutral_silver/units-neutral-silver-dendroids.webp',
  PEGASI = 'neutral_silver/units-neutral-silver-pegasi.webp',
  DEMONS = 'neutral_silver/units-neutral-silver-demons.webp',
  PIT_LORDS = 'neutral_silver/units-neutral-silver-pit_lords.webp',
  BASILISKS = 'neutral_silver/units-neutral-silver-basilisks.webp',
  GORGONS = 'neutral_silver/units-neutral-silver-gorgons.webp',
  MAGIS = 'neutral_silver/units-neutral-silver-magis.webp',
  GENIES = 'neutral_silver/units-neutral-silver-genies.webp',
  AYSSIDS = 'neutral_silver/units-neutral-silver-ayssids.webp',
  SORCERESSES = 'neutral_silver/units-neutral-silver-sorceresses.webp',
  WATER_ELEMENTAL = 'neutral_silver/units-neutral-silver-water_elemental.webp',
  FIRE_ELEMENTAL = 'neutral_silver/units-neutral-silver-fire_elemental.webp',
  ENERGY_ELEMENTALS = 'neutral_silver/units-neutral-silver-energy_elementals.webp',
  MAGMA_ELEMENTALS = 'neutral_silver/units-neutral-silver-magma_elementals.webp',
  OGRES = 'neutral_silver/units-neutral-silver-ogres.webp',
  THUNDERBIRDS = 'neutral_silver/units-neutral-silver-thunderbirds.webp',
  SATYRS = 'neutral_silver/units-neutral-silver-satyrs.webp',
  MUMMIES = 'neutral_silver/units-neutral-silver-mummies.webp',
  NOMADS = 'neutral_silver/units-neutral-silver-nomads.webp',
  SHARPSHOOTERS = 'neutral_silver/units-neutral-silver-sharpshooters.webp',
  FANGARM = 'neutral_silver/units-neutral-silver-fangarm.webp',
  STEEL_GOLEMS = 'neutral_silver/units-neutral-silver-steel_golems.webp',
}

export enum UNITS_RAMPART {
  CENTAURS_FEW = 'rampart/units-rampart-bronze-centaurs_few.webp',
  CENTAURS_PACK = 'rampart/units-rampart-bronze-centaurs_pack.webp',
  DWARVES_FEW = 'rampart/units-rampart-bronze-dwarves_few.webp',
  DWARVES_PACK = 'rampart/units-rampart-bronze-dwarves_pack.webp',
  ELVES_FEW = 'rampart/units-rampart-bronze-elves_few.webp',
  ELVES_PACK = 'rampart/units-rampart-bronze-elves_pack.webp',
  DENDROIDS_FEW = 'rampart/units-rampart-silver-dendroids_few.webp',
  DENDROIDS_PACK = 'rampart/units-rampart-silver-dendroids_pack.webp',
  PEGASI_FEW = 'rampart/units-rampart-silver-pegasi_few.webp',
  PEGASI_PACK = 'rampart/units-rampart-silver-pegasi_pack.webp',
  UNICORNS_FEW = 'rampart/units-rampart-golden-unicorns_few.webp',
  UNICORNS_PACK = 'rampart/units-rampart-golden-unicorns_pack.webp',
  GOLD_DRAGONS_FEW = 'rampart/units-rampart-golden-gold_dragons_few.webp',
  GOLD_DRAGONS_PACK = 'rampart/units-rampart-golden-gold_dragons_pack.webp',
}

export enum UNITS_STRONGHOLD {
  GOBLINS_FEW = 'stronghold/units-stronghold-bronze-goblins_few.webp',
  GOBLINS_PACK = 'stronghold/units-stronghold-bronze-goblins_pack.webp',
  WOLF_RAIDERS_FEW = 'stronghold/units-stronghold-bronze-wolf_raiders_few.webp',
  WOLF_RAIDERS_PACK = 'stronghold/units-stronghold-bronze-wolf_raiders_pack.webp',
  ORCS_FEW = 'stronghold/units-stronghold-bronze-orcs_few.webp',
  ORCS_PACK = 'stronghold/units-stronghold-bronze-orcs_pack.webp',
  OGRES_FEW = 'stronghold/units-stronghold-silver-ogres_few.webp',
  OGRES_PACK = 'stronghold/units-stronghold-silver-ogres_pack.webp',
  THUNDERBIRDS_FEW = 'stronghold/units-stronghold-silver-thunderbirds_few.webp',
  THUNDERBIRDS_PACK = 'stronghold/units-stronghold-silver-thunderbirds_pack.webp',
  CYCLOPES_FEW = 'stronghold/units-stronghold-golden-cyclopes_few.webp',
  CYCLOPES_PACK = 'stronghold/units-stronghold-golden-cyclopes_pack.webp',
  BEHEMOTHS_FEW = 'stronghold/units-stronghold-golden-behemoths_few.webp',
  BEHEMOTHS_PACK = 'stronghold/units-stronghold-golden-behemoths_pack.webp',
}

export enum UNITS_SUMMONED {
  AIR_ELEMENTALS_FEW = 'summoned/units-summoned-bronze-air_elementals_few.webp',
  AIR_ELEMENTALS_PACK = 'summoned/units-summoned-bronze-air_elementals_pack.webp',
  WATER_ELEMENTALS_FEW = 'summoned/units-summoned-bronze-water_elementals_few.webp',
  WATER_ELEMENTALS_PACK = 'summoned/units-summoned-bronze-water_elementals_pack.webp',
  FIRE_ELEMENTALS_FEW = 'summoned/units-summoned-bronze-fire_elementals_few.webp',
  FIRE_ELEMENTALS_PACK = 'summoned/units-summoned-bronze-fire_elementals_pack.webp',
  EARTH_ELEMENTALS_FEW = 'summoned/units-summoned-bronze-earth_elementals_few.webp',
  EARTH_ELEMENTALS_PACK = 'summoned/units-summoned-bronze-earth_elementals_pack.webp',
}

export enum UNITS_TOWER {
  GREMLINS_FEW = 'tower/units-tower-bronze-gremlins_few.webp',
  GREMLINS_PACK = 'tower/units-tower-bronze-gremlins_pack.webp',
  GARGOYLES_FEW = 'tower/units-tower-bronze-gargoyles_few.webp',
  GARGOYLES_PACK = 'tower/units-tower-bronze-gargoyles_pack.webp',
  IRON_GOLEMS_FEW = 'tower/units-tower-bronze-iron_golems_few.webp',
  IRON_GOLEMS_PACK = 'tower/units-tower-bronze-iron_golems_pack.webp',
  MAGIS_FEW = 'tower/units-tower-silver-magis_few.webp',
  MAGIS_PACK = 'tower/units-tower-silver-magis_pack.webp',
  GENIES_FEW = 'tower/units-tower-silver-genies_few.webp',
  GENIES_PACK = 'tower/units-tower-silver-genies_pack.webp',
  NAGAS_FEW = 'tower/units-tower-golden-nagas_few.webp',
  NAGAS_PACK = 'tower/units-tower-golden-nagas_pack.webp',
  TITANS_FEW = 'tower/units-tower-golden-titans_few.webp',
  TITANS_PACK = 'tower/units-tower-golden-titans_pack.webp',
}

/** Siege obstacles, not units — each piece next to its destroyed state. */
export enum UNITS_WALLS {
  WALL = 'walls/obstacles-walls-wall.webp',
  WALL_BROKEN = 'walls/obstacles-walls-wall_broken.webp',
  GATE = 'walls/obstacles-walls-gate.webp',
  GATE_BROKEN = 'walls/obstacles-walls-gate_broken.webp',
  TOWER = 'walls/obstacles-walls-tower.webp',
}

export enum UNITS_WAR_MACHINES {
  BALLISTA = 'war_machines/war_machines-machine-ballista.webp',
  AMMO_CART = 'war_machines/war_machines-machine-ammo_cart.webp',
  FIRST_AID_TENT = 'war_machines/war_machines-machine-first_aid_tent.webp',
  CATAPULT = 'war_machines/war_machines-machine-catapult.webp',
  CANNON = 'war_machines/war_machines-machine-cannon.webp',
}

/** Every unit enum, keyed by its type. Drives the picker's order. */
export const UNITS = {
  [UNIT_TYPE.CASTLE]: UNITS_CASTLE,
  [UNIT_TYPE.NECROPOLIS]: UNITS_NECROPOLIS,
  [UNIT_TYPE.DUNGEON]: UNITS_DUNGEON,
  [UNIT_TYPE.RAMPART]: UNITS_RAMPART,
  [UNIT_TYPE.INFERNO]: UNITS_INFERNO,
  [UNIT_TYPE.FORTRESS]: UNITS_FORTRESS,
  [UNIT_TYPE.TOWER]: UNITS_TOWER,
  [UNIT_TYPE.COVE]: UNITS_COVE,
  [UNIT_TYPE.CONFLUX]: UNITS_CONFLUX,
  [UNIT_TYPE.STRONGHOLD]: UNITS_STRONGHOLD,
  [UNIT_TYPE.NEUTRAL_BRONZE]: UNITS_NEUTRAL_BRONZE,
  [UNIT_TYPE.NEUTRAL_SILVER]: UNITS_NEUTRAL_SILVER,
  [UNIT_TYPE.NEUTRAL_GOLDEN]: UNITS_NEUTRAL_GOLDEN,
  [UNIT_TYPE.NEUTRAL_AZURE]: UNITS_NEUTRAL_AZURE,
  [UNIT_TYPE.CREATURE_BANKS]: UNITS_CREATURE_BANKS,
  [UNIT_TYPE.SUMMONED]: UNITS_SUMMONED,
  [UNIT_TYPE.WAR_MACHINES]: UNITS_WAR_MACHINES,
  [UNIT_TYPE.WALLS]: UNITS_WALLS,
  [UNIT_TYPE.BACKS]: UNITS_BACKS,
} as const

/** Any unit asset path, e.g. `castle/units-castle-bronze-marksmen_few.webp`. */
export type Unit = (typeof UNITS)[keyof typeof UNITS][keyof (typeof UNITS)[keyof typeof UNITS]]
