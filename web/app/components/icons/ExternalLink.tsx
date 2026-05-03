type IconProps = {
  width?: number;
  height?: number;
  className?: string;
};

export function ExternalLink({ width = 16, height = 16, className }: IconProps) {
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
      aria-hidden="true"
      className={className}
    >
      <polyline points="6 3 13 3 13 10" />
      <line x1="13" y1="3" x2="6" y2="10" />
      <polyline points="11 13 3 13 3 5" />
    </svg>
  );
}
