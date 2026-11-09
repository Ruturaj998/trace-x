import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { NavContext } from "./navContext";

export function NavProvider({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  // Close mobile drawer whenever route changes (adjusting state during render)
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setIsMobileNavOpen(false);
  }

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileNavOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileNavOpen]);

  const toggleMobileNav = useCallback(() => {
    setIsMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  const value = {
    isMobileNavOpen,
    setIsMobileNavOpen,
    toggleMobileNav,
    closeMobileNav,
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export default NavProvider;
