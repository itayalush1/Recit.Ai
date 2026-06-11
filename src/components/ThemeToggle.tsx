import React from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function ThemeToggle({ darkMode, setDarkMode }: ThemeToggleProps) {
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <button
      id="theme-toggle-btn"
      onClick={() => setDarkMode(!darkMode)}
      className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle nighttime study theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={darkMode ? "dark" : "light"}
          initial={{ y: -10, opacity: 0, rotate: -20 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 10, opacity: 0, rotate: 20 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          {darkMode ? (
            <Moon className="w-5 h-5 text-indigo-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
