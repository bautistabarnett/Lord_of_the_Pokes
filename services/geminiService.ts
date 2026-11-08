
import { GoogleGenAI, Type } from "@google/genai";
import { Item, Monster, PassiveSkill } from "../types";

// Initialize Gemini
// Note: process.env.API_KEY is handled by the build/runtime environment
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

/**
 * Uses Gemini 3.0 Pro with Thinking Mode to generate deep, consistent lore 
 * based on item statistics.
 */
export const identifyItemWithGemini = async (item: Item): Promise<{ name: string; flavorText: string }> => {
  if (!ai) {
    console.warn("Gemini API Key not found. Returning generic fallback.");
    return {
      name: `Ancient ${item.name.replace('Unidentified ', '')}`,
      flavorText: "The markings are indecipherable, but the power is undeniable."
    };
  }

  const prompt = `
    You are the Keeper of Forbidden Archives in a dark fantasy world consumed by the Void.
    
    TASK:
    Identify a legendary item found by an adventurer. 
    You must analyze the specific stats provided and generate a Name and Flavor Text that thematically matches those exact stats.
    
    ANALYSIS REQUIRED (Thinking Process):
    1. Look at the 'type' (e.g., Sword vs Helm).
    2. Look at the 'rarity'.
    3. Analyze the 'stats':
       - If high Strength/Fire damage -> Theme is aggressive, volcanic, or brutal.
       - If high Intelligence/Ice -> Theme is cold, calculated, or arcane.
       - If Life Steal/Shadow -> Theme is vampiric, cursed, or parasitic.
    4. Construct a name that reflects this analysis.
    5. Write flavor text that explains *why* the item gives these specific stats using lore.
    
    ITEM CONTEXT:
    - Slot: ${item.type}
    - Rarity: ${item.rarity}
    - Item Level: ${item.level}
    - Stats: ${JSON.stringify(item.stats)}
    
    OUTPUT REQUIREMENTS:
    - Name: Archaic, grim, unique. No generic names.
    - Flavor Text: Max 30 words. Lovecraftian or Gothic tone.
    
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Updated to Thinking Model
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for deep analysis
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "The legendary name of the item" },
                flavorText: { type: Type.STRING, description: "Atmospheric lore text explaining the item's history" }
            },
            required: ["name", "flavorText"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned");

    const json = JSON.parse(text);
    return {
      name: json.name,
      flavorText: json.flavorText
    };

  } catch (error) {
    console.error("Gemini identification failed:", error);
    return {
      name: `Lost Artifact of the Void`,
      flavorText: "Whispers of the old world cling to this object, defying comprehension."
    };
  }
};

/**
 * Uses Gemini 3.0 Pro to generate visceral combat narration based on battle events.
 */
export const generateCombatNarrative = async (
  monsterName: string, 
  weaponType: string, 
  actionType: 'crit' | 'dodge' | 'kill' | 'heavy_hit'
): Promise<string> => {
  if (!ai) return "A brutal clash echoes in the darkness.";

  const prompt = `
    You are a grim fantasy battle narrator.
    
    CONTEXT:
    Hero Weapon: ${weaponType}
    Monster: ${monsterName}
    Event: ${actionType}
    
    TASK:
    Write a SINGLE, visceral sentence describing this specific moment.
    
    THINKING PROCESS:
    1. Consider the physics of the weapon (e.g., Mace crushes bone, Sword severs limb, Dagger pierces organ).
    2. Consider the monster's anatomy (e.g., Skeleton = bone dust, Demon = ichor).
    3. Match intensity to the action:
       - 'crit': Devastating, messy, loud.
       - 'dodge': Fluid, barely missed, wind rushing.
       - 'kill': Finality, collapsing, dissolving.
    
    OUTPUT:
    - Present tense.
    - Max 15 words.
    - Intense, dark fantasy style.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Thinking mode enabled for high quality creative writing
      }
    });
    return response.text?.trim() || "The blow lands with crushing force.";
  } catch (e) {
    return "The blow lands with crushing force.";
  }
};

/**
 * Uses Gemini 3.0 Pro with Thinking Mode to act as a Dungeon Master.
 * It analyzes the specific monster matchup to create an immersive, one-sentence intro.
 */
export const generateEncounterDescription = async (monster: Monster, playerLevel: number): Promise<string> => {
  const isBoss = monster.rarity === 'Unique' || monster.rarity === 'Mythic';
  if (!ai) return `A ${isBoss ? "Boss" : "Level " + monster.level} ${monster.name} emerges from the shadows.`;

  const prompt = `
    You are the Dungeon Master for a dark fantasy RPG.
    
    SCENARIO:
    A level ${playerLevel} hero has encountered a level ${monster.level} ${monster.name}.
    Monster Rarity: ${monster.rarity} (Common, Uncommon, Rare, Epic, Mythic, Unique).
    
    TASK:
    Write a *single*, visceral sentence describing the monster's entrance.
    
    THINKING PROCESS:
    1. Analyze the threat level. Is the player outmatched? Is the monster weak?
    2. specific visual details based on the monster name (e.g., if "Skeleton", mention bones/dust; if "Demon", mention heat/sulfur).
    3. Determine the monster's intent (ambush, roaring charge, silent stalking).
    
    OUTPUT:
    - Present tense.
    - Focus on sensory details (smell, sound, lighting).
    - Do not use game mechanics numbers in the text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Thinking mode for creative writing consistency
      }
    });
    return response.text?.trim() || `A ${monster.name} attacks from the darkness!`;
  } catch (e) {
    return `A ${monster.name} attacks!`;
  }
};

export const generatePassiveLore = async (skill: PassiveSkill): Promise<string> => {
  if (!ai) return "Knowledge is power, guard it well.";

  const prompt = `
    You are a Whispering Tome of Dark Arts.
    The player has learned: "${skill.name}" (${skill.theme} school).
    Effect: ${skill.description}
    
    Write a cryptic, 10-word aphorism about this specific power.
    Tone: Sinister.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
    });
    return response.text || "The void gazes back.";
  } catch (e) {
    return "The void gazes back.";
  }
};

/**
 * Generates a new image based on a text prompt using gemini-2.5-flash-image.
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed:", e);
    return null;
  }
};

/**
 * Edits an existing image based on a text prompt using gemini-2.5-flash-image.
 * This allows users to say "Add a retro filter" or "Make it look like a sketch".
 */
export const editImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  if (!ai) return null;

  try {
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;
    
    const mimeType = matches[1];
    const data = matches[2];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          },
          {
            text: prompt // User instruction: "Add a retro filter", "Remove the background", etc.
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image editing failed:", e);
    return null;
  }
};
