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
        paddingTop: "72px", // Account for fixed navbar
        overflow: "hidden",
      }}
    >
      {/* Animated Gradient Overlay */}
      <div
        className="animate-gradient"
        style={{
          position: "absolute",
          inset: 0,
          background: bg 
            ? "linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.78) 50%, rgba(51, 65, 85, 0.85) 100%)" 
            : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 30%, #e2e8f0 60%, #f1f5f9 100%)",
          backgroundSize: "200% 200%",
          zIndex: 0,
          animation: "gradient-shift 8s ease infinite",
        }}
      />

      {/* Animated Orbs for depth */}
      {!bg && (
        <>
          <div
            style={{
              position: "absolute",
              top: "10%",
              right: "10%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
              filter: "blur(60px)",
              zIndex: 0,
              animation: "float 6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              left: "10%",
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
              filter: "blur(50px)",
              zIndex: 0,
              animation: "float 8s ease-in-out infinite reverse",
            }}
          />
        </>
      )}

      {/* Content Container with fade-in animation */}
      <div
        className="animate-fadeIn"
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "calc(100vh - 72px)",
          padding: "clamp(20px, 4vw, 48px)",
          color: bg ? "white" : "#0f172a",
          maxWidth: "1600px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PageWrapper;
