import { Eye, EyeOff } from "lucide-react";

type Props = {
    isPassword: boolean;
    showPassword: boolean;
    ShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
}

export function EyeButton({isPassword, showPassword, ShowPassword}: Props) {
    if (!isPassword) return null;

    return (
        <button
            type="button"
            onMouseDown={() => ShowPassword(true)}
            onMouseUp={() => ShowPassword(false)}
            onMouseLeave={() => ShowPassword(false)}
            onTouchStart={() => ShowPassword(true)}
            onTouchEnd={() => ShowPassword(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer bg-transparent border-none"
        >
            {showPassword ? (
                <Eye className="w-5 h-5" />
            ) : (
                <EyeOff className="w-5 h-5" />
            )}
        </button>
    );
}