import { useState } from "react";
import { imageUrl } from "../services/api";

export default function FoodImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return <div className={`img-placeholder ${className}`} role="img" aria-label={`${alt || "Food"} — no image`}>🍽️</div>;
  return <img src={imageUrl(src)} alt={alt || "Food"} className={className} onError={() => setFailed(src)} />;
}
