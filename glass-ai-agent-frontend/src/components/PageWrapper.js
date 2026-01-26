// function PageWrapper({ background, children }) {
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         backgroundImage: `url(${background})`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         position: "relative",
//       }}
//     >
//       {/* Overlay */}
//       <div
//         style={{
//           position: "absolute",
//           inset: 0,
//           background: "rgba(0,0,0,0.6)",
//           zIndex: 0,
//         }}
//       />

//       {/* Content */}
//       <div
//         style={{
//           position: "relative",
//           zIndex: 1,
//           minHeight: "calc(100vh - 64px)",
//           padding:  "clamp(12px, 4vw, 40px)",
//           color: "white",
//         }}
//       >
//         {children}
//       </div>
//     </div>
//   );
// }

// export default PageWrapper;

function PageWrapper({ background, children, backgroundImage }) {
  const bg = background || backgroundImage;
  
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: bg ? `url(${bg})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        position: "relative",
        paddingTop: "70px", // Account for fixed navbar
      }}
    >
      {/* Modern Gradient Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: bg 
            ? "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)" 
            : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)",
          zIndex: 0,
        }}
      />

      {/* Content Container - Mobile-first responsive */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "calc(100vh - 70px)",
          padding: "clamp(12px, 4vw, 40px)", // Responsive padding: 12px mobile, scales up
          color: bg ? "white" : "#0f172a",
          maxWidth: "1600px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box", // Prevent overflow
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PageWrapper;
