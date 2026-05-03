import StyledComponentsRegistry from "./registry";

export default function CssInJsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StyledComponentsRegistry>{children}</StyledComponentsRegistry>;
}
