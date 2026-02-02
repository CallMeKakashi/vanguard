export const formatTime = (minutes: number) => {
    if (minutes <= 0) return '0M';
    if (minutes < 60) return `${minutes.toFixed(1)} MIN`;
    return `${(minutes / 60).toFixed(1)}H`;
};
