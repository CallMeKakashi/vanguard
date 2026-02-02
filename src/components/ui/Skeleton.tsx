

interface SkeletonProps {
    className?: string;
}

const Skeleton = ({ className }: SkeletonProps) => {
    return (
        <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
    );
};

export default Skeleton;
