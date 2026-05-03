type IconProps = {
  width?: number;
  height?: number;
  className?: string;
};

export function CopyGlyph({ width = 16, height = 16, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
    >
      <rect x="5" y="5" width="8" height="8" />
      <polyline points="3 11 3 3 11 3" />
    </svg>
  );
}
