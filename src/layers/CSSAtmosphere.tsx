import React, { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { SCENE_TOKENS, WEATHER_MODIFIERS } from '../tokens/sceneTokens';

export const CSSAtmosphere: React.FC = () => {
    const scene = useSceneStore();

    const style = useMemo(() => {
        const base = SCENE_TOKENS[scene.season][scene.timeOfDay];
        const mod =  WEATHER_MODIFIERS[scene.weather];

        return {
            '--bg-color-a': base.colorA,
            '--bg-color-b': base.colorB,
            '--overlay-op': base.overlay + (mod.overlay || 0),
            '--breath-dur': scene.writingPhase === 'flow' ? '8s': '15s',
        } as React.CSSProperties;
    }, [scene.weather, scene.season, scene.timeOfDay, scene.writingPhase]);

    return (
        <div className="atmosphere-root" style={style}>
            <div className="gradient-layer" />
            <div className="overlay-layer" />
        </div>
    );
};