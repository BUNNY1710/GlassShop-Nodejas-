import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useResponsive } from "../hooks/useResponsive";

function Layout() {
  // Responsive padding based on screen size
  const { isMobile } = useResponsive();
  
  return (
    <>
      <Navbar />
      <div style={{ 
        paddingTop: isMobile ? "60px" : "70px", // Match navbar height
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden", // Prevent horizontal overflow
        boxSizing: "border-box",
      }}>
        <Outlet />
      </div>
    </>
  );
}

export default Layout;
