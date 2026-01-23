import { useMemo } from "react";

/**
 * Premium PageHeader Component
 * Provides consistent, attractive headers across all pages
 */
function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  actions, 
  breadcrumbs,
  gradient = true,
  isMobile = false 
}) {
  const headerStyle = useMemo(() => ({
    marginBottom: isMobile ? "24px" : "32px",
    padding: isMobile ? "20px" : "28px 32px",
    borderRadius: "20px",
    background: gradient
      ? "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(236, 72, 153, 0.04) 100%)"
      : "rgba(255, 255, 255, 0.95)",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    boxShadow: "0 8px 16px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(99, 102, 241, 0.05)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "fadeInUp 0.6s ease-out",
  }), [gradient, isMobile]);

  const iconStyle = useMemo(() => ({
    fontSize: isMobile ? "32px" : "40px",
    marginRight: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isMobile ? "48px" : "56px",
    height: isMobile ? "48px" : "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.15) 100%)",
    border: "1px solid rgba(99, 102, 241, 0.25)",
    boxShadow: "0 4px 12px -2px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "scaleInBounce 0.6s ease-out",
  }), [isMobile]);

  const titleStyle = useMemo(() => ({
    fontSize: isMobile ? "24px" : "32px",
    fontWeight: "800",
    color: "#1e293b",
    margin: 0,
    marginBottom: subtitle ? "8px" : "0",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: "1.2",
  }), [subtitle, isMobile]);

  const subtitleStyle = useMemo(() => ({
    fontSize: isMobile ? "14px" : "16px",
    color: "#64748b",
    margin: 0,
    fontWeight: "500",
    lineHeight: "1.5",
  }), [isMobile]);

  return (
    <div style={headerStyle}>
      {/* Animated Decorative background elements */}
      <div
        className="animate-float"
        style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 40%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(40px)",
          animation: "float 6s ease-in-out infinite",
        }}
      />
      <div
        className="animate-float"
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-5%",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 40%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(30px)",
          animation: "float 8s ease-in-out infinite reverse",
        }}
      />
      
      {/* Shine effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "100%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
          animation: "shimmer 3s infinite",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isMobile ? "16px" : "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Left Section: Icon + Title + Subtitle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            width: "100%",
          }}
        >
          {icon && <div style={iconStyle}>{icon}</div>}
          <div style={{ flex: 1 }}>
            {breadcrumbs && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {breadcrumbs.map((crumb, index) => (
                  <span key={index}>
                    {index > 0 && <span style={{ margin: "0 6px" }}>›</span>}
                    <span
                      style={{
                        color: index === breadcrumbs.length - 1 ? "#4f46e5" : "#94a3b8",
                        fontWeight: index === breadcrumbs.length - 1 ? "600" : "400",
                      }}
                    >
                      {crumb}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <h1 style={titleStyle}>{title}</h1>
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          </div>
        </div>

        {/* Right Section: Actions */}
        {actions && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;

