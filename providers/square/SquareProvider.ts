import { SalonProvider } from "../SalonProvider";
import * as squareApi from "../../services/squareIntegration"; // use existing Square logic

export const SquareProvider: SalonProvider = {
  provider: "square",

  fetchClients: async () => {
    // @ts-ignore - This is a placeholder implementation.
    return squareApi.fetchClients();
  },

  fetchServices: async () => {
    // @ts-ignore - This is a placeholder implementation.
    return squareApi.fetchServices();
  },

  createBooking: async (input) => {
    // @ts-ignore - This is a placeholder implementation.
    return squareApi.createBooking(input);
  },
};
