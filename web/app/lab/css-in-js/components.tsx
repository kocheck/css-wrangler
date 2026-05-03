"use client";

import styled, { css } from "styled-components";

export const StyledCard = styled.section`
  background: #fffaf3;
  border: 1px solid #e8dcc6;
  border-radius: 10px;
  padding: 28px 28px 24px 28px;
  max-width: 480px;
  box-shadow: 0 4px 24px rgba(60, 40, 10, 0.08);
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
`;

export const StyledTitle = styled.h2`
  font-family: "Playfair Display", Georgia, serif;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 600;
  color: #2a1f10;
  margin: 0 0 8px 0;
  letter-spacing: -0.005em;
`;

export const StyledBody = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: #6b5d49;
  margin: 0 0 20px 0;
`;

export const StyledPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 20px;
`;

export const StyledPriceAmount = styled.span`
  font-family: "Playfair Display", Georgia, serif;
  font-size: 32px;
  font-weight: 600;
  color: #2a1f10;
  letter-spacing: -0.01em;
`;

export const StyledPriceUnit = styled.span`
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9d8a6e;
`;

export const StyledButtonRow = styled.div`
  display: flex;
  gap: 10px;
`;

type StyledButtonProps = {
  $variant: "primary" | "secondary";
};

export const StyledButton = styled.button<StyledButtonProps>`
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 120ms ease;

  ${(props) =>
    props.$variant === "primary"
      ? css`
          background: #2a1f10;
          color: #fffaf3;
          border: 1px solid #2a1f10;

          &:hover {
            background: #3d2e18;
          }
        `
      : css`
          background: transparent;
          color: #2a1f10;
          border: 1px solid #c8b48a;

          &:hover {
            background: #f3ead6;
          }
        `}
`;
