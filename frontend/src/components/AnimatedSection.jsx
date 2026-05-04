import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

export default function AnimatedSection({ children, delay = 0, sx = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const revealIfInView = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) setVisible(true);
    };
    const fallbackId = window.setTimeout(() => setVisible(true), 900);
    window.requestAnimationFrame(revealIfInView);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(fallbackId);
      observer.disconnect();
    };
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
