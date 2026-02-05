import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useState } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
}

interface NotificationContextType {
    addNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((type: NotificationType, message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [...prev, { id, type, message }]);

        // Auto dismiss
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
    }, []);

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {notifications.map((notification) => (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            layout
                            className="pointer-events-auto min-w-[300px] max-w-sm bg-[#0a0a0f] border border-white/10 rounded-lg shadow-2xl overflow-hidden relative group"
                        >
                            <div className={`absolute top-0 bottom-0 left-0 w-1 ${notification.type === 'success' ? 'bg-green-500' :
                                    notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                }`} />

                            <div className="p-4 pl-5 flex items-start gap-3">
                                {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                                {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-200 leading-snug break-words">
                                        {notification.message}
                                    </p>
                                </div>

                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors -mt-1 -mr-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};
