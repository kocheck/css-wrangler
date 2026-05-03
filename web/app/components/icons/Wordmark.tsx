// Reserved for future use; the TopBar wordmark is currently text-only per the brief.
type IconProps = {
  width?: number;
  height?: number;
  className?: string;
};

export function Wordmark({ width = 16, height = 16, className }: IconProps) {
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
      <line x1="3" y1="13" x2="7" y2="3" />
      <line x1="9" y1="13" x2="13" y2="3" />
    </svg>
  );
}
