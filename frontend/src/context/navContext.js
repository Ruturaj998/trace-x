import { createContext } from "react";

export const NavContext = createContext({
  isMobileNavOpen: false,
  setIsMobileNavOpen: () => {},
  toggleMobileNav: () => {},
  closeMobileNav: () => {},
});

export default NavContext;
