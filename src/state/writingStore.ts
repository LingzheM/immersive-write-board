import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface WritingState {
    writingIntensity: number;
    isInFlow: boolean;
    lastKeyStrokeAt: number;
    setWritingState: (patch: Partial<Omit<WritingState, 'setWritingState'>>) => void;
}

export const useWritingStore = create<WritingState>()(
    subscribeWithSelector((set) => ({
        writingIntensity: 0,
        isInFlow: false,
        lastKeyStrokeAt: 0,
        setWritingState: (patch) => set((state) => ({ ...state, ...patch })),
    }))
)