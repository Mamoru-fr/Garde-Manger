import { cn } from "@/utils/cn";

type Props = {
    content: string;
    className?: string;
    variant?: 'primary' | 'secondary';
    onClick?: () => void;
}

export function Button({ content, className, variant = 'primary', onClick }: Props) {
    return (
        <button 
            className={cn(
                // Base styles
                "flex-1 px-4 py-3 md:px-6 md:py-3.5 lg:px-7 lg:py-4",
                "text-sm md:text-base lg:text-lg font-semibold",
                "border-none rounded-lg md:rounded-xl",
                "cursor-pointer transition-all duration-300",
                "uppercase tracking-wide",
                "whitespace-nowrap overflow-hidden text-ellipsis min-w-0",
                // Variant styles
                variant === 'primary' && [
                    "bg-linear-to-br from-[#FFC837] to-[#FF8008]",
                    "text-gray-900",
                    "shadow-[0_6px_20px_rgba(255,200,55,0.4)]",
                    "hover:shadow-[0_8px_24px_rgba(255,200,55,0.5)]",
                    "active:scale-[0.98]"
                ],
                variant === 'secondary' && [
                    "bg-linear-to-br from-gray-100 to-gray-200",
                    "text-gray-500",
                    "shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                    "hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]",
                    "active:scale-[0.98]"
                ],
                className
            )}
            onClick={onClick}
        >
            {content}
        </button>
    );
}