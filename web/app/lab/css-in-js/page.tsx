import { StationFrame } from "@/app/components/StationFrame";
import {
  StyledBody,
  StyledButton,
  StyledButtonRow,
  StyledCard,
  StyledPrice,
  StyledPriceAmount,
  StyledPriceUnit,
  StyledTitle,
} from "./components";

export default function CssInJsStationPage() {
  return (
    <StationFrame
      stationNumber="04"
      stationName="CSS-IN-JS"
      testsBox="styled-components. Auto-generated `sc-*` classes are unreliable; the picker should not select on them."
    >
      <StyledCard>
        <StyledTitle>House blend, single origin</StyledTitle>
        <StyledBody>
          A small-batch espresso roast from the Sidamo region. Notes of dark cocoa, dried fig, and
          something the importer described as &ldquo;quiet warmth.&rdquo;
        </StyledBody>

        <StyledPrice>
          <StyledPriceAmount>$24</StyledPriceAmount>
          <StyledPriceUnit>per 12oz bag</StyledPriceUnit>
        </StyledPrice>

        <StyledButtonRow>
          <StyledButton $variant="primary" type="button">
            Add to cart
          </StyledButton>
          <StyledButton $variant="secondary" type="button">
            Save for later
          </StyledButton>
        </StyledButtonRow>
      </StyledCard>
    </StationFrame>
  );
}
