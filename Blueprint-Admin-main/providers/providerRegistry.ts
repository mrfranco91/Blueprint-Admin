import { SquareProvider } from "./square/SquareProvider";

export function getSalonProvider(provider: string) {
  switch (provider) {
    case "square":
    default:
      return SquareProvider;
  }
}
