import { useCallback, useEffect, useRef, useState } from 'react';

// Frequencies for our sci-fi palette
const FREQ = {
    HOVER: 800,
    CLICK_LOW: 150,
    CLICK_HIGH: 2200,
    SUCCESS_BASE: 440,
};

export const useSound = () => {
    const audioContext = useRef<AudioContext | null>(null);
    const [isMuted, setIsMuted] = useState(() => {
        return localStorage.getItem('vanguard-muted') === 'true';
    });

    useEffect(() => {
        // Initialize AudioContext on user interaction if needed, 
        // but for now we basically just create it lazily
        return () => {
            if (audioContext.current?.state !== 'closed') {
                audioContext.current?.close();
            }
        };
    }, []);

    const initAudio = () => {
        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContext.current.state === 'suspended') {
            audioContext.current.resume();
        }
        return audioContext.current;
    };

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('vanguard-muted', String(next));
            return next;
        });
    }, []);

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if (isMuted) return;
        const ctx = initAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    const playHover = useCallback(() => {
        // High-pitch, very short, sine wave - "Blip"
        playTone(FREQ.HOVER, 'sine', 0.05, 0.02);
    }, [isMuted]);

    const playClick = useCallback(() => {
        // Mechanical shutter sound - multiple conflicting tones
        if (isMuted) return;
        const ctx = initAudio();

        // Low thud
        playTone(FREQ.CLICK_LOW, 'square', 0.1, 0.05);
        // High click
        setTimeout(() => playTone(FREQ.CLICK_HIGH, 'sawtooth', 0.05, 0.02), 20);
    }, [isMuted]);

    const playSuccess = useCallback(() => {
        if (isMuted) return;
        // Ascending chime
        playTone(FREQ.SUCCESS_BASE, 'sine', 0.2, 0.05);
        setTimeout(() => playTone(FREQ.SUCCESS_BASE * 1.5, 'sine', 0.3, 0.05), 100);
    }, [isMuted]);

    return {
        playHover,
        playClick,
        playSuccess,
        isMuted,
        toggleMute
    };
};
