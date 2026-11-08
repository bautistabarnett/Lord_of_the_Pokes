
import { SaveData, SaveSlotMetadata } from '../types';

const STORAGE_KEY_PREFIX = 'loot_game_save_';
const SLOT_COUNT = 3;

export const storageService = {
    getSlots: (): SaveSlotMetadata[] => {
        const slots: SaveSlotMetadata[] = [];
        for (let i = 1; i <= SLOT_COUNT; i++) {
            const key = `${STORAGE_KEY_PREFIX}${i}`;
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    const data = JSON.parse(raw) as SaveData;
                    slots.push({
                        id: i,
                        timestamp: data.timestamp,
                        label: `Level ${data.level} Hero`,
                        isEmpty: false,
                        heroName: "Wanderer" // Could allow custom names later
                    });
                } catch (e) {
                    console.error(`Error reading save slot ${i}`, e);
                    slots.push({ id: i, timestamp: 0, label: 'Corrupted Slot', isEmpty: true });
                }
            } else {
                slots.push({ id: i, timestamp: 0, label: 'Empty Slot', isEmpty: true });
            }
        }
        return slots;
    },

    saveGame: (slotId: number, data: SaveData) => {
        const key = `${STORAGE_KEY_PREFIX}${slotId}`;
        localStorage.setItem(key, JSON.stringify(data));
    },

    loadGame: (slotId: number): SaveData | null => {
        const key = `${STORAGE_KEY_PREFIX}${slotId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as SaveData;
        } catch (e) {
            console.error("Failed to load save", e);
            return null;
        }
    },

    deleteGame: (slotId: number) => {
        const key = `${STORAGE_KEY_PREFIX}${slotId}`;
        localStorage.removeItem(key);
    }
};
