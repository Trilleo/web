/**
 * The TownyMenu wiki (wiki.trilleo.net/townymenu/): pages about TownyMenu, a Paper
 * plugin that puts Towny into chest menus (github.com/Trilleo/TownyMenu). Written
 * pages, created once like every built-in wiki; the menus on them are `::: menu`
 * blocks, built here the way TownyMenu lays out an icon's lore (name, a blank line,
 * description, data blocks, a rule, click hints), with its English text and an
 * example town, Oakhaven, in the nation of Northmark.
 */
import type { BuiltInWiki } from "./seed";

const REPO = "https://github.com/Trilleo/TownyMenu";

/* ---------- building menus ---------- */

interface Icon {
  /** `bell`, `lime_dye x3 glow`. */
  material: string;
  name: string;
  /** Grey text, wrapped at 40 columns as TownyMenu does. */
  description?: string;
  /** Data lines; "" starts a new block. */
  data?: readonly string[];
  actions?: readonly string[];
  /** The wiki page the button opens. */
  to?: string;
}

/** Wraps text with § codes at `width` visible columns, carrying the colour onto each new line. */
export function wrapLore(text: string, width = 40): string[] {
  const lines: string[] = [];
  let line = "";
  let visible = 0;
  let style = "§7";
  for (const word of text.split(" ")) {
    const length = word.replace(/§./g, "").length;
    if (line && visible + 1 + length > width) {
      lines.push(line);
      line = style + word;
      visible = length;
    } else {
      line = line ? `${line} ${word}` : word;
      visible += (visible > 0 ? 1 : 0) + length;
    }
    for (const match of word.matchAll(/§([0-9a-fk-or])/g)) {
      const code = match[1] ?? "";
      if (/[0-9a-f]/.test(code)) style = `§${code}`;
      else if (code === "r") style = "§7";
      else style += `§${code}`;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** One slot line of a `::: menu`. */
export function slotLine(slot: number | string, icon: Icon): string {
  const blocks: string[][] = [];
  if (icon.description) blocks.push(wrapLore(`§7${icon.description}`));
  let block: string[] = [];
  for (const line of icon.data ?? []) {
    if (line === "") {
      if (block.length) blocks.push(block);
      block = [];
    } else block.push(line);
  }
  if (block.length) blocks.push(block);
  const lore = blocks.flatMap((lines, index) =>
    index === 0 ? lines : ["", ...lines],
  );
  if (icon.actions?.length) {
    if (lore.length) lore.push("--");
    lore.push(...icon.actions);
  }
  const parts = [
    icon.material,
    icon.name,
    ...(lore.length ? ["", ...lore] : []),
  ];
  return `${String(slot)}: ${parts.join(" | ")}${icon.to ? ` -> ${icon.to}` : ""}`;
}

/** A `::: menu` block: a chest of `rows`, filled with black glass like TownyMenu's menus. */
export function menuBlock(
  rows: number,
  title: string,
  slots: readonly (readonly [number | string, Icon])[],
): string {
  return [
    `::: menu ${String(rows)} ${title}`,
    "fill: black_stained_glass_pane",
    ...slots.map(([slot, icon]) => slotLine(slot, icon)),
    ":::",
  ].join("\n");
}

const CLICK = {
  open: "§eClick to open!",
  view: "§eClick to view!",
  browse: "§eClick to browse!",
  choose: "§eClick to choose!",
  teleport: "§eClick to teleport!",
  editPermissions: "§eClick to edit permissions!",
  write: "§eClick to write a message!",
  delete: "§cClick to delete!",
  leave: "§cClick to leave!",
  enable: "§eClick to enable!",
  disable: "§eClick to disable!",
} as const;

/** TownyMenu's progress bar: 20 struck-through spaces, then the percentage. */
function bar(current: number, max: number): string {
  const ratio = max <= 0 ? 1 : Math.min(1, current / max);
  const filled = Math.round(ratio * 20);
  return `§2§l§m${" ".repeat(filled)}§f§l§m${" ".repeat(20 - filled)}§r §e${String(Math.round(ratio * 100))}%`;
}

function back(to: string, page?: string): Icon {
  return {
    material: "arrow",
    name: "§aGo Back",
    data: [`§7To ${to}`],
    ...(page ? { to: page } : {}),
  };
}

const CLOSE: Icon = { material: "barrier", name: "§cClose" };

function tutorial(chapter: string, read: number, total: number): Icon {
  return {
    material: "knowledge_book",
    name: "§dTutorial",
    description: "Learn how this menu and the Towny features behind it work.",
    data: [
      `§7Chapter: ${chapter}`,
      `§7Read: §a${String(read)}§7/§a${String(total)}`,
      bar(read, total),
    ],
    actions: [CLICK.open],
    to: "Tutorial",
  };
}

function toggle(
  material: string,
  name: string,
  description: string,
  on: boolean,
): Icon {
  return {
    material: on ? `${material} glow` : material,
    name,
    description,
    data: [`§7Status: ${on ? "§a§lENABLED" : "§c§lDISABLED"}`],
    actions: [on ? CLICK.disable : CLICK.enable],
  };
}

/* ---------- the example world ---------- */

const ROWAN: Icon = {
  material: "player_head",
  name: "§aRowan",
  data: ["§7Town: §6Oakhaven", "§7Ranks: §fMayor", "§aOnline"],
  actions: ["§eClick to view your profile!"],
  to: "Profile menu",
};

const OAKHAVEN_LINES = [
  "§7§oWelcome to Oakhaven! Plots by the river are for sale.",
  "",
  "§7Mayor: §fRowan",
  "§7Residents: §a12",
  "§7Claims: §a18§7/§a24",
  "§7Nation: §bNorthmark",
  "§7Bank: §6$4,250",
  "§7Open: §aYes §8· §7Public: §aYes",
];

const MAIN_MENU = menuBlock(6, "Towny", [
  [4, ROWAN],
  [
    20,
    {
      material: "bell glow",
      name: "§6Oakhaven",
      data: OAKHAVEN_LINES,
      actions: ["§eClick to manage your town!"],
      to: "Town menu",
    },
  ],
  [
    22,
    {
      material: "beacon",
      name: "§bNorthmark",
      data: [
        "§7Leader: §fRowan",
        "§7Capital: §bOakhaven",
        "§7Towns: §a3 §8· §7Residents: §a31",
        "§7Allies: §a1 §8· §7Enemies: §c1",
        "§7Bank: §6$12,900",
      ],
      actions: ["§eClick to manage your nation!"],
      to: "Nation menu",
    },
  ],
  [
    24,
    {
      material: "grass_block",
      name: "§aThis Plot",
      description: "Buy, sell, and configure the §aplot§7 you are standing in.",
      data: ["§7Here: §6Oakhaven"],
      actions: [CLICK.open],
      to: "Plot menu",
    },
  ],
  [
    28,
    {
      material: "clock",
      name: "§6Prices & New Day",
      description:
        "What everything costs on this server, and when the next Towny day starts.",
      data: ["§7Next new day in: §e5h 12m"],
      actions: [CLICK.view],
      to: "Prices and new day",
    },
  ],
  [
    29,
    {
      material: "filled_map",
      name: "§bMap",
      description: "See who owns the §aland§7 around you.",
      actions: [CLICK.open],
      to: "Map",
    },
  ],
  [
    30,
    {
      material: "bell",
      name: "§6Towns",
      description: "Browse and rank every town.",
      actions: [CLICK.browse],
      to: "Directories and leaderboards",
    },
  ],
  [
    31,
    {
      material: "knowledge_book",
      name: "§dTutorial",
      description: "Learn how towns, §aplots§7, nations, and these menus work.",
      actions: [CLICK.open],
      to: "Tutorial",
    },
  ],
  [
    32,
    {
      material: "beacon",
      name: "§bNations",
      description: "Browse and rank every nation.",
      actions: [CLICK.browse],
      to: "Directories and leaderboards",
    },
  ],
  [
    33,
    {
      material: "paper",
      name: "§eInvites §a(1)",
      description: "Town invites, nation invites, and §aalliance§7 requests.",
      actions: [CLICK.view],
      to: "Invites",
    },
  ],
  [
    34,
    {
      material: "lectern",
      name: "§eLeaderboards",
      description: "The biggest and richest towns, nations, and players.",
      actions: [CLICK.view],
      to: "Directories and leaderboards",
    },
  ],
  [49, CLOSE],
  [
    53,
    {
      material: "command_block",
      name: "§cServer Admin",
      description:
        "Configure Towny and manage every town, nation, and resident.",
      actions: [CLICK.open],
      to: "Admin menus",
    },
  ],
]);

const TOWN_MENU = menuBlock(6, "Your Town", [
  [
    4,
    {
      material: "golden_helmet glow",
      name: "§6Oakhaven",
      data: [
        ...OAKHAVEN_LINES,
        "",
        "§7Founded: §eMar 2, 2026",
        "§7Daily tax: §6$5",
        "§7Plot tax: §6$2",
        "§7Outposts: §a1",
        "§7PvP: §cOff §8· §7Mobs: §cOff",
        "§7Fire: §cOff §8· §7Explosions: §cOff",
      ],
      actions: ["§eClick for level, limits, and upkeep!"],
      to: "Town menu#Status page",
    },
  ],
  [
    19,
    {
      material: "player_head",
      name: "§aResidents",
      description: "View residents, manage §eranks§7, and invite players.",
      actions: [CLICK.view],
      to: "Town menu#Residents",
    },
  ],
  [
    20,
    {
      material: "gold_ingot",
      name: "§6Town Bank",
      description: "Deposit, withdraw, and view §6bank§7 history.",
      data: ["§7Balance: §6$4,250"],
      actions: [CLICK.open],
      to: "Banks",
    },
  ],
  [
    21,
    {
      material: "grass_block",
      name: "§aClaims",
      description:
        "Claim and unclaim §aland§7, create outposts, and buy §abonus claims§7.",
      data: ["§7Claimed: §a18§7/§a24", bar(18, 24)],
      actions: [CLICK.open],
      to: "Claiming land",
    },
  ],
  [
    22,
    {
      material: "filled_map",
      name: "§bMap",
      description: "See the §aland§7 around you.",
      actions: [CLICK.open],
      to: "Map",
    },
  ],
  [
    23,
    {
      material: "lever",
      name: "§eTown Settings",
      description:
        "§cPvP§7, mobs, fire, §4explosions§7, open, public, peaceful, and nation zone.",
      actions: [CLICK.open],
      to: "Settings menus#Town settings",
    },
  ],
  [
    24,
    {
      material: "writable_book",
      name: "§eTown Details",
      description: "Name, board, tag, §6taxes§7, prices, §dspawn§7, and sale.",
      actions: [CLICK.open],
      to: "Town menu#Town details",
    },
  ],
  [
    25,
    {
      material: "iron_door",
      name: "§bPermissions",
      description: "Who can build, break, and interact on town-owned §aland§7.",
      actions: [CLICK.editPermissions],
      to: "Town menu#Permissions",
    },
  ],
  [
    28,
    {
      material: "tripwire_hook",
      name: "§aTrusted",
      description: "Residents and towns §atrusted§7 to build anywhere in town.",
      actions: [CLICK.view],
      to: "Town menu#Trust and outlaws",
    },
  ],
  [
    29,
    {
      material: "iron_bars",
      name: "§cOutlaws",
      description: "Players declared §coutlaws§7 of your town.",
      data: ["§7Outlaws: §c2"],
      actions: [CLICK.view],
      to: "Town menu#Trust and outlaws",
    },
  ],
  [
    30,
    {
      material: "iron_chain",
      name: "§7Jail",
      description: "Jail residents, release §cprisoners§7, and see your jails.",
      data: ["§7Prisoners: §c1"],
      actions: [CLICK.open],
      to: "Town menu#Jail",
    },
  ],
  [
    31,
    {
      material: "ender_pearl",
      name: "§dTown Spawn",
      description: "Teleport to your town §dspawn§7.",
      actions: [CLICK.teleport],
    },
  ],
  [
    32,
    {
      material: "compass",
      name: "§dOutposts",
      description: "Teleport to one of your town's §doutposts§7.",
      data: ["§7Outposts: §a1"],
      actions: [CLICK.choose],
    },
  ],
  [
    33,
    {
      material: "beacon",
      name: "§bNation",
      description: "Open Northmark.",
      actions: [CLICK.open],
      to: "Nation menu",
    },
  ],
  [
    34,
    {
      material: "tnt",
      name: "§4Delete Town",
      description:
        "Disband your town §cpermanently§7. You will be asked to confirm.",
      actions: [CLICK.delete],
    },
  ],
  [49, back("Towny", "Main menu")],
  [53, tutorial("§6Running a Town", 4, 10)],
]);

const NO_TOWN_MENU = menuBlock(4, "Find a Town", [
  [
    11,
    {
      material: "bell",
      name: "§6Found a Town",
      description: "Start a new town on the §achunk§7 you are standing in.",
      data: ["§7Cost: §6$250"],
      actions: ["§eClick to found!"],
    },
  ],
  [
    13,
    {
      material: "oak_door",
      name: "§aBrowse Towns",
      description: "Find an open town to join.",
      actions: [CLICK.browse],
      to: "Directories and leaderboards",
    },
  ],
  [
    15,
    {
      material: "paper",
      name: "§eInvites",
      description: "Accept an invitation to a town.",
      data: ["§7Pending: §a1"],
      actions: [CLICK.view],
      to: "Invites",
    },
  ],
  [31, back("Towny", "Main menu")],
  [35, tutorial("§6Finding a Town", 1, 5)],
]);

const CLAIMS_MENU = menuBlock(6, "Town Claims", [
  [
    4,
    {
      material: "grass_block",
      name: "§aClaims",
      data: [
        "§7Claimed: §a18§7/§a24",
        bar(18, 24),
        "§7Available: §a6",
        "§7Bonus claims: §a4 §8· §7Purchased: §a2",
        "§7Outposts: §a1§7/§a2",
        "§7Claim price: §6$25",
      ],
    },
  ],
  [
    19,
    {
      material: "grass_block",
      name: "§aClaim This Chunk",
      description:
        "Claim the §achunk§7 you are standing in. It must touch your town.",
      data: ["§7Cost: §6$25"],
      actions: ["§eClick to claim!"],
    },
  ],
  [
    20,
    {
      material: "moss_block",
      name: "§aClaim Area",
      description: "Claim a square of §achunks§7 around you.",
      actions: ["§eClick to choose a radius!"],
    },
  ],
  [
    21,
    {
      material: "bone_meal",
      name: "§aFill Gaps",
      description:
        "Claim §awilderness§7 fully enclosed by your town around you.",
      actions: ["§eClick to claim!"],
    },
  ],
  [
    22,
    {
      material: "compass",
      name: "§dClaim Outpost",
      description:
        "Claim this §achunk§7 as an §doutpost§7 away from your town.",
      data: ["§7Cost: §6$500"],
      actions: ["§eClick to claim!"],
    },
  ],
  [
    23,
    {
      material: "coarse_dirt",
      name: "§cUnclaim This Chunk",
      description:
        "Return the §achunk§7 you are standing in to the §awilderness§7.",
      actions: ["§cClick to unclaim!"],
    },
  ],
  [
    24,
    {
      material: "dirt",
      name: "§cUnclaim Area",
      description: "Unclaim a square of §achunks§7 around you.",
      actions: ["§eClick to choose a radius!"],
    },
  ],
  [
    25,
    {
      material: "lava_bucket",
      name: "§4Unclaim Everything",
      description: "Unclaim all town §aland§7 except the §6home block§7.",
      actions: ["§cClick to unclaim!"],
    },
  ],
  [
    28,
    {
      material: "emerald_block",
      name: "§6Buy Bonus Claims",
      description: "Buy extra §aclaim§7 slots.",
      data: ["§7Price each: §6$100"],
      actions: ["§eClick to type an amount!"],
    },
  ],
  [
    29,
    toggle(
      "leather_boots",
      "§aAuto Claim",
      "Claim every §achunk§7 you walk into.",
      false,
    ),
  ],
  [
    30,
    {
      material: "gold_ingot",
      name: "§6Cede This Plot",
      description:
        "Give the §achunk§7 you stand in to another town. Its §6mayor§7 must be online to accept.",
      actions: ["§eClick to choose a town!"],
    },
  ],
  [
    31,
    {
      material: "iron_sword",
      name: "§cTake Over Claim",
      description:
        "Take the §achunk§7 you stand in from an §coverclaimed§7 town that borders yours.",
      actions: ["§cClick to take over!"],
    },
  ],
  [49, back("Your Town", "Town menu")],
  [53, tutorial("§aClaiming Land", 2, 8)],
]);

const BANK_MENU = menuBlock(5, "Bank: Oakhaven", [
  [
    4,
    {
      material: "gold_block",
      name: "§6Oakhaven Bank",
      data: ["§7Balance: §6$4,250", "§7Daily tax: §6$5"],
    },
  ],
  [
    20,
    {
      material: "emerald",
      name: "§aDeposit",
      description: "Move §6money§7 from your balance into the §6bank§7.",
      actions: ["§eClick to choose an amount!"],
    },
  ],
  [
    22,
    {
      material: "redstone",
      name: "§cWithdraw",
      description: "Take §6money§7 out of the §6bank§7.",
      actions: ["§eClick to choose an amount!"],
    },
  ],
  [
    24,
    {
      material: "written_book",
      name: "§eBank History",
      description: "Open a book with recent transactions.",
      actions: [CLICK.view],
    },
  ],
  [40, back("Your Town", "Town menu")],
  [44, tutorial("§6Money & Taxes", 2, 8)],
]);

const DEPOSIT_MENU = menuBlock(4, "Deposit: Oakhaven", [
  [
    4,
    {
      material: "emerald",
      name: "§aDeposit",
      data: ["§7Balance: §6$4,250", "§7Your balance: §6$1,380"],
    },
  ],
  ...(["$10", "$100", "$1,000"] as const).map(
    (amount, index) =>
      [
        19 + index,
        {
          material: "gold_nugget",
          name: `§e${amount}`,
          actions: ["§eClick to deposit!"],
        },
      ] as const,
  ),
  [
    22,
    {
      material: "gold_nugget",
      name: "§e$10,000",
      data: ["§cNot enough money"],
    },
  ],
  [
    23,
    {
      material: "gold_block",
      name: "§6Everything",
      data: ["§7Amount: §6$1,380"],
      actions: ["§eClick to deposit!"],
    },
  ],
  [
    24,
    {
      material: "name_tag",
      name: "§bCustom Amount",
      description: "Type any amount yourself.",
      actions: ["§eClick to type an amount!"],
    },
  ],
  [31, back("Bank: Oakhaven")],
]);

const TOWN_SETTINGS = menuBlock(5, "Town Settings", [
  [
    10,
    toggle(
      "iron_sword",
      "§cPvP",
      "Allow players to fight inside the town.",
      false,
    ),
  ],
  [
    11,
    toggle(
      "zombie_head",
      "§2Hostile Mobs",
      "Allow §2hostile mobs§7 to spawn in town.",
      false,
    ),
  ],
  [
    12,
    toggle(
      "flint_and_steel",
      "§6Fire Spread",
      "Allow §6fire§7 to spread in town.",
      false,
    ),
  ],
  [
    13,
    toggle(
      "tnt",
      "§4Explosions",
      "Allow §4explosions§7 to damage the town.",
      false,
    ),
  ],
  [
    14,
    toggle("oak_door", "§aOpen", "Let anyone join without an invite.", true),
  ],
  [
    15,
    toggle(
      "ender_eye",
      "§bPublic",
      "Let outsiders teleport to your §dspawn§7 and see your §6home block§7.",
      true,
    ),
  ],
  [
    16,
    toggle(
      "white_banner",
      "§fPeaceful",
      "Stay out of §cwars§7 and §cPvP§7.",
      false,
    ),
  ],
  [
    19,
    toggle(
      "gold_nugget",
      "§6Percentage Taxes",
      "Charge §6taxes§7 as a percentage of balance instead of a flat amount.",
      false,
    ),
  ],
  [
    20,
    toggle(
      "beacon",
      "§bNation Zone",
      "Protect the §aland§7 around your town as part of your nation's zone.",
      true,
    ),
  ],
  [40, back("Your Town", "Town menu")],
]);

const NATION_MENU = menuBlock(6, "Your Nation", [
  [
    4,
    {
      material: "beacon",
      name: "§bNorthmark",
      data: [
        "§7Leader: §fRowan",
        "§7Capital: §bOakhaven",
        "§7Towns: §a3 §8· §7Residents: §a31",
        "§7Allies: §a1 §8· §7Enemies: §c1",
        "§7Open: §cNo §8· §7Public: §aYes §8· §7Peaceful: §cNo",
        "§7Bank: §6$12,900",
        "",
        "§7Founded: §eApr 19, 2026",
        "§7Daily town tax: §6$20",
      ],
      actions: ["§eClick for level, bonuses, and upkeep!"],
      to: "Nation menu#Status page",
    },
  ],
  [
    19,
    {
      material: "bell",
      name: "§6Towns",
      description: "View member towns, invite towns, and remove towns.",
      data: ["§7Towns: §a3"],
      actions: [CLICK.view],
      to: "Nation menu#Towns and sanctions",
    },
  ],
  [
    20,
    {
      material: "player_head",
      name: "§aResidents",
      description: "View every resident and manage nation §eranks§7.",
      actions: [CLICK.view],
    },
  ],
  [
    21,
    {
      material: "gold_ingot",
      name: "§6Nation Bank",
      description: "Deposit, withdraw, and view §6bank§7 history.",
      data: ["§7Balance: §6$12,900"],
      actions: [CLICK.open],
      to: "Banks",
    },
  ],
  [
    22,
    {
      material: "shield",
      name: "§bAllies & Enemies",
      description: "Manage §aalliances§7 and declare §cenemies§7.",
      actions: [CLICK.view],
      to: "Nation menu#Allies and enemies",
    },
  ],
  [
    23,
    {
      material: "lever",
      name: "§eNation Settings",
      description: "§fPeaceful§7, open, public, and percentage §6taxes§7.",
      actions: [CLICK.open],
      to: "Settings menus#Nation settings",
    },
  ],
  [
    24,
    {
      material: "writable_book",
      name: "§eNation Details",
      description:
        "Name, board, tag, §6taxes§7, capital, leader, and §dspawn§7.",
      actions: [CLICK.open],
      to: "Nation menu#Nation details",
    },
  ],
  [
    25,
    {
      material: "ender_pearl",
      name: "§dNation Spawn",
      description: "Teleport to your nation's §dspawn§7.",
      actions: [CLICK.teleport],
    },
  ],
  [
    28,
    {
      material: "goat_horn",
      name: "§6Announce to Nation",
      description: "Send a message to every online resident of the nation.",
      actions: [CLICK.write],
    },
  ],
  [
    29,
    {
      material: "tnt",
      name: "§4Delete Nation",
      description:
        "Disband your nation §cpermanently§7. You will be asked to confirm.",
      actions: [CLICK.delete],
    },
  ],
  [49, back("Towny", "Main menu")],
  [53, tutorial("§bNations", 3, 9)],
]);

const PLOT_MENU = menuBlock(6, "Plot", [
  [
    4,
    {
      material: "grass_block",
      name: "§6Riverside 3",
      data: [
        "§7Owner: §fThe town",
        "§7Type: §fShop",
        "§7Chunk: §f12, -40",
        "§7Group: §fRiverside",
        "§aFor sale: §6$150",
        "§7Daily tax: §6$2",
        "",
        "§7Claimed: §eMar 4, 2026",
      ],
      actions: ["§eClick to show Towny's plot info in chat!"],
    },
  ],
  [
    19,
    {
      material: "emerald",
      name: "§aBuy Plot",
      description: "Become the owner of this §aplot§7.",
      data: ["§7Price: §6$150"],
      actions: ["§eClick to buy!"],
    },
  ],
  [
    20,
    {
      material: "red_banner",
      name: "§cTake off Sale",
      description: "Stop selling this §aplot§7.",
      data: ["§6Applies to all 4 plots in Riverside"],
      actions: ["§cClick to stop selling!"],
    },
  ],
  [
    21,
    {
      material: "oak_sign",
      name: "§ePlot Type",
      description: "Shops, embassies, arenas, farms, §cjails§7, and more.",
      data: ["§7Current: §fShop"],
      actions: [CLICK.choose],
    },
  ],
  [
    22,
    {
      material: "name_tag",
      name: "§eRename Plot",
      description: "Shown to players as they walk in.",
      actions: ["§eLeft-click to rename!", "§bRight-click to clear!"],
    },
  ],
  [
    23,
    {
      material: "lever",
      name: "§ePlot Settings",
      description:
        "§cPvP§7, fire, §4explosions§7, mobs, and taxes on this plot.",
      actions: [CLICK.open],
      to: "Settings menus#Plot settings",
    },
  ],
  [
    24,
    {
      material: "iron_door",
      name: "§bPermissions",
      description: "Who can build, break, and interact on this §aplot§7.",
      actions: [CLICK.editPermissions],
      to: "Plot menu#Permissions and trust",
    },
  ],
  [
    25,
    {
      material: "tripwire_hook",
      name: "§aTrusted Players",
      description: "Trusted players may build on this §aplot§7.",
      data: ["§7Trusted: §a0"],
      actions: [CLICK.view],
      to: "Plot menu#Permissions and trust",
    },
  ],
  [
    28,
    {
      material: "clock",
      name: "§eJoin-Day Limits",
      description:
        "The fewest and the most days a buyer must have lived in the town.",
      data: ["§7No limits"],
      actions: [
        "§eLeft-click to set the fewest days!",
        "§bRight-click to set the most days!",
      ],
    },
  ],
  [
    29,
    {
      material: "chest",
      name: "§6Groups & Districts",
      description:
        "Bundle §aplots§7 into groups sold together, or into districts.",
      actions: [CLICK.open],
      to: "Plot menu#Groups and districts",
    },
  ],
  [
    30,
    {
      material: "brush",
      name: "§cClear Plot",
      description:
        "Remove blocks placed on this §aplot§7 that the server marks as clearable.",
      actions: ["§cClick to clear!"],
    },
  ],
  [
    31,
    {
      material: "map",
      name: "§6Many Plots at Once",
      description:
        "Buy, sell, or give up every §aplot§7 in an area around you.",
      actions: [CLICK.open],
      to: "Plot menu#Many plots at once",
    },
  ],
  [
    46,
    {
      material: "bell",
      name: "§6Oakhaven",
      description: "View the town that owns this §aland§7.",
      actions: [CLICK.view],
      to: "Directories and leaderboards#A town's page",
    },
  ],
  [
    47,
    {
      material: "filled_map",
      name: "§bMap",
      description: "See the §aland§7 around you.",
      actions: [CLICK.open],
      to: "Map",
    },
  ],
  [
    48,
    {
      material: "spyglass",
      name: "§bPlot HUD",
      description:
        "Show or hide a sidebar with the §aplot§7 you are in: owner, type, §6price§7, and permissions.",
      actions: ["§eClick to show the HUD!"],
    },
  ],
  [49, back("Towny", "Main menu")],
  [
    50,
    {
      material: "clock",
      name: "§eRefresh",
      description: "Update this menu after moving to another §achunk§7.",
      actions: ["§eClick to refresh!"],
    },
  ],
  [53, tutorial("§ePlots", 5, 9)],
]);

const PROFILE_MENU = menuBlock(5, "Your Profile", [
  [
    4,
    {
      material: "player_head",
      name: "§aRowan",
      data: [
        "§7Town: §6Oakhaven",
        "§7Ranks: §fMayor",
        "§aOnline",
        "",
        "§7Registered: §eFeb 27, 2026",
        "§7Friends: §a4",
        "§7Plots owned: §a3",
        "§7Balance: §6$1,380",
        "§7About: §f§oBuilds bridges, mostly.",
      ],
    },
  ],
  [
    19,
    {
      material: "poppy",
      name: "§dFriends",
      description:
        "Friends count as residents in your personal §aplot§7 permissions.",
      actions: [CLICK.view],
    },
  ],
  [
    20,
    {
      material: "lever",
      name: "§ePersonal Settings",
      description:
        "§cPvP§7, fire, and §2mobs§7 on your plots, plus map and border display modes.",
      actions: [CLICK.open],
      to: "Settings menus#Personal settings",
    },
  ],
  [
    21,
    {
      material: "iron_door",
      name: "§bPlot Permissions",
      description:
        "Who can build, break, and interact on §aplots§7 you personally own.",
      actions: [CLICK.editPermissions],
    },
  ],
  [
    22,
    {
      material: "writable_book",
      name: "§6About Me",
      description: "A short bio other players see on your profile.",
      actions: ["§eLeft-click to edit!", "§bRight-click to clear!"],
    },
  ],
  [
    23,
    {
      material: "red_bed",
      name: "§aGo to Spawn",
      description: "Teleport to your bed or your town §dspawn§7.",
      actions: [CLICK.teleport],
    },
  ],
  [
    24,
    {
      material: "milk_bucket",
      name: "§bDisplay Modes",
      description:
        "Automatic modes such as the auto map, borders, and auto claim.",
      data: ["§7Active: §fmap, plotborder"],
      actions: [
        "§eLeft-click to turn every mode off!",
        "§bRight-click to restore the server's defaults!",
      ],
    },
  ],
  [
    37,
    {
      material: "grass_block",
      name: "§aMy Plots",
      description:
        "Every §aplot§7 you own, where it is, and what it costs you daily.",
      data: ["§7Plots owned: §a3"],
      actions: [CLICK.view],
    },
  ],
  [
    38,
    {
      material: "gold_nugget",
      name: "§6Daily Tax",
      description:
        "What you pay your town and for your §aplots§7 on the next new day.",
      data: [
        "§7Town tax: §6$5",
        "§7Plot tax: §6$6",
        "§7Total: §6$11",
        "§7Next new day in: §e5h 12m",
      ],
    },
  ],
  [40, back("Towny", "Main menu")],
  [
    42,
    {
      material: "iron_bars",
      name: "§cOutlawed In",
      description: "Towns that have declared you an §coutlaw§7.",
      data: ["§7Towns: §a0"],
      actions: [CLICK.view],
    },
  ],
  [
    43,
    {
      material: "tripwire_hook",
      name: "§aTrusted In",
      description: "Towns that §atrust§7 you to build anywhere in them.",
      data: ["§7Towns: §a1"],
      actions: [CLICK.view],
    },
  ],
  [44, tutorial("§aYour Profile", 6, 6)],
]);

/* The map: 9×5 chunks around you, north up. */
const MAP_ROWS = [
  "wwwooowww",
  "wwoooowwe",
  "wtttttnne",
  "wtyttStnn",
  "wwttttann",
] as const;

const MAP_TILES: Readonly<Record<string, Icon>> = {
  w: { material: "white_stained_glass_pane", name: "§fWilderness" },
  t: {
    material: "lime_stained_glass_pane",
    name: "§aOakhaven",
    data: ["§7Nation: §bNorthmark", "§7Owner: §fThe town", "§7Type: §fDefault"],
    actions: ["§eClick to view the town!"],
  },
  S: {
    material: "lime_stained_glass_pane glow",
    name: "§aOakhaven",
    data: [
      "§7Nation: §bNorthmark",
      "§7Owner: §fThe town",
      "§7Type: §fShop",
      "§aFor sale: §6$150",
    ],
    actions: ["§eClick to view the town!", "§bRight-click to buy this plot!"],
  },
  y: {
    material: "yellow_stained_glass_pane",
    name: "§eOakhaven",
    data: ["§7Nation: §bNorthmark", "§7Owner: §fRowan", "§7Type: §fDefault"],
    actions: ["§eClick to view the town!"],
  },
  n: {
    material: "light_blue_stained_glass_pane",
    name: "§bFernwick",
    data: ["§7Nation: §bNorthmark", "§7Owner: §fThe town", "§7Type: §fDefault"],
    actions: ["§eClick to view the town!"],
  },
  a: {
    material: "blue_stained_glass_pane",
    name: "§9Saltmere",
    data: ["§7Nation: §bTidewater", "§7Owner: §fThe town", "§7Type: §fFarm"],
    actions: ["§eClick to view the town!"],
  },
  e: {
    material: "red_stained_glass_pane",
    name: "§cGrimhold",
    data: [
      "§7Nation: §bAshen Pact",
      "§7Owner: §fThe town",
      "§7Type: §fDefault",
    ],
    actions: ["§eClick to view the town!"],
  },
  o: {
    material: "orange_stained_glass_pane",
    name: "§6Brightwater",
    data: ["§7Owner: §fThe town", "§7Type: §fDefault"],
    actions: ["§eClick to view the town!"],
  },
};

function mapBlock(): string {
  const slots: [number, Icon][] = [];
  MAP_ROWS.forEach((row, y) => {
    // The rows are ASCII letters, one per tile.
    row.split("").forEach((tile, x) => {
      const slot = y * 9 + x;
      const chunk = `§7Chunk: §f${String(10 + x)}, ${String(-42 + y)}`;
      if (slot === 22) {
        slots.push([
          slot,
          {
            material: "player_head",
            name: "§aOakhaven",
            data: [
              "§eYou are here",
              chunk,
              "§7Nation: §bNorthmark",
              "§7Owner: §fThe town",
              "§7Type: §fDefault",
              "§6Home block",
            ],
            actions: ["§eClick to view the town!"],
          },
        ]);
        return;
      }
      const base = MAP_TILES[tile] ?? MAP_TILES.w;
      if (!base) return;
      slots.push([slot, { ...base, data: [chunk, ...(base.data ?? [])] }]);
    });
  });
  slots.push(
    [
      45,
      {
        material: "paper",
        name: "§eLegend",
        data: [
          "§f■ §7Wilderness",
          "§a■ §7Your town",
          "§e■ §7Your plot",
          "§b■ §7Your nation",
          "§9■ §7Allied nation",
          "§c■ §7Enemy nation",
          "§6■ §7Other town",
          "",
          "§7Glowing tiles are for sale.",
          "§7North is up.",
        ],
      },
    ],
    [
      47,
      {
        material: "grass_block",
        name: "§aClaim Your Chunk",
        description: "Claim the §achunk§7 you are standing in.",
        data: ["§7Cost: §6$25"],
        actions: ["§eClick to claim!"],
      },
    ],
    [
      48,
      {
        material: "coarse_dirt",
        name: "§cUnclaim Your Chunk",
        description: "Unclaim the §achunk§7 you are standing in.",
        actions: ["§cClick to unclaim!"],
      },
    ],
    [49, back("Towny", "Main menu")],
    [
      50,
      {
        material: "clock",
        name: "§eRefresh",
        description: "Redraw the map around your current position.",
        actions: ["§eClick to refresh!"],
      },
    ],
    [
      51,
      {
        material: "ender_eye",
        name: "§aBorder View",
        description:
          "See town and nation borders as coloured particles when you walk near them.",
        data: ["§7Status: §a§lENABLED"],
        actions: [CLICK.open],
        to: "Border view",
      },
    ],
    [53, tutorial("§bGetting Started", 7, 7)],
  );
  return [
    "::: menu 6 Map",
    ...slots.map(([slot, icon]) => slotLine(slot, icon)),
    ":::",
  ].join("\n");
}

const BORDER_VIEW_MENU = menuBlock(3, "Border View", [
  [
    10,
    toggle(
      "ender_eye",
      "§aShow Borders",
      "Draw a short wall of particles on town and nation borders when you come near one. Only you can see them.",
      true,
    ),
  ],
  [
    12,
    toggle(
      "glowstone_dust",
      "§eYour Plot Borders",
      "Also outline the §aplots§7 you own inside a town.",
      true,
    ),
  ],
  [
    14,
    {
      material: "spyglass",
      name: "§bRange",
      description: "How close you need to be to a border before it appears.",
      data: ["§7Range: §a12 blocks"],
      actions: [
        "§eLeft-click for the next one!",
        "§bRight-click for the previous one!",
      ],
    },
  ],
  [
    16,
    {
      material: "paper",
      name: "§eLegend",
      description:
        "Each side of a border is drawn in the colour of the town it belongs to.",
      data: [
        "§a■ §7Your town",
        "§b■ §7Your nation",
        "§9■ §7Allied nation",
        "§c■ §7Enemy nation",
        "§6■ §7Other town",
        "",
        "§7Taller, thicker walls mark a §bnation§7 border.",
      ],
    },
  ],
  [22, back("Map", "Map")],
]);

const INVITES_MENU = menuBlock(4, "Invites", [
  [
    10,
    {
      material: "bell",
      name: "§6Invitation to join Brightwater",
      data: ["§7Sent by: §fMarlow"],
      actions: ["§eLeft-click to accept!", "§bRight-click to decline!"],
    },
  ],
  [
    11,
    {
      material: "beacon",
      name: "§bInvitation for your town to join Tidewater",
      data: ["§7Sent by: §fSaltmere"],
      actions: ["§eLeft-click to accept!", "§bRight-click to decline!"],
    },
  ],
  [
    12,
    {
      material: "shield",
      name: "§aAlliance request from Tidewater",
      data: ["§7Sent by: §fIsolde"],
      actions: ["§eLeft-click to accept!", "§bRight-click to decline!"],
    },
  ],
  [31, back("Towny", "Main menu")],
]);

const CHAPTERS: readonly [string, string, string, number][] = [
  [
    "compass",
    "§bGetting Started",
    "What Towny is, how to open and read these menus, the §awilderness§7, the map, invites, and leaderboards.",
    7,
  ],
  [
    "oak_door",
    "§6Finding a Town",
    "Why towns matter, joining one, founding your own, and leaving.",
    5,
  ],
  [
    "bell",
    "§6Running a Town",
    "Levels, §eranks§7, recruiting, §dspawn§7, settings, details, announcements, merging, selling, and §cruins§7.",
    10,
  ],
  [
    "grass_block",
    "§aClaiming Land",
    "Chunks and §aclaim§7 limits, claiming and unclaiming, outposts, §abonus claims§7, and ceding or taking over §aland§7.",
    8,
  ],
  [
    "oak_sign",
    "§ePlots",
    "Owning, buying, and selling §aplots§7, many plots at once, plot types, settings, §atrust§7, join-day limits, and groups.",
    9,
  ],
  [
    "shield",
    "§cPermissions & Protection",
    "Who may build where, friends, trust, and player overrides, §cPvP§7 and other switches, §coutlaws§7, and §cjail§7.",
    11,
  ],
  [
    "beacon",
    "§bNations",
    "What nations are, joining and founding one, member towns, diplomacy, sanctions, levels, settings, and §dspawn§7.",
    9,
  ],
  [
    "gold_ingot",
    "§6Money & Taxes",
    "The Towny day, prices, banks, taxes, §6upkeep§7, and §cbankruptcy§7.",
    8,
  ],
  [
    "player_head",
    "§aYour Profile",
    "Your profile, other players, your §aplots§7 and §6taxes§7, what you see while exploring, and spawning.",
    6,
  ],
];

const TUTORIAL_READ = [7, 5, 4, 2, 5, 0, 3, 2, 6];

function tutorialHub(): string {
  const slots = [19, 20, 21, 22, 23, 24, 25, 28, 29];
  return menuBlock(6, "Tutorial", [
    [
      4,
      {
        material: "knowledge_book",
        name: "§dTownyMenu Tutorial",
        description:
          "Everything worth knowing about Towny, one chapter at a time. Each lesson can take you straight to the menu it explains.",
        data: ["§7Read: §a34§7/§a73", bar(34, 73)],
      },
    ],
    ...CHAPTERS.map(([material, name, description, total], index) => {
      const read = TUTORIAL_READ[index] ?? 0;
      const icon: Icon = {
        material: read === total ? `${material} glow` : material,
        name,
        description,
        data: [
          `§7Read: §a${String(read)}§7/§a${String(total)}`,
          bar(read, total),
          ...(read === total ? ["§a✔ Chapter complete"] : []),
        ],
        actions: [CLICK.open],
        to: "Tutorial#Chapters",
      };
      return [slots[index] ?? 0, icon] as const;
    }),
    [
      47,
      {
        material: "spectral_arrow",
        name: "§aContinue Reading",
        description: "Open the first chapter with lessons you haven't read.",
        actions: [CLICK.open],
      },
    ],
    [49, back("Towny", "Main menu")],
  ]);
}

const ADMIN_MENU = menuBlock(5, "Server Admin", [
  [
    10,
    {
      material: "comparator",
      name: "§6Towny Config",
      description:
        "Browse and edit every setting in Towny's config.yml. Changes are saved and applied at once.",
      actions: [CLICK.open],
      to: "Admin menus#Towny config",
    },
  ],
  [
    12,
    {
      material: "grass_block",
      name: "§aWorlds",
      description:
        "Per-world Towny settings: §cPvP§7, explosions, fire, §2mobs§7, claiming, and wilderness rules.",
      data: ["§7Worlds: §a3"],
      actions: [CLICK.view],
      to: "Admin menus#Worlds",
    },
  ],
  [
    14,
    {
      material: "command_block",
      name: "§cServer Actions",
      description:
        "Start a new day, back up or save data, reload Towny, and change global toggles.",
      actions: [CLICK.open],
      to: "Admin menus#Server actions",
    },
  ],
  [
    16,
    {
      material: "writable_book",
      name: "§eTownyMenu Settings",
      description: "Menu language, message prefix, and the menu shortcut.",
      actions: [CLICK.open],
      to: "Configuration",
    },
  ],
  [
    18,
    {
      material: "grass_block",
      name: "§aPlot You Stand In",
      description:
        "Claim it for a player, move it to another town, §atrust§7 players, or unclaim it.",
      actions: [CLICK.open],
      to: "Admin menus#Towns, nations, residents and plots",
    },
  ],
  [
    20,
    {
      material: "bell",
      name: "§6Manage Towns",
      description:
        "Open any town to edit, rename, or delete it without being its §6mayor§7.",
      data: ["§7Total: §a14"],
      actions: [CLICK.browse],
      to: "Admin menus#Towns, nations, residents and plots",
    },
  ],
  [
    22,
    {
      material: "beacon",
      name: "§bManage Nations",
      description: "Open any nation to edit, rename, or delete it.",
      data: ["§7Total: §a4"],
      actions: [CLICK.browse],
      to: "Admin menus#Towns, nations, residents and plots",
    },
  ],
  [
    24,
    {
      material: "player_head",
      name: "§aManage Residents",
      description: "Find any resident to change their town, title, or record.",
      data: ["§7Total: §a87"],
      actions: [CLICK.browse],
      to: "Admin menus#Towns, nations, residents and plots",
    },
  ],
  [
    26,
    {
      material: "iron_door",
      name: "§dTowny Permissions",
      description:
        "Edit townyperms.yml: the permissions every resident has, and the ranks §6mayors§7 can hand out.",
      actions: [CLICK.open],
      to: "Admin menus#Towny permissions",
    },
  ],
  [40, back("Towny", "Main menu")],
]);

/** A row of buttons showing how one icon reads: anatomy for "Reading the menus". */
const ANATOMY = menuBlock(1, "Reading the buttons", [
  [
    1,
    {
      material: "gold_ingot",
      name: "§6Town Bank",
      description: "Deposit, withdraw, and view §6bank§7 history.",
      data: ["§7Balance: §6$4,250"],
      actions: [CLICK.open],
    },
  ],
  [3, toggle("oak_door", "§aOpen", "Let anyone join without an invite.", true)],
  [
    5,
    {
      material: "gray_dye",
      name: "§4Delete Town",
      description:
        "Disband your town §cpermanently§7. You will be asked to confirm.",
      data: ["§cYou don't have permission for this."],
    },
  ],
  [
    7,
    {
      material: "ender_pearl",
      name: "§dTown Spawn",
      description: "Teleport to your town §dspawn§7.",
      data: ["§7Cost: §6$10"],
      actions: [CLICK.teleport],
    },
  ],
]);

const NAVBOX = `::: navbox TownyMenu
Start: [[Main Page]] · [[Installation]] · [[Getting started]] · [[Reading the menus]]
Menus: [[Main menu]] · [[Finding a town]] · [[Town menu]] · [[Claiming land]] · [[Banks]] · [[Settings menus]] · [[Nation menu]] · [[Plot menu]] · [[Profile menu]] · [[Map]] · [[Border view]] · [[Invites]] · [[Directories and leaderboards]] · [[Prices and new day]] · [[Tutorial]]
Server owners: [[Commands and permissions]] · [[Configuration]] · [[Translations]] · [[Admin menus]]
Project: [[Changelog]] · [[FAQ]] · [[For developers]]
:::`;

/* ---------- pages ---------- */

const PAGES: { title: string; body: string }[] = [
  {
    title: "Main Page",
    body: `::: infobox TownyMenu
Kind: Paper plugin, an addon for [Towny](https://github.com/TownyAdvanced/Towny)
Version: 1.1.2
Minecraft: 26.3 (Paper)
Java: 25 or newer
Towny: 0.103.2.10 or newer
Languages: English, Simplified Chinese
Source: [GitHub](${REPO})
Downloads: [Releases](${REPO}/releases)
:::

**TownyMenu** puts [Towny](https://github.com/TownyAdvanced/Towny) into chest menus. Players run their town, nation and plots by clicking instead of typing commands: names and amounts go into Minecraft's own dialogs, and Towny's confirmations become Confirm and Cancel buttons.

Every button runs the matching Towny command, so Towny's permissions, prices, cooldowns and messages all still apply. Buttons you can't use are greyed out, and buttons that cost money show what they cost.

This wiki covers every menu (with mock-ups you can hover and click through), setting up the plugin, and what each setting does.

${MAIN_MENU}

*The main menu, opened with \`/tm\` or by pressing {{kbd F}} while sneaking. Hover over a button to read it; click it to go to its page.*

## Start here

- [[Installation]]: what the server needs, and the first start.
- [[Getting started]]: opening the menus and finding your way around.
- [[Reading the menus]]: what the colours, glowing switches and grey buttons mean.

## The menus

::: columns 3
- [[Main menu]]
- [[Finding a town]]
- [[Town menu]]
- [[Claiming land]]
- [[Banks]]
- [[Settings menus]]
- [[Nation menu]]
- [[Plot menu]]
- [[Profile menu]]
- [[Map]]
- [[Border view]]
- [[Invites]]
- [[Directories and leaderboards]]
- [[Prices and new day]]
- [[Tutorial]]
:::

## For server owners

[[Commands and permissions]] · [[Configuration]] · [[Translations]] · [[Admin menus]] · [[FAQ]] · [[Changelog]] · [[For developers]]

::: notice info Not affiliated
TownyMenu is an independent addon. It isn't made by the Towny team, and it isn't an official Minecraft product.
:::
`,
  },
  {
    title: "Installation",
    body: `TownyMenu is a plugin for **Paper** servers. It needs Towny: without it, TownyMenu doesn't load.

## Requirements

| Needs | Version |
|:--|:--|
| Paper | 26.3 or newer |
| Java | 25 or newer |
| Towny | 0.103.2.10 or newer |

An economy plugin (through Vault, as Towny uses one) is optional. Without one, the bank buttons and prices disappear, and nothing costs money.

## Installing

1. Download \`TownyMenu-<version>.jar\` from the [releases page](${REPO}/releases).
2. Put it in the server's \`plugins/\` folder, next to Towny's jar.
3. Start (or restart) the server.

On the first start TownyMenu writes \`plugins/TownyMenu/config.yml\` and copies its language files to \`plugins/TownyMenu/lang/\`. See [[Configuration]] and [[Translations]].

::: notice tip Updating
Stop the server, replace the old jar with the new one (don't keep both), and start it again. Your config and edited language files are kept; keys a new version adds come from the bundled copy until you add them. The [[Changelog]] lists what changed.
:::

## Checking it works

Join and type \`/tm\`. The [[Main menu]] should open. If it doesn't:

- Check the console for \`TownyMenu\` errors at startup. *Unknown dependency Towny* means Towny is missing or failed to load.
- Towny must have registered you: right after joining it can take a moment (the menu then says *Towny hasn't registered you yet*).

## Building it yourself

TownyMenu is written in Kotlin and built with Gradle:

\`\`\`bash
./gradlew build
\`\`\`

The jar lands in \`build/libs/\`. See [[For developers]] for the local test server.

[[Category:Server owners]]

${NAVBOX}
`,
  },
  {
    title: "Getting started",
    body: `## Opening the menus

- Type \`/townymenu\`, or the short \`/tm\`.
- Or press **swap-hand** ({{kbd F}} by default) **while sneaking**. Server owners can turn this off (\`sneak-swap-hand-shortcut\`, see [[Configuration]]).
- Clicking the \`[TownyMenu]\` prefix on any of TownyMenu's chat messages opens it too.

Each of these opens the [[Main menu]]. From there everything is a click away.

## Your first steps

::: tabs
== Without a town ==
1. Open the [[Main menu]] and click **Town**. You'll get [[Finding a town|Find a Town]].
2. Click **Browse Towns** to see every town. Open towns let you join with one click.
3. Or wait for an invitation: TownyMenu tells you in chat, and the message opens your [[Invites]].
4. Or stand where you want to live and click **Found a Town**.
== In a town ==
1. Click your town in the [[Main menu]] to open the [[Town menu]].
2. The **Claims** button grows your town ([[Claiming land]]); **Residents** invites players.
3. Stand in a plot and open **This Plot** to buy or sell it ([[Plot menu]]).
4. Click the town icon at the top for its level, limits and upkeep.
:::

## Learn as you go

The in-game [[Tutorial]] (\`/tm tutorial\`) has nine chapters on everything Towny does, with *this server's* prices and limits. Every menu has a **Tutorial** button for its chapter, in the bottom-right corner.

::: notice tip New players
Players who join without a town are pointed to the tutorial in chat, until they've read it all or joined a town.
:::

## Typing things

When a button needs a name, an amount or a message, a Minecraft dialog opens with a text box. Cancel it to go back to the menu. Anything that can't be undone (deleting a town, unclaiming everything) asks you to confirm first.

[[Category:Guides]]

${NAVBOX}
`,
  },
  {
    title: "Reading the menus",
    body: `Every TownyMenu button is laid out the same way, so once you can read one you can read them all.

${ANATOMY}

## The parts of a tooltip

From the top:

1. **The name**, coloured by what it's about (see below).
2. **What it does**, in grey.
3. **Data**: numbers, settings, the price. Several groups are separated by a blank line.
4. **A rule**, then **what clicking does**. Every hint ends in an exclamation mark: {{mc §eyellow}} for a click or left-click, {{mc §baqua}} for a right-click, {{mc §cred}} when the click removes or destroys something.

A button that does different things on each mouse button lists both, left first. Icons with nothing to click (like the bank's balance) have no hints at all.

## Colours

The same kind of text is always the same colour:

| Colour | Means |
|:--|:--|
| {{mc §7Grey}} | labels and descriptions |
| {{mc §fWhite}} | neutral values and player names |
| {{mc §6Gold}} | money, towns, leaders |
| {{mc §bAqua}} | nations |
| {{mc §aGreen}} | counts, land, plots, allies |
| {{mc §eYellow}} | dates and times, menu and button names |
| {{mc §dLight purple}} | spawns and outposts |
| {{mc §cRed}} | danger, PvP, enemies, outlaws, jail |

## Switches, grey dyes and prices

- **Switches glow while they're on.** Their tooltip says {{mc §a§lENABLED}} or {{mc §c§lDISABLED}}, and the hint says what clicking turns it to.
- **A grey dye** stands in for a button you lack Towny's permission for. It keeps the name, so you know what's there.
- **Buttons that cost money say so** ({{mc §7Cost: §6$10}}), using this server's own prices. Things on sale show a {{mc §7Price}} instead.
- **Progress bars** show anything "used of a limit": claims, tutorial lessons, the next town level.

## Going back

Every menu has **Go Back** at the bottom middle, naming the menu it returns to. Menus opened by a command have **Close** instead. The **Tutorial** button sits in the bottom-right corner.

## Menus that keep up

An open menu updates itself when Towny changes what it shows: someone joins your town, land is claimed, the bank moves, or a new day starts. Server owners can turn this off (\`live-menu-refresh\`).

[[Category:Guides]]

${NAVBOX}
`,
  },
  {
    title: "Main menu",
    body: `The main menu is where TownyMenu starts: \`/tm\`, or {{kbd F}} while sneaking.

${MAIN_MENU}

## Buttons

| Button | Opens |
|:--|:--|
| Your head (top) | your [[Profile menu]] |
| **Town** | the [[Town menu]], or [[Finding a town|Find a Town]] without one |
| **Nation** | the [[Nation menu]], or *Find a Nation* when your town has none. Locked until you're in a town. |
| **This Plot** | the [[Plot menu]] for the chunk you stand in |
| **Prices & New Day** | [[Prices and new day]], with a countdown to the next Towny day |
| **Map** | the [[Map]] of the chunks around you |
| **Towns** / **Nations** | the [[Directories and leaderboards|directories]] |
| **Tutorial** | the [[Tutorial]] |
| **Invites** | your [[Invites]]; the name shows how many are waiting |
| **Leaderboards** | the [[Directories and leaderboards#Leaderboards|leaderboards]] |
| **Server Admin** | the [[Admin menus]]; only shown to admins |

The town button glows while your town is open to everyone. It becomes a golden helmet when your town is its nation's capital.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Finding a town",
    body: `Players without a town get **Find a Town** instead of the [[Town menu]].

${NO_TOWN_MENU}

## Joining a town

**Browse Towns** opens the [[Directories and leaderboards|town directory]]. Sort it by residents, claims, bank balance, online players, distance or openness. On a town's page:

- **Join Town** appears when the town is *open* to everyone.
- Otherwise its mayor (or an assistant) has to invite you. The invitation waits in your [[Invites]], and TownyMenu tells you in chat when one arrives.

You can only live in one town at a time. Don't want invitations at all? Turn on **Ignore Invites** in your [[Settings menus#Personal settings|personal settings]].

## Founding a town

Stand where you want your town and click **Found a Town**. TownyMenu asks for a name in a dialog. The chunk you stand in becomes the town's **home block** and spawn, and you become its **mayor**. The button shows what founding costs on this server.

Towny decides where towns may go: usually a minimum distance from other towns, and only in worlds where claiming is on.

## Reclaiming ruins

When a server keeps deleted or bankrupt towns as **ruins** and lets players without a town reclaim them, a fourth button appears: **Reclaim a Ruined Town**. Stand in the ruins and pay to become their mayor.

## Leaving a town

Residents leave from the bottom-right of the [[Town menu]] (**Leave Town**). A mayor can't leave: hand the town to someone else from their profile first (**Make Mayor**), or delete it.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Town menu",
    body: `The town menu is everything a town does, for its residents and its mayor. Open it from the [[Main menu]].

${TOWN_MENU}

What you see depends on your rank: residents see the buttons they can use, and the rest are [[Reading the menus|grey dyes]]. Mayors see everything; the bottom-right becomes **Leave Town** for everyone else.

## Status page

Click the town at the top for its status page:

- **Town Level**: the level, its title, and how many residents or claims the next level needs, with a progress bar.
- **Claims**: land held and what's left, and how many bonus claims you may still buy.
- **Outposts** and the **Nation Zone** around the town.
- **Daily Upkeep**: what the bank pays on the next new day, any overclaim penalty, and the total.
- **Warnings**: bankrupt, ruined, conquered, overclaimed, or upkeep the bank can't cover. With none, it says *All Good*.

## Residents

A list of everyone in town, with their ranks and when they were last online. Click a resident for their profile, where the mayor can:

- assign **Town Ranks** (assistant, sheriff, builder: whatever the server defines),
- set their **title** and **surname**,
- **Trust** them to build anywhere, or declare them an **outlaw**,
- **Make Mayor** (hand over the town) or **Kick** them.

From the residents list: **Invite Online Player**, **Invite by Name**, the invitations still waiting (**Sent Invites**; right-click to revoke them all), and **Announce to Town**, a message to every resident online.

## Town details

| Button | Does |
|:--|:--|
| Rename Town | a new name |
| Town Board | the message residents see when they log in |
| Town Tag | a short tag shown in chat |
| Map Color | the town's colour on web maps |
| Set Spawn Here | moves the town spawn to where you stand |
| Set Home Block Here | moves the home block to your chunk |
| Set Outpost Spawn Here | moves the spawn of the outpost you're in |
| Set Primary Jail | the jail plot you stand in becomes the main jail |
| Taxes and prices | daily resident tax (or a percentage, with a cap), plot, shop and embassy taxes, default plot prices, and what visitors pay to use your spawn |
| Put Town up for Sale | lets another player buy the town and become mayor |

## Permissions

Who may **Build**, **Destroy**, **Switch** (doors, buttons, levers, containers) and **Use items** on land the town still owns, for **residents**, **nation** members, **allies** and **outsiders**. Click a cell to flip it; the row and column headers flip a whole line. **Reset** restores the server's defaults. Plots nobody has bought follow these settings.

## Trust and outlaws

**Trusted** lists the residents and the towns trusted to build anywhere in town, whatever its permissions. Add players online or by name, or **Trust a Town**: every resident of a trusted town may build.

**Outlaws** are players the town has declared troublemakers. Depending on the server, outlaws are warned or teleported away when they walk in, and can be jailed. Click one to pardon them.

## Jail

The **Jail** menu lists prisoners with their hours left, bail and cell; click one to release them. **Jail a Player** picks an online resident, then the sentence, the bail, the jail and the cell. **Jails** lists every jail plot with its cells and prisoners.

A jail is a plot with the **Jail** type (set it in the [[Plot menu]]); add cells there while standing inside.

## Ruins

When a town is in ruins, the jail's place is taken by **Reclaim Town**: pay to restore it and become its mayor. It appears after the server's waiting time.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Claiming land",
    body: `Towns hold land one **chunk** at a time (16×16 blocks, a *town block*). The **Claims** button in the [[Town menu]] opens:

${CLAIMS_MENU}

## Claiming

- **Claim This Chunk**: the chunk you stand in. New claims must touch your town's land (servers can ask for more than one side; see [[Admin menus#Worlds]]).
- **Claim Area**: a square around you. A radius of 1 claims 3×3 chunks.
- **Fill Gaps**: claims wilderness your town completely surrounds.
- **Claim Outpost**: a claim away from the town, with its own spawn: a distant mine or farm. Some servers only allow outposts in worlds where the town has no other land.
- **Auto Claim**: walk around, and each chunk you step into is claimed while the town can pay and has claims left.

Every button that costs money shows the price. The price can rise with each claim, depending on the server.

## Unclaiming

**Unclaim This Chunk**, **Unclaim Area** and **Unclaim Everything** (all but the home block) give land back to the wilderness and free its claim slot. Some servers refund part of the price, and some slowly restore unclaimed land to how it was.

## Running out of claims

How much land a town may hold grows with its residents and its level. Reached the limit? **Buy Bonus Claims** with money from the town bank.

## Ceding and taking over

- **Cede This Plot** gives the chunk you stand in to another town, for example to settle a border. Their mayor must be online to accept.
- A town holding more land than its limit is **overclaimed**. **Take Over Claim** takes a chunk at its edge that touches your land; depending on the server, your nations may need to be enemies.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Banks",
    body: `Towns and nations keep money in a bank. The same menu serves both: **Town Bank** in the [[Town menu]], **Nation Bank** in the [[Nation menu]].

${BANK_MENU}

## Depositing and withdrawing

Deposit and withdraw open a row of amounts:

${DEPOSIT_MENU}

The preset amounts come from the server's \`bank-amounts\` setting (see [[Configuration]]). **Everything** moves all you can, and **Custom Amount** asks for any figure. An amount you can't move says why, instead of a click hint: not enough money, below the minimum, or above the maximum.

Anyone in town can deposit. Withdrawing needs a rank that allows it, and servers can turn withdrawals off for every town or nation.

## History

**Bank History** opens a book with the bank's recent transactions.

## What the bank pays for

Claims and bonus claims, outposts, the daily **upkeep**, and other town costs. When a town can't pay its upkeep, it goes into **debt** (if the server allows bankruptcy) or falls into ruin. TownyMenu warns the mayor in chat, and the town's [[Town menu#Status page|status page]] shows the debt and its limit. See [[Prices and new day]].

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Settings menus",
    body: `Towns, nations, plots and players each have a menu of switches. They all work the same way: a switch glows while it's on, its tooltip says {{mc §a§lENABLED}} or {{mc §c§lDISABLED}}, and one click flips it. Up to 21 fit on a page.

## Town settings

From **Town Settings** in the [[Town menu]]:

${TOWN_SETTINGS}

**Nation Zone** only appears while your nation gives towns one: protected wilderness around the town.

## Nation settings

From **Nation Settings** in the [[Nation menu]]:

| Switch | When on |
|:--|:--|
| {{mc §fPeaceful}} | stays out of wars; PvP is off in member towns |
| {{mc §aOpen}} | any town may join without an invite |
| {{mc §bPublic}} | outsiders may teleport to the nation spawn |
| {{mc §6Percentage Taxes}} | towns pay a share of their balance, not a flat amount |

## Plot settings

From **Plot Settings** in the [[Plot menu]], for the plot you stand in (or its whole group): **PvP**, **Fire Spread**, **Explosions**, **Hostile Mobs**, and **Taxed** (whether the owner pays the town's plot tax; mayors only).

## Personal settings

From **Personal Settings** in your [[Profile menu]]:

| Switch | When on |
|:--|:--|
| {{mc §cPvP}} · {{mc §6Fire Spread}} · {{mc §4Explosions}} · {{mc §2Hostile Mobs}} | allowed on the plots you own |
| {{mc §eBorder Titles}} | a title when you cross into a town or the wilderness |
| {{mc §bAuto Map}} | Towny's map in chat whenever you enter a new chunk |
| {{mc §aAuto Claim}} · {{mc §cAuto Unclaim}} | claim (or unclaim) every chunk you walk into |
| {{mc §ePlot Borders}} · {{mc §eConstant Plot Borders}} | particle borders when you enter a plot, or always |
| {{mc §6Town Borders}} | particle borders of the town you're in |
| {{mc §fInfo Tool}} | right-click blocks with a stick to see their Towny info |
| {{mc §7Ignore Plot Titles}} | no plot name and owner messages as you walk |
| {{mc §7Ignore Invites}} | no town invitations |
| {{mc §fBed Spawn}} | your bed is your Towny spawn |
| {{mc §6Plot Group Mode}} · {{mc §6District Mode}} | each plot you walk into joins your selected group or district |
| {{mc §8Chat Spy}} · {{mc §4Disable Admin Powers}} | admins only: see every town and nation chat; be treated like a regular player |

**Display Modes** in your profile turns every mode off at once (left-click), or restores the server's defaults (right-click).

Towny's own particle borders are separate from TownyMenu's [[Border view]].

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Nation menu",
    body: `A nation is a group of towns led by the mayor of its **capital**. Open the nation menu from the [[Main menu]] or the [[Town menu]].

${NATION_MENU}

A town without a nation gets **Find a Nation** instead: **Found a Nation** (your town becomes the capital), **Browse Nations**, and invitations for your town. Only a mayor can take a town into a nation.

## Status page

Click the nation at the top: its **level**, how many towns the next level needs, the **bonuses** every member town gets (claims, outposts, more outposts for the capital, the nation zone), and the daily **upkeep** from the nation bank, with a warning when the bank can't cover it.

## Towns and sanctions

**Towns** lists member towns; the capital is marked. Right-click a town to remove it, or **Invite a Town** that has no nation.

**Sanctioned Towns** are towns outside the nation kept away from its spawn: their residents can't teleport there. Right-click to lift a sanction.

## Allies and enemies

**Allies & Enemies** lists both. **Propose Alliance** sends a request the other nation must accept (it lands in their [[Invites]]); **Declare Enemy** needs no answer. Right-click to end an alliance or make peace. Allies can't hurt each other and can be given permissions on your land; depending on the server, enemies killed in your towns can be jailed.

## Nation details

Rename the nation, write its **board**, set its **tag** and map colour, the **daily town tax** (and the tax for conquered towns), **Change Capital** to another member town, **Change Leader** to a resident of the capital, and **Set Spawn Here**.

## Other nations

Click a nation in the [[Directories and leaderboards|nation directory]] for its page: visit its spawn, join it if it's open, or (as a leader) propose an alliance, end one, declare it an enemy or make peace.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Plot menu",
    body: `Every chunk a town claims is a **plot**. Stand in one and open **This Plot** from the [[Main menu]]: the menu is about the chunk under your feet.

${PLOT_MENU}

This is what a mayor sees on a shop plot for sale in a group. Owners see the buttons for their own plots, buyers see **Buy Plot**, and everything else is greyed out. **Refresh** redraws the menu after you walk to another chunk.

## In the wilderness

On unclaimed land the menu offers **Claim for** *your town* (when it touches your land) and **Claim as Outpost**, plus **Many Plots at Once**.

## Buying and selling

- **Buy Plot**: pay the price and own it. Plots for sale also glow on the [[Map]]; right-click one there to buy it from afar.
- **Put up for Sale**: set a price; 0 gives it away.
- **Give Up Plot** returns it to the town.
- Mayors can **Evict Owner**; right-clicking evicts and puts it back on sale.

## Plot types

| Type | What it does |
|:--|:--|
| Default | an ordinary plot |
| Shop | has its own price and tax |
| Embassy | can be bought by players from other towns |
| Arena | PvP is always on |
| Inn | anyone may sleep there |
| Farm | residents may farm |
| Wilds | residents may cut trees and mine |
| Bank | a town bank |
| Jail | holds prisoners; add **Jail Cells** while standing inside |

Mayors pay to change a plot's type; the [[Prices and new day|Prices menu]] lists each type's cost.

## Permissions and trust

Plot **Permissions** work like the town's, but for **friends**, town residents, allies and outsiders. **Player Overrides** give single players their own rights here, edited in Towny's editor. **Trusted Players** may build on the plot without changing its permissions for anyone else.

## Groups and districts

A **plot group** bundles plots so they're sold and managed together, like one big house: while a plot is in a group, its sale, type, settings, permissions, trust and join-day limits change the whole group (the tooltips say so). A **district** names a larger area, such as a market quarter. Add, remove, rename, sell and delete both from **Groups & Districts**.

## Join-day limits

Keep a plot for newcomers or for long-time residents: the fewest days, the most days, or both, that a buyer must have lived in the town.

## Many plots at once

Pick a **square** or **circle** and a **radius** around you, then buy every plot for sale in it, put yours up for sale at one price, take them off sale, or give them up. **Give Up All My Plots** returns every plot you own, anywhere.

## Outposts

On an outpost, a mayor can **Move Outpost Spawn**; on an ordinary claim away from the town, **Make Outpost** turns it into one.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Profile menu",
    body: `Your profile is about you: friends, plots, taxes, your personal settings. Click your head at the top of the [[Main menu]].

${PROFILE_MENU}

## Friends

Friends use the **friend** permissions on your plots, so people you trust can build there without opening your plots to the whole town. Add players online or by name; left-click a friend to view them, right-click to remove them.

## Other players' profiles

Click any resident in a town, nation or friends list. You can add them as a friend; a mayor can also invite, trust, rank or kick them, declare them an outlaw, or hand them the town. A nation leader can give nation ranks or the leadership.

## Your plots and taxes

**My Plots** lists every plot you own, where it is and what it costs daily. **Daily Tax** adds up the town tax and plot taxes due on the next new day, with a countdown.

## Jail

While you're in jail, the profile says so (and for how long), and a **Pay Bail** button lets you leave early.

## Spawning

**Go to Spawn** takes you to your town's spawn, or your bed while **Bed Spawn** is on. It may cost money or have a cooldown, depending on the server.

## Personal settings

PvP, fire, explosions and mobs on your plots, and what you see while exploring: see [[Settings menus#Personal settings]].

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Map",
    body: `The map shows the 9×5 chunks around you, north up, coloured by who owns them. You're the head in the middle.

${mapBlock()}

## Reading it

| Pane | Means |
|:--|:--|
| {{mc §fWhite}} | wilderness |
| {{mc §aGreen}} | your town |
| {{mc §eYellow}} | your own plot |
| {{mc §bLight blue}} | another town in your nation |
| {{mc §9Blue}} | an allied nation |
| {{mc §cRed}} | an enemy nation |
| {{mc §6Orange}} | any other town |

**Glowing tiles are for sale.** Hover a tile for its chunk, town, owner and type.

## Clicking

- Click a claimed tile to open its town.
- **Right-click a glowing tile** to buy that plot without walking there.
- **Claim Your Chunk** / **Unclaim Your Chunk** act on the chunk you stand in.
- **Refresh** redraws the map after you move.
- **Border View** opens [[Border view]].

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Border view",
    body: `Border view draws a short wall of particles along every town and nation border near you, so you always know when you're about to cross into someone else's land. **Only you see the particles.**

${BORDER_VIEW_MENU}

## Turning it on

- From the [[Map]]: the **Border View** button.
- Or with a command: \`/tm borders\` opens this menu; \`/tm borders on\`, \`off\` and \`toggle\` switch it straight away.

Your choices are remembered across restarts.

## Colours

Each side of a border is drawn in the colour of the town it belongs to, the same as the [[Map]]: green for your town, aqua for your nation, blue for allies, red for enemies, gold for other towns. A border between two towns shows both colours side by side.

**Nation borders** are taller and thicker than the borders between towns of one nation. **Your Plot Borders** adds a low yellow line around the plots you own.

## Range

Choose how close a border must be before it appears: from 4 blocks up to the server's limit (\`border-view-max-range\`, 16 by default, at most 64). Left-click for a longer range, right-click for a shorter one.

Server owners can turn border view off for everyone (\`border-view: false\`); the menu then says it's unavailable. See [[Configuration]].

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Invites",
    body: `Every invitation waiting for you, in one place: open it from the [[Main menu]] or with \`/tm invites\`.

${INVITES_MENU}

| Invitation | Who answers |
|:--|:--|
| A town inviting you to join | you |
| A nation inviting your town | your town's mayor |
| An alliance request from another nation | your nation's leader |

Left-click to accept, right-click to decline.

## Chat alerts

When an invitation arrives, TownyMenu says so in chat, with a link that opens this menu. It also warns a mayor when their town goes bankrupt or falls into ruin, linking to the menu that deals with it. Server owners can turn these off (\`towny-alerts\`).

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Directories and leaderboards",
    body: `## Towns and nations

**Towns** and **Nations** in the [[Main menu]] list every town and nation on the server. Click **Sort** to cycle the order (right-click goes back):

| Towns | Nations |
|:--|:--|
| Residents, claims, bank balance, online players, open to join, nearby, name | Residents, towns, claims, bank balance, open to join, name |

*Nearby* shows each town's distance from you. Open towns glow; towns for sale say so, with their price.

## A town's page

Click a town for its page. What's there depends on who you are:

- **Visit**: teleport to its spawn (when Towny lets you).
- **Join Town** when it's open; **Donate** to its bank.
- **Buy Town** when it's for sale.
- **Outposts**: where its outposts are (with the permission for it).
- As a nation leader: **Invite to Nation**.
- As a mayor: **Merge into Your Town**. Their mayor must be online and accept, and then their residents, land and bank join yours.
- Your own town's page links to **Manage Your Town**.

## Leaderboards

The same rankings as Towny's top lists; click an entry to open it.

::: columns 2
- Towns by residents
- Nations by residents
- Towns by land
- Players by plots
- Towns by bank
- Nations by bank
- Richest in your town
- Richest in your nation
:::

The first three places are marked in gold, silver and bronze.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Prices and new day",
    body: `**Prices & New Day** in the [[Main menu]] lists what everything costs *on this server*, and counts down to the next Towny day.

## The Towny day

Once a day Towny collects **taxes** and **upkeep**:

- Residents pay their town's daily tax (a flat amount or a share of their balance); plot owners also pay plot tax.
- Towns pay the nation's tax and the server's upkeep from their bank; nations pay upkeep from theirs.
- A resident who can't pay may lose their plots or be removed; a town that can't pay goes into debt or falls into ruin.

## What's listed

| Group | Prices |
|:--|:--|
| Founding | a new town, a new nation, reclaiming ruins, merging towns |
| Land | per claim, refund per unclaim, per bonus claim, ceding a plot, per outpost, outpost upkeep |
| Daily upkeep | town, nation, overclaim penalty, peaceful town, peaceful nation |
| Your town | default plot, shop and embassy prices; resident, plot, shop and embassy taxes |
| Plot types | what a mayor pays to set a plot to each type |

On a server without an economy, the menu just says nothing costs money.

## Prices on buttons

Every button that spends money shows its own price, taken from the same settings: claims, teleports, plots, founding. So you know what something costs before you click it.

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Tutorial",
    body: `TownyMenu comes with a tutorial: nine chapters on everything worth knowing about Towny. Open it from the [[Main menu]], with \`/tm tutorial\`, or from the **Tutorial** button in any menu's bottom-right corner (which opens that menu's chapter).

${tutorialHub()}

## Chapters

| Chapter | Lessons | About |
|:--|:--|:--|
| {{mc §bGetting Started}} | 7 | Towny, opening and reading the menus, the wilderness, the map, invites, leaderboards |
| {{mc §6Finding a Town}} | 5 | why towns matter, joining, founding, leaving |
| {{mc §6Running a Town}} | 10 | ranks, recruiting, spawn, settings, details, selling, ruins, announcements, merging, levels |
| {{mc §aClaiming Land}} | 8 | chunks, claiming and unclaiming, auto claim, outposts, bonus claims, ceding, taking over |
| {{mc §ePlots}} | 9 | buying, selling, types, settings, trust, groups, join-day limits, many plots at once |
| {{mc §cPermissions & Protection}} | 11 | the four actions, who gets permission, friends, trust, overrides, PvP and switches, outlaws, jail |
| {{mc §bNations}} | 9 | joining and founding, towns and capital, allies and enemies, settings, spawn, sanctions, levels |
| {{mc §6Money & Taxes}} | 8 | the Towny day, banks, resident and plot taxes, upkeep, nation taxes, bankruptcy, prices |
| {{mc §aYour Profile}} | 6 | your profile, other players, display modes, border view, spawning, plots and taxes |

## How lessons work

- **Each lesson can open the menu it explains** (left-click). Right-click marks it read or unread.
- **Lessons use this server's numbers**: what founding costs, how many claims a resident adds, the longest jail sentence, when the new day starts. Lines about settings the server has turned off are left out, and so are lessons about features it doesn't use.
- **Progress is saved per player.** Chapters you've finished glow; **Continue Reading** opens the first one with lessons left. **Reset Progress** starts over.

Players who join without a town get a chat hint pointing here, until they've read everything or joined a town (\`tutorial-join-hint\`).

[[Category:Menus]]

${NAVBOX}
`,
  },
  {
    title: "Commands and permissions",
    body: `TownyMenu has one command, \`/townymenu\` (short: \`/tm\`), with a few sub-commands.

| Command | Does | Permission |
|:--|:--|:--|
| \`/tm\` | opens the [[Main menu]] | everyone |
| \`/tm help\` | lists the commands you can use | everyone |
| \`/tm tutorial\` | opens the [[Tutorial]] | everyone |
| \`/tm invites\` | opens your [[Invites]] | everyone |
| \`/tm borders [on\\|off\\|toggle]\` | opens [[Border view]], or switches it | everyone |
| \`/tm reload\` | reloads the config and translations | \`townymenu.reload\` (ops) |
| \`/tm admin\` | opens the [[Admin menus]] | \`townymenu.admin\` (ops) |

## Towny's permissions decide the rest

Every button runs a Towny command as the player who clicked it, so **Towny's permission nodes apply unchanged**. A button for a command you lack becomes a grey dye ([[Reading the menus]]); TownyMenu checks the same node Towny's command checks. Ranks from \`townyperms.yml\` work as they do with commands: an assistant who can \`/town claim\` can use **Claim This Chunk**.

So there's nothing to set up for players: give them Towny's permissions as usual. The [[Admin menus#Towny permissions|admin menus]] can edit \`townyperms.yml\` in-game.

[[Category:Server owners]]

${NAVBOX}
`,
  },
  {
    title: "Configuration",
    body: `TownyMenu's settings live in \`plugins/TownyMenu/config.yml\`. Edit the file and run \`/tm reload\`, or change them in-game: **Server Admin → TownyMenu Settings** (see [[Admin menus]]) saves and applies them at once.

| Key | Default | What it does |
|:--|:--|:--|
| \`message-prefix\` | \`[TownyMenu]\` in gold | MiniMessage text before TownyMenu's chat messages. Clicking the default opens the menu. |
| \`language\` | \`auto\` | \`auto\` follows each player's Minecraft language; \`en_US\` or \`zh_CN\` forces one for everyone. See [[Translations]]. |
| \`sneak-swap-hand-shortcut\` | \`true\` | opens the [[Main menu]] when a player presses swap-hand ({{kbd F}}) while sneaking. Turn off if it clashes with another plugin. |
| \`tutorial-join-hint\` | \`true\` | suggests the [[Tutorial]] to players without a town when they join, until they've read it all. |
| \`live-menu-refresh\` | \`true\` | redraws an open menu when Towny changes what it shows. |
| \`towny-alerts\` | \`true\` | chat alerts for invitations, bankruptcy and ruin, each linking to its menu. See [[Invites]]. |
| \`border-view\` | \`true\` | lets players turn on [[Border view]]. |
| \`border-view-max-range\` | \`16\` | the farthest (1–64 blocks) a player may set border view to. Larger ranges draw more particles. |
| \`bank-amounts\` | \`10, 100, 1000, 10000\` | the preset amounts in the [[Banks|deposit and withdraw]] menus. Towny takes whole numbers; up to nine fit in the row. |

## The default file

\`\`\`yaml
message-prefix: "<click:run_command:/townymenu><gradient:yellow:gold>[TownyMenu]"
language: auto
sneak-swap-hand-shortcut: true
tutorial-join-hint: true
live-menu-refresh: true
towny-alerts: true
border-view: true
border-view-max-range: 16
bank-amounts:
  - 10
  - 100
  - 1000
  - 10000
\`\`\`

Towny's own settings (prices, limits, world rules) stay in Towny's \`config.yml\`. TownyMenu reads them to show prices and limits, and admins can edit them from the [[Admin menus#Towny config|Towny Config]] menu.

[[Category:Server owners]]

${NAVBOX}
`,
  },
  {
    title: "Translations",
    body: `Every menu, dialog and message follows each player's Minecraft language. TownyMenu ships with:

- **English** (\`en_US\`)
- **Simplified Chinese** (\`zh_CN\`); Traditional Chinese clients get it too.

Clients in other languages see English, unless you add their language.

## Editing the text

On the first start the language files are copied to \`plugins/TownyMenu/lang/\`. Edit any line and run \`/tm reload\`. Values are [MiniMessage](https://docs.advntr.dev/minimessage/format.html); keep every \`{placeholder}\`, which TownyMenu fills in.

\`\`\`yaml
town:
  bank: "<gold>Town Bank"
  bank-description: "Deposit, withdraw, and view <gold>bank</gold> history."
\`\`\`

Keys missing from your file fall back to the bundled copy, then to English, so an update never leaves a blank button.

## Adding a language

Add \`plugins/TownyMenu/lang/<id>.yml\`, named after the Minecraft locale (\`de_DE.yml\`, \`fr_FR.yml\`), starting from a copy of \`en_US.yml\`. Players whose client uses that language see it straight away after \`/tm reload\`. Set \`language\` in [[Configuration]] to force one language for everyone.

## Keeping the colours

The bundled files colour the same kind of text the same way (see [[Reading the menus#Colours]]). Keeping that palette in a new language makes it read like the rest:

\`\`\`text
<gray> labels and descriptions      <white> neutral values, player names
<gold> money, towns, leadership     <aqua> nations
<green> counts, land, plots, allies <yellow> dates and times, menu and button names
<light_purple> spawns and outposts  <red> danger, PvP, enemies, outlaws, jail
\`\`\`

Click hints end with "!": yellow for a click or left-click, aqua for a right-click, red when the click destroys or removes something.

[[Category:Server owners]]

${NAVBOX}
`,
  },
  {
    title: "Admin menus",
    body: `Server admins (\`townymenu.admin\`, ops by default) get **Server Admin** in the [[Main menu]], or \`/tm admin\`.

${ADMIN_MENU}

## Towny config

Every setting in Towny's \`config.yml\`, grouped by its sections, with each one's description, current value and default. Click to change it (a dialog checks the value), right-click to restore the default. Changes are saved and applied at once. **Search Settings** finds settings by name or description; **Reload Config** picks up edits made to the file.

## Worlds

Each world's Towny settings: whether Towny is on, whether towns may claim, PvP, explosions and fire (and forcing them on everywhere), friendly fire, mobs in towns, the world and the wilderness, war, jailing, land repair, plot clearing, the wilderness name and what players may do there, and **Minimum Adjacent Claims** (how many of a town's chunks a new claim must touch). **Reset to Defaults** applies the new-world defaults.

## Server actions

**New Day** and **New Hour** run Towny's daily and hourly tasks now. **Backup** and **Save Database**; **Reload** the config, language, permissions, database, or everything. **Check Outposts** removes outpost spawns no longer on their town's land. Also: town and nation bank withdrawals, wilderness use and land repair in every world, debug and developer mode, **Purge Inactive Residents**, **Check a Permission** on an online player, and **Deposit into Every Bank**.

## Towns, nations, residents and plots

Open any town, nation or resident without being its mayor or leader:

- **Towns**: rename, teleport, settings plus admin-only overrides (force PvP on or off, force mobs, unlimited claims, upkeep, war, top lists), set the mayor, add or kick residents, bonus and bought claims, remove from a nation, restore ruins, delete. **More Town Tools**: fix the level, merge a town in, put it on sale, remove conquered status, check outposts, ranks, outlaws, trusted players and towns.
- **Nations**: settings, leader, add or kick towns, delete; **More Nation Tools**: level, merge, move a town in, recheck distances, sanctions, ranks.
- **Residents**: kick, add to a town, rename their record, mark as NPC, release from jail, delete.
- **Plot You Stand In**: claim it for a player, move it to another town, trust players, or unclaim it (right-click: a square around you).

## Towny permissions

Edit \`townyperms.yml\` in-game, like \`/townyadmin townyperms\`: the **permission groups** (nomads, residents, mayors, nation leaders), and the **town and nation ranks** mayors and leaders hand out. Add or remove nodes, add, rename or delete ranks.

## TownyMenu settings

TownyMenu's own [[Configuration]]: language, message prefix, the sneak shortcut, the join hint, live refresh, chat alerts, bank amounts, and border view.

[[Category:Server owners]]

${NAVBOX}
`,
  },
  {
    title: "FAQ",
    body: `## Does TownyMenu replace Towny's commands?

No. Every button runs the Towny command it stands for, as the player who clicked it. Commands still work, and Towny's permissions, prices, cooldowns and messages apply exactly as they do when typed.

## A button is a grey dye. Why?

You lack Towny's permission for what it does: your rank can't, or the server turned it off. See [[Reading the menus]].

## Pressing F while sneaking does nothing.

The server may have turned the shortcut off (\`sneak-swap-hand-shortcut\`), or another plugin uses the same keys. \`/tm\` always works.

## Can players turn off the menus?

The menus only open when asked. Players who don't want the tutorial hint can read the tutorial or join a town; servers can switch the hint off (\`tutorial-join-hint\`).

## Does it work without an economy plugin?

Yes. Bank buttons and prices disappear, and the [[Prices and new day|Prices]] menu says nothing costs money.

## Which Minecraft versions?

TownyMenu 1.1.2 is for Paper 26.3 with Java 25 and Towny 0.103.2.10 or newer. See [[Installation]].

## My language isn't there.

Add it: copy \`en_US.yml\` to \`lang/<locale>.yml\` and translate. See [[Translations]].

## Do the particles from border view lag the server?

They're sent only to the player who turned border view on, and only near borders within their range. Lower \`border-view-max-range\` if you're worried; see [[Border view]].

## Where do I report a bug?

On [GitHub](${REPO}/issues).

[[Category:Help]]

${NAVBOX}
`,
  },
  {
    title: "Changelog",
    body: `The full change log, version by version, is [CHANGELOG.md](${REPO}/blob/master/CHANGELOG.md) on GitHub; jars are on the [releases page](${REPO}/releases). The highlights:

## 1.1.2

- {{badge accent New}} A town's page lists where its outposts are (for players with Towny's new \`towny.command.town.outpost.list.other\`).
- {{badge accent New}} Each world's settings have **Minimum Adjacent Claims**.
- **Cede This Plot** shows what ceding costs, and so do the Prices menu and the tutorial.
- Tutorial lessons mention outposts limited to worlds without other land, and capitals jailing anyone in their nation, when the server has those settings on.
- Needs Towny 0.103.2.10 or newer.

## 1.1.1

- {{badge accent New}} [[Border view]]: particle walls on nearby town and nation borders, coloured like the map, nation borders taller, your own plots outlined. \`/tm borders\`, and a lesson in the *Your Profile* chapter.
- Server owners can turn border view off and limit its range.

## 1.1.0 and earlier

The [[Tutorial]], the [[Admin menus]], live menus, chat alerts, leaderboards and prices, directories, plot groups and districts, jails, Simplified Chinese, and the rest of what this wiki describes. See the full change log for each release.

[[Category:Project]]

${NAVBOX}
`,
  },
  {
    title: "For developers",
    body: `TownyMenu is open source: [${REPO.replace("https://", "")}](${REPO}). It's written in **Kotlin** against the Paper API, and built with Gradle.

## Building and a test server

\`\`\`bash
./gradlew build        # build/libs/TownyMenu-<version>.jar
./gradlew copyPlugin   # copies it, and the matching Towny jar, into run/plugins/
./gradlew startServer  # copyPlugin, then starts the server in run/
\`\`\`

Download a Paper 26.3 jar into \`run/\` before the first start, then accept the EULA in \`run/eula.txt\`.

## How it's put together

- **Commands and listeners register themselves**: extend \`PluginCommand\` (in \`commands/\`) or implement \`Listener\` (in \`listeners/\`), and the package scanner finds them. Nothing goes in \`plugin.yml\`.
- **Menus** extend \`Menu\` (or \`PagedMenu\` for lists) and build themselves in \`build()\`, which runs on every render; they aren't registered. Open one with \`TownMenu(player, back).open()\`.
- **Actions run Towny's commands** with \`run(command, probe)\`, which reopens the menu if the probe saw a change. Towny's confirmations become dialogs.
- **Buttons are gated by Towny's own nodes** (\`guarded(slot, PermissionNodes.X, …)\`).
- **Text input uses Paper dialogs** (\`prompt(...)\`), never chat.
- **No text in Kotlin**: everything is a key in \`lang/en_US.yml\` and \`zh_CN.yml\`; a test fails the build when they disagree.
- **Every icon's lore has the same shape**: name, description, data, a rule, click hints (see [[Reading the menus]]).

The repository's \`docs/\` folder has the developer guide, the utility guide (the \`itemStack\` DSL, \`TownyUtil\`, \`DialogUtil\`, \`LoreUtil\`), commit conventions, and how releases are made.

## About this wiki

The menus on these pages are drawn with this wiki's \`::: menu\` component: each slot written as \`material | name | lore\`, with pixel icons drawn for the wiki (not the game's textures). The [components page](/townymenu/-/components) shows how to use it on other pages.

[[Category:Project]]

${NAVBOX}
`,
  },
];

export const TOWNYMENU: BuiltInWiki = {
  wiki: {
    slug: "townymenu",
    name: "TownyMenu",
    code: "TMN",
    description:
      "TownyMenu puts Towny into chest menus: towns, nations, plots and every Towny setting, by clicking instead of typing commands.",
    kind: "minecraft",
    visibility: "public",
    homeTitle: "Main Page",
    source: null,
    componentSets: ["core", "minecraft"],
    nav: [
      {
        label: "Start here",
        links: [
          { label: "Main Page", page: "Main Page" },
          { label: "Installation", page: "Installation" },
          { label: "Getting started", page: "Getting started" },
          { label: "Reading the menus", page: "Reading the menus" },
        ],
      },
      {
        label: "Menus",
        links: [
          { label: "Main menu", page: "Main menu" },
          { label: "Finding a town", page: "Finding a town" },
          { label: "Town menu", page: "Town menu" },
          { label: "Claiming land", page: "Claiming land" },
          { label: "Banks", page: "Banks" },
          { label: "Settings menus", page: "Settings menus" },
          { label: "Nation menu", page: "Nation menu" },
          { label: "Plot menu", page: "Plot menu" },
          { label: "Profile menu", page: "Profile menu" },
          { label: "Map", page: "Map" },
          { label: "Border view", page: "Border view" },
          { label: "Invites", page: "Invites" },
          { label: "Directories", page: "Directories and leaderboards" },
          { label: "Prices and new day", page: "Prices and new day" },
          { label: "Tutorial", page: "Tutorial" },
        ],
      },
      {
        label: "Server owners",
        links: [
          {
            label: "Commands and permissions",
            page: "Commands and permissions",
          },
          { label: "Configuration", page: "Configuration" },
          { label: "Translations", page: "Translations" },
          { label: "Admin menus", page: "Admin menus" },
        ],
      },
      {
        label: "Project",
        links: [
          { label: "Changelog", page: "Changelog" },
          { label: "FAQ", page: "FAQ" },
          { label: "For developers", page: "For developers" },
        ],
      },
    ],
  },
  pages: PAGES,
};
