import { memo } from "react";
import afiaLogoUrl from "../../logo/afia-logo.png";
import "./AfiaLogo.css";

interface AfiaLogoProps {
  className?: string;
  height?: number;
}

export const AfiaLogo = memo(({ className, height = 40 }: AfiaLogoProps) => (
  <img
    src={afiaLogoUrl}
    alt="Afia"
    height={height}
    className={`afia-logo-img${className ? ` ${className}` : ""}`}
    style={{ display: "block", objectFit: "contain" }}
  />
));
