import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'steam-king-notes-';

export const useMissionLog = (appId: number | null) => {
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Load notes when appId changes
    useEffect(() => {
        if (!appId) {
            setNotes('');
            setLastSaved(null);
            return;
        }

        const savedNotes = localStorage.getItem(`${STORAGE_PREFIX}${appId}`);
        if (savedNotes) {
            setNotes(savedNotes);
            // In a real app we might store the timestamp too, 
            // but for now we'll just indicate loaded state implicitly
        } else {
            setNotes('');
        }
    }, [appId]);

    // Save notes with debounce
    useEffect(() => {
        if (!appId) return;

        const timer = setTimeout(() => {
            if (notes) {
                localStorage.setItem(`${STORAGE_PREFIX}${appId}`, notes);
            } else {
                localStorage.removeItem(`${STORAGE_PREFIX}${appId}`);
            }
            setIsSaving(false);
            setLastSaved(new Date());
        }, 1000); // 1 second auto-save debounce

        return () => clearTimeout(timer);
    }, [notes, appId]);

    const updateNotes = (newNotes: string) => {
        setNotes(newNotes);
        setIsSaving(true);
    };

    return {
        notes,
        updateNotes,
        isSaving,
        lastSaved
    };
};
