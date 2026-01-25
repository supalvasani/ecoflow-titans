import { Check, Circle, Clock } from 'lucide-react';

export function LifecycleStepper({ currentStage, stages }: { currentStage: string, stages: string[] }) {
    const currentIndex = stages.indexOf(currentStage);

    return (
        <div className="w-full py-4">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />

                {stages.map((stage, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isPending = index > currentIndex;

                    return (
                        <div key={stage} className="flex flex-col items-center bg-background px-2">
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                                isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "",
                                isCurrent ? "bg-blue-600 border-blue-600 text-white" : "",
                                isPending ? "bg-white border-gray-300 text-gray-400" : ""
                            )}>
                                {isCompleted && <Check className="w-5 h-5" />}
                                {isCurrent && <Clock className="w-5 h-5" />}
                                {isPending && <Circle className="w-5 h-5" />}
                            </div>
                            <span className={cn(
                                "mt-2 text-xs font-medium",
                                isCompleted ? "text-emerald-600" : "",
                                isCurrent ? "text-blue-600" : "",
                                isPending ? "text-gray-400" : ""
                            )}>
                                {stage}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Inline utility if cn doesn't exist
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
